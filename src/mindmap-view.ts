import { ItemView, MarkdownView, Menu, Vault, ViewStateResult, Workspace, WorkspaceLeaf } from 'obsidian';
import { transformWithParagraphs, toggleParagraphContent, applyParagraphAppearance } from './markdown-transform';
import { Markmap } from 'markmap-view';
import { MindNode as INode } from './node-types';
import { FRONT_MATTER_REGEX, MD_VIEW_TYPE, MM_VIEW_TYPE } from './constants';
import ObsidianMarkmap from './obsidian-markmap-plugin';
import { createSVG, getComputedCss, removeExistingSVG } from './markmap-svg';
import { copyImageToClipboard } from './copy-image';
import { MindMapSettings, LayoutDirection } from './settings';
import { VerticalMarkmap } from './vertical-markmap';
import { useEndpointControls, translateHorizontal } from './horizontal-endpoints';
import { centerOf, keepScreenPoint } from './viewport-anchor';
import { bindNodeDragging, identifyNodes, Positions } from './manual-layout';
import { createZoomControls } from './zoom-controls';

export default class MindmapView extends ItemView {
    filePath: string;
    fileName: string;
    linkedLeaf: WorkspaceLeaf;
    displayText: string;
    currentMd = '';
    vault: Vault;
    workspace: Workspace;
    emptyDiv: HTMLDivElement;
    svg: SVGElement;
    obsMarkmap: ObsidianMarkmap;
    isLeafPinned = false;
    pinAction: HTMLElement;
    private directionAction: HTMLElement;
    private root: INode;
    private renderedPath: string;
    private renderer: Markmap | VerticalMarkmap;
    private revision = 0;
    private closed = false;
    private needsRender = true;
    inline = false;
    getState() { return { file: this.filePath, inline: this.inline }; }
    async setState(state: { file?: string; inline?: boolean }, result: ViewStateResult) {
        this.inline = !!state.inline;
        if (state.file) {
            this.filePath = state.file;
            this.fileName = state.file.split('/').pop().replace(/\.md$/, '');
        }
        if (this.inline) { this.isLeafPinned = true; this.linkedLeaf = undefined; }
        await super.setState(state, result);
        await this.update();
    }
    private manual: Positions = new Map();
    private redrawManual: () => void;
    private removeDragging: () => void;
    private removeZoomControls: () => void;

    constructor(public settings: MindMapSettings, leaf: WorkspaceLeaf,
        initialFileInfo: { path: string; basename: string },
        private changeDirection: (direction: LayoutDirection) => Promise<void>,
        sourceLeaf?: WorkspaceLeaf) {
        super(leaf);
        this.filePath = initialFileInfo.path;
        this.fileName = initialFileInfo.basename;
        this.vault = this.app.vault;
        this.workspace = this.app.workspace;
        this.linkedLeaf = sourceLeaf;
    }

    getViewType() { return MM_VIEW_TYPE; }
    getDisplayText() { return this.inline ? this.fileName || 'FlyMind' : this.displayText || 'FlyMind'; }
    getIcon() { return 'dot-network'; }

    async onOpen() {
        this.closed = false;
        this.obsMarkmap = new ObsidianMarkmap(this.vault);
        this.directionAction = this.addAction('git-branch', 'Switch mind map direction', () => {
            const next = this.settings.layoutDirection === 'vertical' ? 'horizontal' : 'vertical';
            void this.changeDirection(next);
        });
        this.addAction('maximize', 'Fit mind map to pane', () => this.fit());
        this.addAction('layout-grid', '自动', () => {
            this.manual.clear();
            this.redrawManual?.();
        });
        this.registerEvent(this.workspace.on('active-leaf-change', () => { void this.checkAndUpdate(); }));
        this.registerEvent(this.workspace.on('resize', () => this.fit()));
        this.registerEvent(this.workspace.on('css-change', () => { void this.update(); }));
        this.registerEvent(this.leaf.on('group-change', (group: string) => this.updateLinkedLeaf(group)));
        this.registerInterval(window.setInterval(() => { void this.checkAndUpdate(); }, 1000));
        // Render the initial source even when opening the preview makes it the active leaf.
        await this.update();
    }

    async onClose() {
        this.closed = true;
        this.revision++;
        this.disposeRenderer();
        removeExistingSVG(this.containerEl);
    }

    onMoreOptionsMenu(menu: Menu) {
        menu.addItem(item => item.setTitle('Horizontal (left to right)')
            .setChecked(this.settings.layoutDirection === 'horizontal')
            .onClick(() => this.changeDirection('horizontal')))
            .addItem(item => item.setTitle('Vertical (top to bottom)')
                .setChecked(this.settings.layoutDirection === 'vertical')
                .onClick(() => this.changeDirection('vertical')))
            .addSeparator()
            .addItem(item => item.setIcon('pin').setTitle(this.isLeafPinned ? 'Unpin' : 'Pin')
                .onClick(() => this.isLeafPinned ? this.unPin() : this.pinCurrentLeaf()))
            .addItem(item => item.setIcon('image-file').setTitle('Copy screenshot')
                .onClick(() => { if (this.svg) void copyImageToClipboard(this.svg); }));
    }

    updateLinkedLeaf(group: string) {
        if (group) {
            const leaf = this.workspace.getGroupLeaves(group).find(l => l.view.getViewType() === MD_VIEW_TYPE);
            if (leaf) this.linkedLeaf = leaf;
        }
        void this.checkAndUpdate();
    }

    pinCurrentLeaf() {
        if (this.isLeafPinned) return;
        this.isLeafPinned = true;
        this.pinAction = this.addAction('pin', 'Unpin mind map', () => this.unPin());
        this.pinAction.classList.add('is-active');
    }

    unPin() {
        this.isLeafPinned = false;
        this.pinAction?.remove();
        this.pinAction = undefined;
        void this.checkAndUpdate();
    }

    getLeafTarget() {
        if (this.inline) return undefined;
        const active = this.workspace.getActiveViewOfType(MarkdownView)?.leaf;
        if (!this.isLeafPinned && active) this.linkedLeaf = active;
        return this.linkedLeaf;
    }

    async checkAndUpdate() {
        if (this.closed) return;
        const target = this.getLeafTarget();
        const file = (target?.view as MarkdownView | undefined)?.file;
        if (file) { this.filePath = file.path; this.fileName = file.basename; }
        try { await this.update(false); } catch (error) { console.error(error); }
    }

    /** A forced refresh changes orientation but reuses the parsed tree and its fold flags. */
    async update(force = true) {
        if (this.closed) return;
        if (force) this.needsRender = true;
        const request = ++this.revision;
        const path = this.filePath;
        if (!path) { this.showEmpty(); return; }
        let md: string;
        try { md = await this.vault.adapter.read(path); }
        catch (error) {
            if (request === this.revision && !this.closed) { this.showEmpty(); console.error(error); }
            return;
        }
        if (this.closed || request !== this.revision || path !== this.filePath) return;
        if (md.startsWith('---')) md = md.replace(FRONT_MATTER_REGEX, '');
        const changed = md !== this.currentMd || path !== this.renderedPath;
        if (!this.needsRender && !changed && this.renderer) return;
        this.currentMd = md;
        this.renderedPath = path;
        if (!md.trim()) { this.root = undefined; this.showEmpty(); return; }
        if (changed || !this.root) {
            this.root = transformWithParagraphs(md).root;
            this.manual.clear();
            identifyNodes(this.root);
            this.obsMarkmap.updateInternalLinks(this.root);
        }
        applyParagraphAppearance(this.root, this.settings.layoutDirection === 'vertical');
        this.displayText = this.fileName ? `FlyMind · ${this.fileName}` : 'FlyMind';
        const title = this.containerEl.querySelector('.view-header-title');
        if (title) title.textContent = this.displayText;
        this.disposeRenderer();
        this.displayEmpty(false);
        this.svg = createSVG(this.containerEl, this.settings.lineHeight);
        this.bindParagraphToggles(this.svg);
        const { font } = getComputedCss(this.containerEl);
        if (this.settings.layoutDirection === 'vertical') {
            this.renderer = new VerticalMarkmap(this.svg, this.root, {
                font, nodeMinHeight: this.settings.nodeMinHeight ?? 16,
                gapX: Math.max(16, this.settings.spacingHorizontal ?? 80),
                gapY: Math.max(40, this.settings.spacingVertical ?? 5),
                padding: Math.max(0, this.settings.paddingX ?? 0)
            }, this.manual);
            const verticalRenderer = this.renderer;
            this.redrawManual = () => verticalRenderer.redrawManual();
        } else {
            this.renderer = Markmap.create(this.svg, {
                autoFit: false, duration: 0, nodeFont: font,
                nodeMinHeight: this.settings.nodeMinHeight ?? 16,
                spacingVertical: this.settings.spacingVertical ?? 5,
                spacingHorizontal: this.settings.spacingHorizontal ?? 80,
                paddingX: this.settings.paddingX ?? 0
            }, this.root);
            this.redrawManual = useEndpointControls(this.renderer, this.manual);
            void this.renderer.fit();
        }
        const renderer = this.renderer;
        const scale = () => renderer instanceof VerticalMarkmap ? renderer.getScale() : (renderer.svg.property('__zoom') as { k: number }).k;
        this.removeZoomControls = createZoomControls(this.svg, scale,
            factor => { void renderer.rescale(Math.max(.02, Math.min(8, scale() * factor)) / scale()); },
            () => { void renderer.fit(); });
        this.removeDragging = bindNodeDragging(this.svg, this.manual,
            scale,
            () => this.redrawManual());
        this.needsRender = false;
        const vertical = this.settings.layoutDirection === 'vertical';
        this.directionAction?.setAttribute('aria-label', vertical
            ? 'Vertical layout — switch to horizontal' : 'Horizontal layout — switch to vertical');
    }

    private bindParagraphToggles(svg: SVGElement) {
        const buttonFor = (event: Event) => (event.target as Element).closest<HTMLButtonElement>('.mm-node-body-toggle');
        // Capture before either renderer treats the same gesture as a branch toggle or pan.
        ['keydown', 'mousedown', 'pointerdown'].forEach(type => {
            svg.addEventListener(type, event => { if (buttonFor(event)) event.stopPropagation(); }, true);
        });
        svg.addEventListener('click', event => {
            const button = buttonFor(event);
            if (!button) return;
            event.preventDefault();
            event.stopPropagation();
            const id = Number(button.dataset.bodyId);
            const anchor = centerOf(button);
            if (!toggleParagraphContent(this.root, id, this.settings.layoutDirection === 'vertical')) return;
            // Fold in place: do not reread Markdown, recreate the SVG, or invoke fit().
            const renderer = this.renderer;
            if (renderer instanceof VerticalMarkmap) renderer.refresh();
            else renderer.setData(this.root);
            const next = this.svg.querySelector<HTMLButtonElement>(`button[data-body-id="${id}"]`);
            keepScreenPoint(anchor, next, (x, y) => renderer instanceof VerticalMarkmap
                ? renderer.translateBy(x, y) : translateHorizontal(renderer, x, y));
            next?.focus({ preventScroll: true });
        }, true);
    }

    private fit() { if (this.renderer) void this.renderer.fit(); }

    private disposeRenderer() {
        this.removeZoomControls?.();
        this.removeZoomControls = undefined;
        this.removeDragging?.();
        this.removeDragging = undefined;
        this.redrawManual = undefined;
        if (this.renderer instanceof VerticalMarkmap) this.renderer.destroy();
        else if (this.renderer) {
            this.renderer.svg.on('.zoom', null);
            this.renderer.svg.interrupt();
            this.renderer.g.selectAll('*').interrupt();
        }
        this.renderer = undefined;
    }

    private showEmpty() {
        this.disposeRenderer();
        removeExistingSVG(this.containerEl);
        this.svg = undefined;
        this.displayEmpty(true);
    }

    private displayEmpty(display: boolean) {
        if (!this.emptyDiv) {
            this.emptyDiv = createDiv();
            this.emptyDiv.className = 'pane-empty';
            this.emptyDiv.textContent = 'No content found';
            this.containerEl.children[1].appendChild(this.emptyDiv);
        }
        this.emptyDiv.setCssStyles({ display: display ? '' : 'none' });
    }
}

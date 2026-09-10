import { ViewState, Workspace, WorkspaceLeaf, setIcon } from 'obsidian';
import { MM_VIEW_TYPE } from './constants';

/** Owns tab-header controls; switching always reuses the clicked leaf. */
export class TabToggle {
    private buttons = new Map<WorkspaceLeaf, HTMLButtonElement>();
    private groups = new Map<WorkspaceLeaf, { group: HTMLElement; close: HTMLElement; style: string | null }>();
    private saved = new WeakMap<WorkspaceLeaf, { state: ViewState; ephemeral: Record<string, unknown> }>();
    private busy = new Set<WorkspaceLeaf>();
    constructor(private workspace: Workspace, private openSplit: () => Promise<void> = async () => {}) {}

    sync() {
        const live = new Set<WorkspaceLeaf>();
        this.workspace.iterateAllLeaves(leaf => {
            const type = leaf.view.getViewType();
            if (type !== 'markdown' && type !== MM_VIEW_TYPE) return;
            // Obsidian exposes tab headers at runtime, but not in its public typings.
            const header = (leaf as WorkspaceLeaf & { tabHeaderEl?: HTMLElement }).tabHeaderEl;
            const inner = header?.querySelector('.workspace-tab-header-inner');
            if (!inner) return;
            live.add(leaf);
            let button = this.buttons.get(leaf);
            if (!button || !inner.contains(button)) {
                button?.remove();
                button = createEl('button');
                button.className = 'clickable-icon mm-tab-toggle';
                button.setCssStyles({ padding: '1px', marginLeft: 'auto', marginRight: '0', width: '22px', height: '24px', background: 'transparent', border: '0', boxShadow: 'none', flexShrink: '0' });
                setIcon(button, 'brain');
                button.addEventListener('pointerdown', event => event.stopPropagation());
                button.addEventListener('mousedown', event => event.stopPropagation());
                button.addEventListener('click', event => {
                    event.preventDefault(); event.stopPropagation();
                    void this.toggle(leaf).catch(console.error);
                });
                inner.insertBefore(button, inner.querySelector('.workspace-tab-header-inner-close-button'));
                this.buttons.set(leaf, button);
            }
            let split = inner.querySelector<HTMLButtonElement>('.mm-tab-split');
            if (!split) {
                split = createEl('button');
                split.className = 'clickable-icon mm-tab-split';
                split.setCssStyles({ padding: '1px', marginLeft: '1px', marginRight: '1px', width: '22px', height: '24px', background: 'transparent', border: '0', boxShadow: 'none', flexShrink: '0' });
                setIcon(split, 'columns-2');
                split.title = '打开 split 思维导图预览';
                split.setAttribute('aria-label', split.title);
                split.addEventListener('pointerdown', event => event.stopPropagation());
                split.addEventListener('mousedown', event => event.stopPropagation());
                split.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); void this.openSplit().catch(console.error); });
                inner.insertBefore(split, inner.querySelector('.workspace-tab-header-inner-close-button'));
            }
            if (!this.groups.get(leaf)?.group.contains(button)) {
                this.removeGroup(leaf);
                const close = inner.querySelector<HTMLElement>('.workspace-tab-header-inner-close-button');
                if (close) {
                    const group = createDiv();
                    group.className = 'mm-tab-controls';
                    group.setCssStyles({ display: 'inline-flex', alignItems: 'center', gap: '1px', marginLeft: 'auto', flex: '0 0 auto' });
                    inner.insertBefore(group, close);
                    this.groups.set(leaf, { group, close, style: close.getAttribute('style') });
                    group.append(button, split, close);
                    [button, split, close].forEach(control => control.setCssStyles({ margin: '0', padding: '1px', width: '22px', minWidth: '22px', maxWidth: '22px', height: '24px', flex: '0 0 22px', boxSizing: 'border-box' }));
                }
            }
            const mapped = type === MM_VIEW_TYPE;
            button.title = mapped ? '切换回 Markdown' : '切换为思维导图';
            button.setAttribute('aria-label', button.title);
            button.setAttribute('aria-pressed', String(mapped));
            button.setCssStyles({ color: mapped ? 'var(--interactive-accent)' : '' });
        });
        this.buttons.forEach((button, leaf) => {
            if (!live.has(leaf)) {
                this.removeGroup(leaf);
                button.remove();
                (leaf as WorkspaceLeaf & { tabHeaderEl?: HTMLElement }).tabHeaderEl?.querySelector('.mm-tab-split')?.remove();
                this.buttons.delete(leaf);
            }
        });
    }

    async toggle(leaf: WorkspaceLeaf) {
        if (this.busy.has(leaf)) return;
        this.busy.add(leaf);
        try {
            if (leaf.view.getViewType() === 'markdown') {
                const view = leaf.view as typeof leaf.view & { save?: () => Promise<void> };
                await view.save?.();
                const state = leaf.getViewState();
                if (typeof state.state?.file !== 'string') return;
                this.saved.set(leaf, { state, ephemeral: leaf.getEphemeralState() as Record<string, unknown> });
                await leaf.setViewState({ type: MM_VIEW_TYPE, state: { file: state.state.file, inline: true }, active: true });
            } else if (leaf.view.getViewType() === MM_VIEW_TYPE) {
                const saved = this.saved.get(leaf);
                const file = leaf.view.getState().file;
                if (!file && !saved) return;
                await leaf.setViewState(saved?.state || { type: 'markdown', state: { file }, active: true });
                if (saved) leaf.setEphemeralState(saved.ephemeral);
                this.saved.delete(leaf);
            }
        } finally { this.busy.delete(leaf); this.sync(); }
    }

    private removeGroup(leaf: WorkspaceLeaf) {
        const saved = this.groups.get(leaf);
        if (!saved) return;
        saved.group.parentElement?.insertBefore(saved.close, saved.group);
        if (saved.style === null) saved.close.removeAttribute('style');
        else saved.close.setAttribute('style', saved.style);
        saved.group.remove();
        this.groups.delete(leaf);
    }

    destroy() {
        this.groups.forEach((_group, leaf) => this.removeGroup(leaf));
        this.buttons.forEach(button => button.remove()); this.buttons.clear();
    }
}

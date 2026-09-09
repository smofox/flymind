import { MarkdownView, Notice, Plugin, Vault, Workspace, WorkspaceLeaf } from 'obsidian';
import MindmapView from './mindmap-view';
import { MM_VIEW_TYPE } from './constants';
import { MindMapSettings, LayoutDirection } from './settings';
import { MindMapSettingsTab } from './settings-tab';
import { TabToggle } from './tab-toggle';

export default class MindMap extends Plugin {
    vault: Vault;
    workspace: Workspace;
    settings: MindMapSettings;
    private tabToggle: TabToggle;

    async onload() {
        this.vault = this.app.vault;
        this.workspace = this.app.workspace;
        this.settings = Object.assign(new MindMapSettings(), await this.loadData());
        this.settings.layoutDirection = this.settings.layoutDirection === 'vertical' ? 'vertical' : 'horizontal';
        this.settings.splitDirection = String(this.settings.splitDirection).toLowerCase() === 'vertical' ? 'vertical' : 'horizontal';
        this.registerView(MM_VIEW_TYPE, (leaf: WorkspaceLeaf) => this.createPreview(leaf));
        this.tabToggle = new TabToggle(this.workspace);
        this.workspace.onLayoutReady(() => this.tabToggle.sync());
        this.registerEvent(this.workspace.on('layout-change', () => this.tabToggle.sync()));
        this.registerEvent(this.workspace.on('active-leaf-change', () => this.tabToggle.sync()));
        this.addCommand({ id: 'app:markmap-preview', name: '在独立窗格预览当前笔记',
            callback: () => this.markMapPreview(), hotkeys: [] });
        this.addCommand({ id: 'toggle-layout-direction', name: '切换水平／垂直布局',
            callback: () => this.setLayoutDirection(this.settings.layoutDirection === 'horizontal' ? 'vertical' : 'horizontal') });
        this.addSettingTab(new MindMapSettingsTab(this.app, this));
    }

    private createPreview(leaf: WorkspaceLeaf, source = this.workspace.getActiveViewOfType(MarkdownView)) {
        return new MindmapView(this.settings, leaf,
            { path: source?.file?.path, basename: source?.file?.basename },
            direction => this.setLayoutDirection(direction), source?.leaf);
    }

    async markMapPreview() {
        const source = this.workspace.getActiveViewOfType(MarkdownView);
        if (!source?.file) { new Notice('Open a Markdown note before previewing a mind map.'); return; }
        const existing = this.workspace.getLeavesOfType(MM_VIEW_TYPE)[0];
        if (existing) {
            const view = existing.view as MindmapView;
            if (!view.isLeafPinned) {
                view.linkedLeaf = source.leaf;
                view.filePath = source.file.path;
                view.fileName = source.file.basename;
            }
            await view.update();
            return;
        }
        // The preference describes pane placement; Obsidian names the divider direction.
        const leaf = this.workspace.splitActiveLeaf(this.settings.splitDirection === 'horizontal' ? 'vertical' : 'horizontal');
        const preview = this.createPreview(leaf, source);
        await leaf.open(preview);
    }

    async setLayoutDirection(direction: LayoutDirection) {
        this.settings.layoutDirection = direction;
        await this.saveData(this.settings);
        await Promise.all(this.workspace.getLeavesOfType(MM_VIEW_TYPE).map(leaf => (leaf.view as MindmapView).update()));
    }

    onunload() {
        this.tabToggle?.destroy();
        this.workspace.getLeavesOfType(MM_VIEW_TYPE).forEach(leaf => {
            if ((leaf.view as MindmapView).inline) void leaf.setViewState({ type: 'markdown', state: { file: (leaf.view as MindmapView).filePath } });
            else leaf.detach();
        });
    }
}

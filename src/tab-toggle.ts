import { ViewState, Workspace, WorkspaceLeaf, setIcon } from 'obsidian';
import { MM_VIEW_TYPE } from './constants';

/** Owns tab-header controls; switching always reuses the clicked leaf. */
export class TabToggle {
    private buttons = new Map<WorkspaceLeaf, HTMLButtonElement>();
    private saved = new WeakMap<WorkspaceLeaf, { state: ViewState; ephemeral: Record<string, unknown> }>();
    private busy = new Set<WorkspaceLeaf>();
    constructor(private workspace: Workspace) {}

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
                button.setCssStyles({ padding: '2px', marginLeft: '6px', background: 'transparent', border: '0', boxShadow: 'none', flexShrink: '0' });
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
            const mapped = type === MM_VIEW_TYPE;
            button.title = mapped ? '切换回 Markdown' : '切换为思维导图';
            button.setAttribute('aria-label', button.title);
            button.setAttribute('aria-pressed', String(mapped));
            button.setCssStyles({ color: mapped ? 'var(--interactive-accent)' : '' });
        });
        this.buttons.forEach((button, leaf) => {
            if (!live.has(leaf)) { button.remove(); this.buttons.delete(leaf); }
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

    destroy() { this.buttons.forEach(button => button.remove()); this.buttons.clear(); }
}

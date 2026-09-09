// Minimal host boundary: renderer, parsing, file tracking and layout remain real production code.
const Module = require('module');
const originalLoad = Module._load;
class ItemView {
    app: any;
    containerEl: HTMLElement;
    private cleanups: (() => void)[] = [];
    constructor(public leaf: any) {
        this.app = leaf.app;
        this.containerEl = leaf.containerEl;
    }
    addAction(_icon: string, title: string, callback: () => void) {
        const button = document.createElement('button');
        button.setAttribute('aria-label', title);
        button.onclick = callback;
        this.containerEl.querySelector('.view-actions')!.appendChild(button);
        return button;
    }
    registerEvent(_ref: any) {}
    async setState(_state: any, _result: any) {}
    registerInterval(id: number) { this.cleanups.push(() => window.clearInterval(id)); }
    unload() { this.cleanups.forEach(fn => fn()); }
}
Module._load = function (name: string, parent: any, isMain: boolean) {
    if (name === 'obsidian') return { ItemView, setIcon: (el: HTMLElement, name: string) => el.dataset.icon = name, Notice: class {}, getLinkpath: (v: string) => v.split('|')[0].split('#')[0] };
    return originalLoad.call(this, name, parent, isMain);
};
export function host(markdown = '# Root\n\n- First\n  - Child\n- Second') {
    const containerEl = document.createElement('div');
    containerEl.innerHTML = '<div class="view-header"><span class="view-header-title"></span><span class="view-actions"></span></div><div class="view-content"></div>';
    document.body.appendChild(containerEl);
    const source: any = { view: { getViewType: () => 'markdown', file: { path: 'note.md', basename: 'note' } } };
    const workspace: any = { activeLeaf: source, on: () => ({}), offref: () => {}, getGroupLeaves: () => [source] };
    const app = { workspace, vault: { getName: () => 'Test', adapter: { read: async () => markdown } } };
    const preview: any = { app, containerEl, view: { getViewType: () => 'mindmap' }, on: () => ({}) };
    return { app, source, preview, containerEl };
}

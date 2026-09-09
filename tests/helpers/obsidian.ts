// Minimal host boundary: renderer, parsing, file tracking and layout remain real production code.
const Module = require('module');
const originalLoad = Module._load;
const purifier = require('dompurify')(window);
Object.defineProperty(global, 'createEl', { configurable: true, value: (tag: string) => document.createElement(tag) });
Object.defineProperty(global, 'createDiv', { configurable: true, value: () => document.createElement('div') });
Object.defineProperty(global, 'createSpan', { configurable: true, value: () => document.createElement('span') });
Object.defineProperty(global, 'createSvg', { configurable: true, value: (tag: string) => document.createElementNS('http://www.w3.org/2000/svg', tag) });
for (const proto of [window.HTMLElement.prototype, window.SVGElement.prototype]) {
    Object.defineProperty(proto, 'setCssStyles', { configurable: true, value(this: HTMLElement, styles: Partial<CSSStyleDeclaration>) { Object.assign(this.style, styles); } });
}
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
    if (name === 'obsidian') return { ItemView, sanitizeHTMLToDom: (html: string) => purifier.sanitize(html, { RETURN_DOM_FRAGMENT: true, ADD_URI_SAFE_ATTR: [], ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|obsidian):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i }), setIcon: (el: HTMLElement, name: string) => el.dataset.icon = name, Notice: class {}, getLinkpath: (v: string) => v.split('|')[0].split('#')[0] };
    return originalLoad.call(this, name, parent, isMain);
};
export function host(markdown = '# Root\n\n- First\n  - Child\n- Second') {
    const containerEl = document.createElement('div');
    containerEl.innerHTML = '<div class="view-header"><span class="view-header-title"></span><span class="view-actions"></span></div><div class="view-content"></div>';
    document.body.appendChild(containerEl);
    const source: any = { view: { getViewType: () => 'markdown', file: { path: 'note.md', basename: 'note' } } };
    const workspace: any = { activeLeaf: source, getActiveViewOfType: () => workspace.activeLeaf?.view.getViewType() === 'markdown' ? { ...workspace.activeLeaf.view, leaf: workspace.activeLeaf } : null, on: () => ({}), offref: () => {}, getGroupLeaves: () => [source] };
    const app = { workspace, vault: { getName: () => 'Test', adapter: { read: async () => markdown } } };
    const preview: any = { app, containerEl, view: { getViewType: () => 'mindmap' }, on: () => ({}) };
    return { app, source, preview, containerEl };
}

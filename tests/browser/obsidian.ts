import DOMPurify from 'dompurify';

Object.assign(window, {
    createEl: (tag: string) => document.createElement(tag),
    createDiv: () => document.createElement('div'),
    createSpan: () => document.createElement('span'),
    createSvg: (tag: string) => document.createElementNS('http://www.w3.org/2000/svg', tag)
});
for (const proto of [HTMLElement.prototype, SVGElement.prototype]) {
    Object.defineProperty(proto, 'setCssStyles', { value(this: HTMLElement, styles: Partial<CSSStyleDeclaration>) { Object.assign(this.style, styles); } });
}
export const sanitizeHTMLToDom = (html: string) => DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true });
export class MarkdownView {}
export class ItemView {
    app: any;
    containerEl: HTMLElement;
    private cleanup: (() => void)[] = [];
    constructor(public leaf: any) { this.app = leaf.app; this.containerEl = leaf.containerEl; }
    addAction(_icon: string, title: string, callback: () => void) {
        const button = document.createElement('button');
        button.textContent = title;
        button.title = title;
        button.setAttribute('aria-label', title);
        button.onclick = callback;
        this.containerEl.querySelector('.view-actions')!.appendChild(button);
        return button;
    }
    registerEvent(ref: any) { if (ref?.dispose) this.cleanup.push(ref.dispose); }
    async setState(_state: unknown, _result: unknown) {}
    registerInterval(id: number) { this.cleanup.push(() => window.clearInterval(id)); }
    unload() { this.cleanup.forEach(fn => fn()); }
}
export class Notice {}
export function getLinkpath(value: string) { return value.split('|')[0].split('#')[0]; }

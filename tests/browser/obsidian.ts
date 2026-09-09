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
    registerInterval(id: number) { this.cleanup.push(() => window.clearInterval(id)); }
    unload() { this.cleanup.forEach(fn => fn()); }
}
export class Notice {}
export function getLinkpath(value: string) { return value.split('|')[0].split('#')[0]; }

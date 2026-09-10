import { expect } from 'chai';
import { host } from './helpers/obsidian';
import MindmapView from '../src/mindmap-view';
import { MindMapSettings } from '../src/settings';
import { Menu } from 'obsidian';

// jsdom has no SVG animated transform API; d3 uses this for exit transitions.
if (!('transform' in window.SVGElement.prototype)) {
    Object.defineProperty(window.SVGElement.prototype, 'transform', {
        configurable: true, get() { return { baseVal: { consolidate: (): null => null } }; }
    });
}

describe('node content reader', () => {
    for (const direction of ['horizontal', 'vertical'] as const) {
        for (const scrolling of [false, true]) {
        it(`switches details by title in ${direction}, scrolling=${scrolling}`,  async () => {
            const full = '长正文'.repeat(180) + '结尾标记';
            const h = host(`# First\n\n${full}\n\n## Second\n\n> Other content`);
            const settings = new MindMapSettings(); settings.layoutDirection = direction; settings.nodeScrolling = scrolling;
            const view = new MindmapView(settings, h.preview, { path: 'note.md', basename: 'note' }, async () => {}, h.source, async () => {});
            try {
                await view.onOpen();
                const handlers = new Map<string, () => Promise<void>>();
                const menu = {
                    addItem(fn: (item: unknown) => void) {
                        let title = '';
                        const item = { setTitle(value: string) { title = value; return item; },
                            setChecked() { return item; }, setIcon() { return item; },
                            onClick(callback: () => Promise<void>) { handlers.set(title, callback); return item; } };
                        fn(item); return menu;
                    }, addSeparator() { return menu; }
                };
                view.onMoreOptionsMenu(menu as unknown as Menu);
                // A broken/slow disk read must not block an already rendered layout change.
                h.app.vault.adapter.read = async () => { throw new Error('read unavailable'); };
                for (const next of ['vertical', 'horizontal', direction] as const) {
                    await handlers.get(next === 'vertical' ? 'Vertical (top to bottom)' : 'Horizontal (left to right)')!();
                    expect(!!h.containerEl.querySelector('svg.mindmap-vertical')).to.equal(next === 'vertical');
                }
                const originalSvg = h.containerEl.querySelector('svg.mindmap-svg')!;
                const originalTransform = originalSvg.querySelector('g')!.getAttribute('transform');
                const bulkBefore = h.containerEl.querySelector<HTMLButtonElement>('[aria-label="折叠全部正文"]')!;
                bulkBefore.click();
                const foldedTransform = originalSvg.querySelector('g')!.getAttribute('transform');
                for (const enabled of [!scrolling, scrolling, !scrolling, scrolling]) {
                    await handlers.get('节点内滚动')!();
                    expect(settings.nodeScrolling).to.equal(enabled);
                    expect(h.containerEl.querySelector('svg.mindmap-svg')).to.equal(originalSvg);
                    expect(originalSvg.querySelector('g')!.getAttribute('transform')).to.equal(foldedTransform);
                    expect(originalSvg.querySelectorAll('.mm-node-body-toggle[aria-expanded="false"]')).to.have.length(2);
                    const body = h.containerEl.querySelector<HTMLElement>('svg.mindmap-svg .mm-node-body')!;
                    expect(body.dataset.scrollable).to.equal(String(enabled));
                    expect(body.style.overflow).to.equal(enabled ? 'auto' : 'hidden');
                }
                h.containerEl.querySelector<HTMLButtonElement>('[aria-label="展开全部正文"]')!.click();
                expect(originalSvg.querySelector('g')!.getAttribute('transform')).to.equal(originalTransform);
                const svg = h.containerEl.querySelector('svg.mindmap-svg')!;
                const rendered = Array.from(svg.querySelectorAll<HTMLElement>('.mm-node-card'));
                const cards = ['First', 'Second'].map(title => rendered.find(card => card.querySelector('.mm-node-title')?.textContent === title)!);
                expect(h.containerEl.querySelector('.view-actions .mm-zoom-controls')).not.to.equal(null);
                expect(svg.parentElement!.querySelector('.mm-zoom-controls')).to.equal(null);
                const zoomBefore = svg.querySelector('g')!.getAttribute('transform');
                const bulk = h.containerEl.querySelector<HTMLButtonElement>('[aria-label="折叠全部正文"]')!;
                expect(bulk).not.to.equal(null);
                bulk.click();
                expect(svg.querySelectorAll('.mm-node-body-toggle[aria-expanded="false"]')).to.have.length(2);
                expect(svg.querySelector('g')!.getAttribute('transform')).to.equal(zoomBefore);
                expect(bulk.getAttribute('aria-label')).to.equal('展开全部正文');
                bulk.click();
                expect(svg.querySelectorAll('.mm-node-body-toggle[aria-expanded="true"]')).to.have.length(2);
                expect(svg.querySelector('g')!.getAttribute('transform')).to.equal(zoomBefore);
                const refreshed = Array.from(svg.querySelectorAll<HTMLElement>('.mm-node-card'));
                cards.splice(0, 2, ...['First', 'Second'].map(title => refreshed.find(card => card.querySelector('.mm-node-title')?.textContent === title)!));
                const summary = cards[0].querySelector('.mm-node-body')!;
                if (scrolling) {
                    expect(summary.textContent).to.include('结尾标记');
                    expect((summary as HTMLElement).style.overflow).to.equal('auto');
                    let canvasWheel = false;
                    svg.addEventListener('wheel', () => { canvasWheel = true; });
                    summary.dispatchEvent(new window.WheelEvent('wheel', { bubbles: true }));
                    expect(canvasWheel).to.equal(false);
                } else {
                    expect(Array.from(summary.textContent!).length).to.equal(141);
                    expect(summary.textContent).not.to.include('结尾标记');
                }
                summary.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                expect(h.containerEl.querySelector<HTMLElement>('.mm-content-details')!.style.display).to.equal('none');
                cards[0].querySelector('.mm-node-title')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                const panel = h.containerEl.querySelector<HTMLElement>('.mm-content-details')!;
                panel.querySelector<HTMLButtonElement>('button')!.click();
                const heading = cards[0].querySelector('.mm-node-title')!;
                heading.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
                svg.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 100, clientY: 100 }));
                svg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                expect(panel.style.display).to.equal('flex');
                panel.querySelector<HTMLButtonElement>('button')!.click();
                heading.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
                svg.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 110, clientY: 100 }));
                svg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                expect(panel.style.display).to.equal('none');
                heading.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 100 }));
                svg.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 100, clientY: 100 }));
                svg.dispatchEvent(new MouseEvent('click', { bubbles: true }));

                expect(panel.style.display).to.equal('flex');
                expect(panel.textContent).to.include('结尾标记');
                cards[1].querySelector('.mm-node-body')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                expect(panel.textContent).to.include('结尾标记');
                expect(panel.querySelector<HTMLElement>('.mm-content-details-body')!.style.overflow).to.equal('auto');
                cards[1].querySelector('.mm-node-title')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                expect(panel.textContent).to.include('Other content').and.not.include('结尾标记');
                expect(panel.querySelector('blockquote')).not.to.equal(null);
                panel.querySelector<HTMLButtonElement>('button')!.click();
                expect(panel.style.display).to.equal('none');
                cards[0].querySelector('.mm-node-title')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                svg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                expect(panel.style.display).to.equal('none');
            } finally { await view.onClose(); (view as unknown as { unload(): void }).unload(); h.containerEl.remove(); }
        });
        }
    }
});


describe('pinned preview viewport', () => {
    for (const direction of ['horizontal', 'vertical'] as const) {
        it(`retains zoom and position on source switches and resize in ${direction}`, async () => {
            const h = host('# Heading\n\nBody');
            const handlers = new Map<string, () => void>();
            h.app.workspace.on = (name: string, callback: () => void) => { handlers.set(name, callback); return {}; };
            const settings = new MindMapSettings(); settings.layoutDirection = direction;
            const view = new MindmapView(settings, h.preview, { path: 'note.md', basename: 'note' }, async () => {}, h.source);
            try {
                await view.onOpen();
                view.pinCurrentLeaf();
                const svg = h.containerEl.querySelector('svg.mindmap-svg')!;
                // A user viewport distinct from initial fit; any fit/rebuild loses it.
                const viewport = svg.querySelector('g')!;
                viewport.setAttribute('transform', 'translate(120,80) scale(2)');
                h.source.view.file = { path: 'other.md', basename: 'other' };
                handlers.get('active-leaf-change')?.();
                handlers.get('resize')?.();
                await view.checkAndUpdate();
                expect(view.filePath).to.equal('note.md');
                expect(h.containerEl.querySelector('svg.mindmap-svg')).to.equal(svg);
                expect(viewport.getAttribute('transform')).to.equal('translate(120,80) scale(2)');
            } finally { await view.onClose(); (view as unknown as { unload(): void }).unload(); h.containerEl.remove(); }
        });
    }
});

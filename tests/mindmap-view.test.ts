import { host } from './helpers/obsidian';
import { expect } from 'chai';
import MindmapView from '../src/mindmap-view';
import { MindMapSettings } from '../src/settings';
import { createSVG } from '../src/markmap-svg';

describe('preview lifecycle', () => {
    const views: MindmapView[] = [];
    afterEach(async () => {
        for (const view of views) { await view.onClose(); (view as any).unload(); }
        views.length = 0;
        document.body.textContent = '';
    });
    function preview(md = '# Root\n\n## First\n\n### Child\n\n## Second') {
        const h = host(md.replace(/^# Root\n\n/, ''));
        const settings = new MindMapSettings();
        settings.layoutDirection = 'vertical';
        const view = new MindmapView(settings, h.preview, { path: 'note.md', basename: 'note' }, async () => {}, h.source);
        views.push(view);
        return { ...h, view };
    }
    it('renders the initial Markdown immediately even when the preview becomes active', async () => {
        const h = preview();
        h.app.workspace.activeLeaf = h.preview;
        await h.view.onOpen();
        expect(h.containerEl.querySelector('svg.mindmap-vertical')).not.to.equal(null);
        expect(h.containerEl.querySelector('svg.mindmap-svg')!.textContent).to.include('First');
        expect(h.view.getLeafTarget()).to.equal(h.source);
    });
    it('retains the source when focus moves to a non-Markdown pane', async () => {
        const h = preview();
        await h.view.onOpen();
        h.app.workspace.activeLeaf = { view: { getViewType: () => 'canvas' } };
        await h.view.checkAndUpdate();
        expect(h.view.filePath).to.equal('note.md');
        expect(h.containerEl.querySelector('svg.mindmap-svg')!.textContent).to.include('Child');
    });
    it('does not let an older file read overwrite a newer note', async () => {
        const h = preview();
        await h.view.onOpen();
        let finish: (s: string) => void = () => {};
        h.app.vault.adapter.read = async () => new Promise<string>(resolve => { finish = resolve; });
        const old = h.view.update(false);
        h.view.filePath = 'new.md';
        h.app.vault.adapter.read = async () => '# Newer';
        await h.view.update();
        finish('# Stale');
        await old;
        expect(h.containerEl.querySelector('svg.mindmap-svg')!.textContent).to.include('Newer');
        expect(h.containerEl.querySelector('svg.mindmap-svg')!.textContent).not.to.include('Stale');
    });
    it('does not lose a forced refresh when polling finishes its read first', async () => {
        const h = preview();
        await h.view.onOpen();
        const previous = h.containerEl.querySelector('svg.mindmap-svg');
        let finish: (s: string) => void = () => {};
        h.app.vault.adapter.read = async () => new Promise<string>(resolve => { finish = resolve; });
        const forced = h.view.update();
        h.app.vault.adapter.read = async () => '# Root\n\n- First\n\n### Child\n- Second';
        await h.view.update(false);
        finish('# Root\n\n- First\n\n### Child\n- Second');
        await forced;
        expect(h.containerEl.querySelector('svg.mindmap-svg') === previous).to.equal(false);
    });
    it('keeps user fold flags during a forced layout refresh', async () => {
        const h = preview();
        await h.view.onOpen();
        h.containerEl.querySelector<SVGCircleElement>('[data-node-id="root-0"] .mm-branch-toggle')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await h.view.update();
        expect(h.containerEl.querySelector('[data-node-id="root-0-0"]')).to.equal(null);
        expect(h.containerEl.querySelector('[data-node-id="root-0"]')!.getAttribute('aria-expanded')).to.equal('false');
    });
    it('honors Markdown fold hints without dropping the hidden content', async () => {
        const h = preview('# Root\n\n## Hidden <!-- fold -->\n\n### Detail');
        await h.view.onOpen();
        expect(h.containerEl.querySelector('[data-node-id="root-0-0"]')).to.equal(null);
        h.containerEl.querySelector<SVGCircleElement>('[data-node-id="root-0"] .mm-branch-toggle')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(h.containerEl.querySelector('[data-node-id="root-0-0"]')).not.to.equal(null);
    });
    it('collapses paragraph content independently of child branches and retains it on refresh', async () => {
        const h = preview('# Root\n\n## Parent\n\nBody one.\n\nBody two.\n\n\n### Child');
        await h.view.onOpen();
        let button = h.containerEl.querySelector<HTMLButtonElement>('.mm-node-body-toggle');
        expect(!!button).to.equal(true);
        expect(button!.querySelector('svg')!.getAttribute('data-icon')).to.equal('minus');
        expect(button!.style.color).to.equal('rgb(38, 126, 77)');
        button!.click();
        await h.view.update();
        button = h.containerEl.querySelector<HTMLButtonElement>('.mm-node-body-toggle');
        expect(button!.getAttribute('aria-expanded')).to.equal('false');
        expect(button!.querySelector('svg')!.getAttribute('data-icon')).to.equal('plus');
        expect(button!.style.color).to.equal('rgb(193, 68, 68)');
        expect(button!.getAttribute('aria-label')).to.equal('展开正文');
        expect(button!.style.borderRadius).to.equal('50%');
        expect(button!.style.top).to.equal('50%');
        expect(button!.style.left).to.equal('12px');
        expect(h.containerEl.querySelector<HTMLElement>('.mm-node-card')!.style.borderWidth).to.equal('0px');
        expect(h.containerEl.querySelector('[data-node-id="root-0"] > rect')).to.equal(null);
        expect(h.containerEl.querySelector<HTMLElement>('.mm-node-body')!.style.display).to.equal('none');
        expect(h.containerEl.querySelector('[data-node-id="root-0-0"]')).not.to.equal(null);
        button!.click();
        await h.view.update();
        expect(h.containerEl.querySelector('.mm-node-body-toggle')!.getAttribute('aria-expanded')).to.equal('true');
        expect(h.containerEl.querySelector<HTMLElement>('.mm-node-card')!.style.borderWidth).to.equal('1px');
        expect(h.containerEl.querySelector('.mm-node-body')!.textContent).to.include('Body one.').and.include('Body two.');
    });
    it('does not let body-button keyboard events toggle the parent branch', async () => {
        const h = preview('# Root\n\n## Parent\n\nBody.\n\n\n### Child');
        await h.view.onOpen();
        const button = h.containerEl.querySelector<HTMLButtonElement>('.mm-node-body-toggle');
        expect(!!button).to.equal(true);
        button!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(h.containerEl.querySelector('[data-node-id="root-0-0"]')).not.to.equal(null);
    });
    it('only folds child branches from endpoints, not content cards', async () => {
        const h = preview('# Root\n\n## Parent\n\nBody.\n\n\n### Child');
        await h.view.onOpen();
        h.containerEl.querySelector('.mm-node-card')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(!!h.containerEl.querySelector('[data-node-id="root-0-0"]')).to.equal(true);
        const endpoint = h.containerEl.querySelector('[data-node-id="root-0"] .mm-branch-toggle');
        expect(!!endpoint).to.equal(true);
        endpoint!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(!!h.containerEl.querySelector('[data-node-id="root-0-0"]')).to.equal(false);
    });
    it('uses the original Category10 node order, including hidden descendants', async () => {
        const h = preview('# Root\n\n## A <!-- fold -->\n\n### Hidden\n\n## B\n\n### Child');
        await h.view.onOpen();
        const circle = h.containerEl.querySelector('[data-node-id="root-1"] circle');
        expect(circle!.getAttribute('stroke')).to.equal('#d62728');
        expect(h.containerEl.querySelectorAll('[data-node-id="root-1"] circle')).to.have.length(2);
    });
    it('keeps the current zoom and SVG when toggling paragraph content', async () => {
        const h = preview('# Root\n\n## Parent\n\nBody.\n\n\n### Child');
        await h.view.onOpen();
        const svg = h.containerEl.querySelector('svg.mindmap-svg')!;
        svg.dispatchEvent(new window.WheelEvent('wheel', { deltaY: -400, clientX: 120, clientY: 120, bubbles: true, cancelable: true }));
        const zoom = () => h.containerEl.querySelector('svg.mindmap-svg > g')!.getAttribute('transform')!.match(/scale\(([^)]+)\)/)![1];
        const before = zoom();
        h.containerEl.querySelector<HTMLButtonElement>('.mm-node-body-toggle')!.click();
        await new Promise(resolve => setTimeout(resolve, 10));
        expect(h.containerEl.querySelector('svg.mindmap-svg') === svg).to.equal(true);
        expect(zoom()).to.equal(before);
    });
    it('leaves clearance between collapsed text and both connection endpoints', async () => {
        const h = preview('# Root\n\n## Parent\n\nBody.\n\n\n### Child');
        await h.view.onOpen();
        h.containerEl.querySelector<HTMLButtonElement>('.mm-node-body-toggle')!.click();
        const node = h.containerEl.querySelector('[data-node-id="root-0"]')!;
        const fo = node.querySelector('foreignObject')!;
        const incoming = node.querySelector('[data-endpoint="incoming"]')!;
        const outgoing = node.querySelector('[data-endpoint="outgoing"]')!;
        expect(+fo.getAttribute('y')! - +incoming.getAttribute('cy')! - 6).to.be.at.least(12);
        expect(+outgoing.getAttribute('cy')! - +fo.getAttribute('y')! - +fo.getAttribute('height')! - 6).to.be.at.least(12);
    });
    it('offers a separate circled plus beyond a folded endpoint and removes it on expansion', async () => {
        const h = preview('# Root\n\n## Parent <!-- fold -->\n\n### Child');
        await h.view.onOpen();
        const hint = h.containerEl.querySelector('[data-node-id="root-0"] .mm-expand-hint');
        expect(!!hint).to.equal(true);
        hint!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(!!h.containerEl.querySelector('[data-node-id="root-0-0"]')).to.equal(true);
        expect(!!h.containerEl.querySelector('[data-node-id="root-0"] .mm-expand-hint')).to.equal(false);
    });
    it('removes only its own SVG when replacing or closing a preview', async () => {
        const first = host(), second = host();
        const a = createSVG(first.containerEl, '1em');
        createSVG(second.containerEl, '1em');
        createSVG(second.containerEl, '1em');
        expect(first.containerEl.contains(a)).to.equal(true);
        expect(second.containerEl.querySelectorAll('svg.mindmap-svg')).to.have.length(1);
        const h = preview(); await h.view.onOpen(); await h.view.onClose();
        expect(h.containerEl.querySelector('svg.mindmap-svg')).to.equal(null);
    });
});

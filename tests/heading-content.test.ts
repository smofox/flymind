import { expect } from 'chai';
import { transformWithParagraphs, toggleParagraphContent, applyBodyDisplay } from '../src/markdown-transform';

describe('complete heading content', () => {
    it('keeps quotes, tables, lists and code once, under their owning heading', () => {
        const md = '# FlyMind\n\n> **First quote**\n\n> Second quote\n\n## Features\n\n| Name | Detail |\n| --- | --- |\n| Zoom | Focus zoom |\n\n- List detail\n\n```md\n# Not a category\n```\n\n###### Deep heading\n\nLast body';
        const root = transformWithParagraphs(md, '2026-09-09').root;
        expect(root.v).to.equal('2026-09-09');
        expect(root.c).to.have.length(1);
        const intro = root.c![0];
        const content = document.createElement('div'); content.innerHTML = intro.v;
        expect(content.querySelector('.mm-full-body')!.textContent!.match(/First quote/g)).to.have.length(1);
        expect(content.querySelector('.mm-full-body')!.textContent!.match(/Second quote/g)).to.have.length(1);
        expect(intro.c).to.have.length(1);
        const features = intro.c![0];
        const el = document.createElement('div'); el.innerHTML = features.v;
        expect(el.querySelector('table')!.textContent).to.include('Focus zoom');
        expect(el.querySelector('li')!.textContent).to.equal('List detail');
        expect(el.querySelector('code')!.textContent).to.include('# Not a category');
        expect(features.c).to.have.length(1);
        expect(features.c![0].v).to.include('Deep heading');
        expect(el.querySelector<HTMLElement>('.mm-node-body')!.style.overflow).to.equal('hidden');
        expect(toggleParagraphContent(root, features.p!.paragraphId!)).to.equal(true);
        expect(features.v).to.include('Focus zoom');
    });
    it('retains preamble and nested quoted headings as body', () => {
        const root = transformWithParagraphs('Intro\n\n> # Quoted heading\n> Body\n\n# Section\n\nText', 'File').root;
        expect(root.v).to.include('Intro').and.include('Quoted heading');
        expect(root.c).to.have.length(1);
    });
});


describe('body display preference', () => {
    it('retains full content and collapsed state across mode changes', () => {
        const root = transformWithParagraphs('# Title\n\n' + '正文'.repeat(160), 'File').root;
        const node = root.c![0];
        toggleParagraphContent(root, node.p!.paragraphId!);
        for (const scroll of [true, false, true]) {
            applyBodyDisplay(root, scroll);
            const el = document.createElement('div'); el.innerHTML = node.v;
            expect(el.querySelector<HTMLElement>('.mm-node-body')!.style.display).to.equal('none');
            expect(el.querySelector('.mm-full-body')!.textContent).to.include('正文'.repeat(160));
        }
        toggleParagraphContent(root, node.p!.paragraphId!);
        const el = document.createElement('div'); el.innerHTML = node.v;
        expect(el.querySelector<HTMLElement>('.mm-node-body')!.style.display).to.equal('block');
    });
});

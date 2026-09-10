import { expect } from 'chai';
import { transformWithParagraphs } from '../src/markdown-transform';
const parse = (md: string) => transformWithParagraphs(md).root;
const body = (value: string) => { const el = document.createElement('div'); el.innerHTML = value; return el.querySelector('.mm-full-body')!; };
describe('paragraphs inside their corresponding node', () => {
    it('keeps title and multiple paragraphs in one node, without paragraph branches', () => {
        const root = parse('## 创建账户\n\n转入 **0.007295616 SOL**。\n\n空间为 `1024 bytes`。');
        expect(body(root.v).querySelectorAll('p')).to.have.length(2);
        expect(body(root.v).querySelector('strong')!.textContent).to.equal('0.007295616 SOL');
        expect(body(root.v).querySelector('code')!.textContent).to.equal('1024 bytes');
        expect(root.c || []).to.have.length(0);
    });
    it('associates body text and lists with the nearest section', () => {
        const root = parse('# Root\n\nRoot body\n\n## A\n\nA body\n\n- A item\n\n## B\n\nB body');
        expect(root.v).to.include('Root body').not.to.include('A body');
        expect(root.c).to.have.length(2);
        expect(root.c![0].v).to.include('A body').not.to.include('B body');
        expect(body(root.c![0].v).querySelector('li')!.textContent).to.equal('A item');
        expect(root.c![1].v).to.include('B body');
    });
    it('retains nested list paragraphs in the heading body rather than as branches', () => {
        const root = parse('# Root\n\n- Account\n\n  First body\n\n  Second body\n\n  - Child\n\n- Next');
        const content = body(root.v);
        expect(content.textContent).to.include('Account').and.include('First body').and.include('Second body').and.include('Next');
        expect(content.querySelector('ul ul li')!.textContent).to.equal('Child');
        expect(root.c).to.have.length(0);
    });
    it('retains numbering, inline links and hard line breaks inside ordered lists', () => {
        const root = parse('# Root\n\n1. Item\n\n   [First](first.md) and [Second](second.md)  \n   New line\n\n   - Child\n2. Next');
        const content = body(root.v);
        expect(content.querySelectorAll('ol > li')).to.have.length(2);
        expect(content.querySelectorAll('a')).to.have.length(2);
        expect(content.querySelector('br')).not.to.equal(null);
        expect(root.c).to.have.length(0);
    });
    it('renders paragraph-only notes and keeps ordinary lists intact', () => {
        const note = parse('Only a paragraph.\n\nAnother paragraph.');
        expect(body(note.v).textContent).to.include('Only a paragraph.').and.include('Another paragraph.');
        expect(note.c || []).to.have.length(0);
        const root = parse('# Root\n\n- One\n  - Child\n- Two');
        expect(body(root.v).querySelectorAll('li')).to.have.length(3);
        expect(root.c).to.have.length(0);
    });
    it('preserves paragraph and fenced-block order inside one body', () => {
        const root = parse('# Root\n\nBefore\n\n```\ncode\n```\n\nAfter');
        const content = body(root.v);
        expect(Array.from(content.querySelector('.mm-node-paragraph')!.children).map(el => el.tagName)).to.deep.equal(['P', 'PRE', 'P']);
        expect(content.querySelector('code')!.textContent).to.equal('code\n');
        expect(root.c).to.have.length(0);
    });
});

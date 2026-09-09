import { expect } from 'chai';
import { transformWithParagraphs } from '../src/markdown-transform';
const parse = (md: string) => transformWithParagraphs(md).root;
describe('paragraphs inside their corresponding node', () => {
    it('keeps title and multiple paragraphs in one node, without paragraph branches', () => {
        const root = parse('## 创建账户\n\n转入 **0.007295616 SOL**。\n\n空间为 `1024 bytes`。');
        expect(root.v).to.include('创建账户').and.include('<strong>0.007295616 SOL</strong>').and.include('<code>1024 bytes</code>');
        expect(root.v.match(/class="mm-node-paragraph"/g)).to.have.length(2);
        expect(root.c || []).to.have.length(0);
    });
    it('associates body text with the nearest section without moving headings or lists', () => {
        const root = parse('# Root\n\nRoot body\n\n## A\n\nA body\n\n- A item\n\n## B\n\nB body');
        expect(root.v).to.include('Root body').not.to.include('A body');
        expect(root.c).to.have.length(2);
        expect(root.c![0].v).to.include('A body').not.to.include('B body');
        expect(root.c![0].c![0].v).to.equal('A item');
        expect(root.c![1].v).to.include('B body');
    });
    it('keeps a list label and indented paragraphs together while retaining child branches', () => {
        const root = parse('# Root\n\n- Account\n\n  First body\n\n  Second body\n\n  - Child\n\n- Next');
        const item = root.c![0];
        expect(item.v).to.include('Account').and.include('First body').and.include('Second body');
        expect(item.c).to.have.length(1);
        expect(item.c![0].v).to.equal('Child');
        expect(root.c![1].v).to.equal('Next');
    });
    it('retains numbering, folds, inline links and hard line breaks', () => {
        const root = parse('# Root\n\n1. Item <!-- fold -->\n\n   [First](first.md) and [Second](second.md)  \n   New line\n\n   - Child\n2. Next');
        const item = root.c![0];
        expect(item.v).to.include('1. Item').and.include('<a href="first.md">First</a>').and.include('<br>');
        expect(item.p.f).to.equal(true);
        expect(item.c![0].v).to.equal('Child');
        expect(root.c![1].v).to.include('2. Next');
    });
    it('renders paragraph-only notes without altering ordinary heading/list notes', () => {
        const note = parse('Only a paragraph.\n\nAnother paragraph.');
        expect(note.v).to.include('Only a paragraph.').and.include('Another paragraph.');
        expect(note.c || []).to.have.length(0);
        const root = parse('# Root\n\n- One\n  - Child\n- Two');
        expect(root.v).to.equal('Root');
        expect(root.c!.map(n => n.v)).to.deep.equal(['One', 'Two']);
    });
    it('preserves paragraphs mixed with a fenced block', () => {
        const root = parse('# Root\n\nBefore\n\n```\ncode\n```\n\nAfter');
        expect(root.v).to.include('Before').and.include('After');
        expect(root.c).to.have.length(1);
        expect(root.c![0].v).to.include('code');
    });
});

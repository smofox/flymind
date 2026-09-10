import './helpers/obsidian';
import { expect } from 'chai';
import ObsidianMarkmap from '../src/obsidian-markmap-plugin';
import { transformWithParagraphs } from '../src/markdown-transform';

describe('links inside paragraph content', () => {
    it('keeps multiple note links independently navigable inside one node', () => {
        const root = transformWithParagraphs('# Topic\n\n[First](first.md) and [Second](second.md)\n\n[[third]] and [[fourth]]').root;
        new ObsidianMarkmap({ getName: () => 'Test' } as any).updateInternalLinks(root);
        const div = document.createElement('div'); div.innerHTML = root.v;
        const links = Array.from(div.querySelectorAll('.mm-full-body a'));
        expect(links.map(a => a.textContent)).to.deep.equal(['First', 'Second', 'third', 'fourth']);
        expect(links.map(a => a.getAttribute('href'))).to.deep.equal([
            'obsidian://open?vault=Test&file=first.md', 'obsidian://open?vault=Test&file=second.md',
            'obsidian://open?vault=Test&file=third', 'obsidian://open?vault=Test&file=fourth'
        ]);
    });
});

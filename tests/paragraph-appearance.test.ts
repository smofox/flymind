import { expect } from 'chai';
import { applyParagraphAppearance, toggleParagraphContent, transformWithParagraphs } from '../src/markdown-transform';

describe('paragraph borders', () => {
    it('stays borderless horizontally and restores vertical borders after repeated toggles', () => {
        const root = transformWithParagraphs('# Title\n\nBody.').root;
        const card = () => { const d = document.createElement('div'); d.innerHTML = root.v; return d.querySelector<HTMLElement>('.mm-node-card')!; };
        applyParagraphAppearance(root, false);
        expect(card().style.borderStyle).to.equal('none');
        for (let i = 0; i < 4; i++) { toggleParagraphContent(root, root.p.paragraphId, false); expect(card().style.borderStyle).to.equal('none'); }
        applyParagraphAppearance(root, true);
        expect(card().style.borderStyle).to.equal('dashed');
        toggleParagraphContent(root, root.p.paragraphId, true);
        expect(card().style.borderStyle).to.equal('none');
        toggleParagraphContent(root, root.p.paragraphId, true);
        expect(card().style.borderStyle).to.equal('dashed');
        expect(card().style.borderWidth).to.equal('1px');
        expect(['#1f77b4', 'rgb(31, 119, 180)']).to.include(card().style.borderColor);
    });
});

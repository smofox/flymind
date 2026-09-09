import { expect } from 'chai';
import { Markmap } from 'markmap-view';
import { useEndpointControls } from '../src/horizontal-endpoints';
import { transformWithParagraphs, toggleParagraphContent } from '../src/markdown-transform';

describe('horizontal root content', () => {
    it('refreshes the reused root DOM and dimensions after repeated content toggles', () => {
        const root = transformWithParagraphs('# Root\n\nRoot body.\n\n- Child\n\n  Child body.').root;
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        document.body.appendChild(svg);
        const map = new Markmap(svg, { duration: 0, autoFit: false });
        useEndpointControls(map);
        map.setData(root);
        for (const expanded of ['false', 'true', 'false']) {
            expect(root.p.paragraphId).to.equal(0);
            expect(toggleParagraphContent(root, 0, false)).to.equal(true);
            map.setData(root);
            const button = svg.querySelector('button[data-body-id="0"]')!;
            expect(button.getAttribute('aria-expanded')).to.equal(expanded);
            expect(button.closest('foreignObject')!.getAttribute('height')).to.equal(String(root.p.s[1]));
        }
        map.svg.on('.zoom', null);
        svg.remove();
    });
});

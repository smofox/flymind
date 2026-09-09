import { expect } from 'chai';
import { createZoomControls } from '../src/zoom-controls';
import { VerticalMarkmap } from '../src/vertical-markmap';
import { transformWithParagraphs } from '../src/markdown-transform';

describe('floating zoom controls', () => {
    it('zooms around the visible center, updates percentage, fits, and cleans up', async () => {
        const host = document.createElement('div');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        host.appendChild(svg); document.body.appendChild(host);
        const map = new VerticalMarkmap(svg, transformWithParagraphs('# Root\n\n- Child').root,
            { font: '16px sans-serif', padding: 0, gapX: 80, gapY: 40, nodeMinHeight: 16 });
        map.translateBy(70, -35);
        const viewport = svg.querySelector('g')!;
        const center = () => {
            const values = viewport.getAttribute('transform')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
            return [(400 - values[0]) / values[2], (300 - values[1]) / values[2]];
        };
        const before = center(), initial = map.getScale();
        const remove = createZoomControls(svg, () => map.getScale(), factor => map.rescale(factor), () => map.fit());
        (host.querySelector('[aria-label="放大"]') as HTMLButtonElement).click();
        expect(map.getScale()).to.be.closeTo(initial * 1.2, 1e-8);
        center().forEach((value, i) => expect(value).to.be.closeTo(before[i], 1e-8));
        (host.querySelector('[aria-label="缩小"]') as HTMLButtonElement).click();
        expect(map.getScale()).to.be.closeTo(initial, 1e-8);
        map.rescale(1.5); await Promise.resolve();
        expect(host.querySelector('[aria-label="当前缩放比例"]')!.textContent).to.equal(`${Math.round(map.getScale() * 100)}%`);
        (host.querySelector('[aria-label="适配画布"]') as HTMLButtonElement).click();
        expect(map.getScale()).to.be.closeTo(initial, 1e-8);
        remove(); map.destroy();
        expect(host.querySelector('.mm-zoom-controls')).to.equal(null);
        expect(host.style.position).to.equal('');
        host.remove();
    });
});

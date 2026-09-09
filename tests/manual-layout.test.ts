import { expect } from 'chai';
import { Markmap } from 'markmap-view';
import { bindNodeDragging, identifyNodes, Positions } from '../src/manual-layout';
import { useEndpointControls } from '../src/horizontal-endpoints';
import { transformWithParagraphs, toggleParagraphContent } from '../src/markdown-transform';
import { VerticalMarkmap } from '../src/vertical-markmap';

describe('manual node layout', () => {
    for (const direction of ['horizontal', 'vertical']) {
        it(`${direction}: moves nodes and links, retains folds, and restores automatic positions without zooming`, () => {
            const root = transformWithParagraphs('# Root\n\nBody\n\n- Child\n  - Grandchild').root;
            identifyNodes(root);
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            document.body.appendChild(svg);
            const positions: Positions = new Map();
            let paint: () => void, refresh: () => void, destroy: () => void;
            if (direction === 'horizontal') {
                const map = new Markmap(svg, { duration: 0, autoFit: false });
                paint = useEndpointControls(map, positions);
                map.setData(root);
                refresh = () => map.setData(root);
                destroy = () => map.svg.on('.zoom', null);
            } else {
                const map = new VerticalMarkmap(svg, root, { font: '16px sans-serif', padding: 0, gapX: 80, gapY: 40, nodeMinHeight: 16 }, positions);
                paint = () => map.redrawManual(); refresh = () => map.refresh(); destroy = () => map.destroy();
            }
            const node = () => svg.querySelector('[data-node-id="root-0"]')!;
            const original = node().getAttribute('transform');
            const viewport = svg.querySelector('g')!;
            const camera = viewport.getAttribute('transform');
            const links = () => Array.from(svg.querySelectorAll('path')).map(p => p.getAttribute('d')).join('|');
            const originalLinks = links();
            positions.set('root-0', { x: -120, y: 250 }); paint();
            expect(node().getAttribute('transform')).to.equal('translate(-120,250)');
            expect(links()).not.to.equal(originalLinks);
            toggleParagraphContent(root, 0, direction === 'vertical'); refresh();
            expect(node().getAttribute('transform')).to.equal('translate(-120,250)');
            toggleParagraphContent(root, 0, direction === 'vertical'); refresh();
            positions.clear(); paint();
            expect(node().getAttribute('transform')).to.equal(original);
            expect(viewport.getAttribute('transform')).to.equal(camera);
            destroy(); svg.remove();
        });
    }
    it('converts pointer movement by zoom and leaves buttons untouched', () => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.innerHTML = '<g data-node-id="root" transform="translate(10,20)"><foreignObject><div>Label<button>Toggle</button></div></foreignObject></g>';
        const positions: Positions = new Map();
        let paints = 0;
        const remove = bindNodeDragging(svg, positions, () => 2, () => { paints++; });
        const send = (target: Element, type: string, x: number, y: number) => target.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 }));
        send(svg.querySelector('button')!, 'pointerdown', 0, 0);
        send(svg, 'pointermove', 40, 60);
        expect(paints).to.equal(0);
        send(svg.querySelector('div')!, 'pointerdown', 0, 0);
        send(svg, 'pointermove', 40, 60);
        expect(positions.get('root')).to.deep.equal({ x: 30, y: 50 });
        send(svg, 'pointerup', 40, 60);
        send(svg, 'pointermove', 100, 100);
        expect(paints).to.equal(1);
        remove();
    });
});

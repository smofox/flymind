import { expect } from 'chai';
import { layoutVertical, VerticalNode } from '../src/vertical-layout';

const leaf = (id: string, width = 100, height = 30): VerticalNode => ({ id, width, height });
describe('top-to-bottom layout', () => {
    it('places all children below the tallest node at the preceding depth', () => {
        const root = { ...leaf('root'), children: [
            { ...leaf('a', 300, 160), children: [leaf('aa')] },
            { ...leaf('b'), children: [leaf('bb', 400)] }
        ] };
        const { nodes } = layoutVertical(root, 30, 60);
        const at = (id: string) => nodes.find(n => n.id === id)!;
        expect(at('a').y).to.equal(at('root').y + 30 + 60);
        expect(at('aa').y).to.equal(at('a').y + 160 + 60);
        expect(at('bb').y).to.equal(at('aa').y);
        expect(at('aa').x + at('aa').width + 30).to.be.at.most(at('bb').x);
    });
    it('reserves room for wide parents and excludes collapsed descendants', () => {
        const { nodes, edges } = layoutVertical({ ...leaf('root'), children: [
            { ...leaf('wide', 700), collapsed: true, children: [leaf('hidden')] }, leaf('next')
        ] }, 40, 50);
        expect(nodes.map(n => n.id)).not.to.include('hidden');
        expect(edges).to.have.length(2);
        expect(nodes[1].x + 700 + 40).to.be.at.most(nodes[2].x);
    });
    it('handles a single-node map and centers parents above their subtrees', () => {
        const only = layoutVertical(leaf('root', 200, 80), 30, 50);
        expect(only.width).to.equal(200);
        expect(only.height).to.equal(80);
        expect(only.edges).to.deep.equal([]);
        const map = layoutVertical({ ...leaf('root', 80), children: [leaf('a'), leaf('b')] }, 40, 50);
        expect(map.nodes[0].x + 40).to.equal(map.width / 2);
    });
});

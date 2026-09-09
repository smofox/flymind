import { expect } from 'chai';
import { setSafeHTML } from '../src/safe-html';
import { transformWithParagraphs } from '../src/markdown-transform';

describe('Markdown HTML boundary', () => {
    it('removes executable markup before rendering while preserving text and safe links', () => {
        const div = createDiv();
        setSafeHTML(div, '<img src="x" onerror="alert(1)"><script>alert(1)</script><a href="javascript:alert(1)">bad</a><a href="https://example.com">good</a>');
        expect(div.querySelector('script')).to.equal(null);
        expect(div.querySelector('img')!.hasAttribute('onerror')).to.equal(false);
        expect(div.querySelector('a')!.hasAttribute('href')).to.equal(false);
        expect(div.querySelectorAll('a')[1].getAttribute('href')).to.equal('https://example.com');
    });
    it('sanitizes the initial tree before Markmap creates measurement nodes', () => {
        const root = transformWithParagraphs('# Root\n\n<img src="x" onerror="alert(1)">\n\n- Child').root;
        const visit = (node: typeof root) => { expect(node.v).not.to.include('onerror'); (node.c || []).forEach(visit); };
        visit(root);
        expect(root.v).to.include('mm-node-body-toggle');
    });
});

import { builtInPlugins, ITransformPlugin, setPlugins, transform } from 'markmap-lib';
import { MindNode as INode } from './node-types';
import MarkdownIt from 'markdown-it';
import { markmapColors } from './markmap-style';
import { bodyFoldIcon } from './fold-icons';
import { safeHTML, setSafeHTML } from './safe-html';

const CONTENT = 'mindmap_content';
interface Token { type: string; }
interface Frame { kind: string; hasLabel: boolean; content: boolean; }

/** Keep paragraphs through Markmap's cleanup, except the first paragraph that labels a list item. */
function retainParagraphs(state: { tokens: Token[] }) {
    const stack: Frame[] = [];
    state.tokens.forEach(token => {
        const original = token.type;
        const parent = stack[stack.length - 1];
        if (original === 'fence' && parent?.kind === 'list_item') parent.hasLabel = true;
        if (original.endsWith('_open')) {
            const firstListParagraph = original === 'paragraph_open'
                && parent?.kind === 'list_item' && !parent.hasLabel;
            if (firstListParagraph) parent.hasLabel = true;
            const content = original === 'paragraph_open' && !firstListParagraph;
            stack.push({ kind: original.slice(0, -5), hasLabel: false, content });
            if (content) token.type = `${CONTENT}_open`;
        } else if (original.endsWith('_close')) {
            const frame = stack.pop();
            if (frame?.content) token.type = `${CONTENT}_close`;
        }
    });
}

const configuredParsers = new WeakSet<object>();
const paragraphs: ITransformPlugin = {
    name: 'node-paragraphs',
    transform(hooks) {
        // markmap-lib 0.10 uses the old Hook type declaration; its runtime tap API is unchanged.
        const parser = hooks.parser as unknown as { tap(fn: (md: MarkdownIt) => void): void };
        parser.tap(md => {
            if (!configuredParsers.has(md)) {
                md.core.ruler.after('inline', 'mindmap_node_paragraphs', retainParagraphs);
                configuredParsers.add(md);
            }
            // An unlabelled fence needs no language loading or syntax-highlighter warning.
            const highlight = md.options.highlight;
            md.set({ highlight: (code: string, lang: string, attrs: string) => lang && highlight ? highlight(code, lang, attrs) : '' });
        });
        return {};
    }
};
setPlugins([...builtInPlugins, paragraphs]);

function contentHTML(title: string, bodies: string[], id: number): string {
    // Inline dimensions also apply to Markmap's off-screen measurement container.
    const toggle = `<button type="button" class="mm-node-body-toggle" data-body-id="${id}" aria-expanded="true" aria-label="收起正文" title="收起正文" style="position:absolute;left:12px;top:50%;transform:translate(-50%,-50%);display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;font:inherit;font-size:15px;font-weight:700;line-height:1;color:#267e4d;background:var(--background-primary,#fff);border:1.5px solid currentColor;border-radius:50%;box-shadow:none;padding:0;cursor:pointer;z-index:1">${bodyFoldIcon(false)}</button>`;
    const heading = title ? `<div class="mm-node-heading" style="margin-bottom:6px"><div class="mm-node-title" style="font-weight:600">${title}</div></div>` : '';
    const body = bodies.map(value => `<p class="mm-node-paragraph" style="margin:0">${value}</p>`).join('<div style="height:8px"></div>');
    return `<div class="mm-node-shell" style="position:relative;display:inline-flex;align-items:center;vertical-align:middle;padding-left:30px;min-height:20px"><div class="mm-node-card" style="box-sizing:border-box;width:320px;white-space:normal;overflow-wrap:anywhere;text-align:left;border:1px solid var(--background-modifier-border,#cbd5e1);border-radius:8px;padding:8px 12px;background:var(--background-primary,#fff)">${heading}<div class="mm-node-body" style="font-size:.9em;line-height:1.45">${body}</div></div>${toggle}</div>`;
}

function mergeParagraphs(node: INode, nextId: () => number) {
    if (node.t === CONTENT) {
        node.t = 'paragraph';
        const id = nextId();
        node.p = { ...node.p, paragraphId: id };
        node.v = contentHTML('', [node.v], id);
    }
    const body = (node.c || []).filter(child => child.t === CONTENT);
    const remaining = (node.c || []).filter(child => child.t !== CONTENT);
    if (body.length) {
        const values = body.map(child => child.v).filter(value => value.trim());
        if (values.length) {
            const id = nextId();
            node.p = { ...node.p, paragraphId: id };
            node.v = contentHTML(node.v || '', values, id);
        }
        if (body.some(child => child.p?.f)) node.p = { ...node.p, f: true };
    }
    const children: INode[] = [];
    remaining.forEach(child => {
        mergeParagraphs(child, nextId);
        // Paragraph placeholders may have prevented Markmap from unwrapping a list container.
        if (!child.v && (child.t === 'bullet_list' || child.t === 'ordered_list')) children.push(...(child.c || []));
        else children.push(child);
    });
    if (children.length) node.c = children;
    else delete node.c;
}

export function transformWithParagraphs(markdown: string) {
    const result = transform(markdown) as ReturnType<typeof transform> & { root: INode };
    let paragraphId = 0;
    mergeParagraphs(result.root, () => paragraphId++);
    const sanitize = (node: INode) => { node.v = safeHTML(node.v); (node.c || []).forEach(sanitize); };
    sanitize(result.root);
    return result;
}

/** Update the current rendered HTML so resolved note links and both renderers share the same state. */
export function toggleParagraphContent(root: INode, id: number, bordered = true): boolean {
    if (root.p?.paragraphId === id) {
        const container = createDiv();
        setSafeHTML(container, root.v);
        const body = container.querySelector<HTMLElement>('.mm-node-body');
        const button = container.querySelector<HTMLButtonElement>('.mm-node-body-toggle');
        if (!body || !button) return false;
        const collapsed = button.getAttribute('aria-expanded') === 'true';
        body.setCssStyles({ display: collapsed ? 'none' : '' });
        const card = container.querySelector<HTMLElement>('.mm-node-card');
        const heading = container.querySelector<HTMLElement>('.mm-node-heading');
        if (card) {
            card.setCssStyles({ width: collapsed ? 'max-content' : '320px', maxWidth: '320px', padding: collapsed ? '0' : '8px 12px' });
            setCardBorder(card, bordered && !collapsed);
        }
        if (heading) heading.setCssStyles({ marginBottom: collapsed ? '0' : '6px' });
        const shell = container.querySelector<HTMLElement>('.mm-node-shell');
        if (shell) shell.setCssStyles({ paddingTop: !bordered && collapsed ? '14px' : '0', paddingBottom: !bordered && collapsed ? '14px' : '0' });
        button.setCssStyles({ color: collapsed ? '#c14444' : '#267e4d' });
        button.setAttribute('aria-expanded', String(!collapsed));
        setSafeHTML(button, bodyFoldIcon(collapsed));
        button.setAttribute('aria-label', collapsed ? '展开正文' : '收起正文');
        button.title = collapsed ? '展开正文' : '收起正文';
        root.v = container.innerHTML;
        return true;
    }
    return (root.c || []).some(child => toggleParagraphContent(child, id, bordered));
}

function setCardBorder(card: HTMLElement, visible: boolean, color = card.dataset.borderColor || '#1f77b4') {
    // Reset all border longhands together: changing only width can lose the variable-color shorthand.
    card.setCssStyles({ border: '', borderWidth: visible ? '1px' : '0', borderStyle: visible ? 'dashed' : 'none' });
    card.dataset.borderColor = color;
    card.setCssStyles({ borderColor: color, background: visible ? 'var(--background-primary, #fff)' : 'transparent' });
}

export function applyParagraphAppearance(root: INode, bordered: boolean) {
    const colors = markmapColors(root);
    const visit = (node: INode) => {
        if (node.p?.paragraphId !== undefined) {
            const container = createDiv();
            setSafeHTML(container, node.v);
            const card = container.querySelector<HTMLElement>('.mm-node-card');
            const button = container.querySelector('.mm-node-body-toggle');
            const shell = container.querySelector<HTMLElement>('.mm-node-shell');
            if (card && button) {
                const collapsed = button.getAttribute('aria-expanded') !== 'true';
                setCardBorder(card, bordered && !collapsed, colors.get(node));
                if (shell) shell.setCssStyles({ paddingTop: !bordered && collapsed ? '14px' : '0', paddingBottom: !bordered && collapsed ? '14px' : '0' });
                node.v = container.innerHTML;
            }
        }
        (node.c || []).forEach(visit);
    };
    visit(root);
}

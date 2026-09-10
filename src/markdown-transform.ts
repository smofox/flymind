import { MindNode as INode } from './node-types';
import MarkdownIt from 'markdown-it';
import { markmapColors } from './markmap-style';
import { bodyFoldIcon } from './fold-icons';
import { safeHTML, setSafeHTML } from './safe-html';

function contentHTML(title: string, bodies: string[], id: number): string {
    // Inline dimensions also apply to Markmap's off-screen measurement container.
    const toggle = `<button type="button" class="mm-node-body-toggle" data-body-id="${id}" aria-expanded="true" aria-label="收起正文" title="收起正文" style="position:absolute;left:12px;top:50%;transform:translate(-50%,-50%);display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;font:inherit;font-size:15px;font-weight:700;line-height:1;color:#267e4d;background:var(--background-primary,#fff);border:1.5px solid currentColor;border-radius:50%;box-shadow:none;padding:0;cursor:pointer;z-index:1">${bodyFoldIcon(false)}</button>`;
    const heading = title ? `<div class="mm-node-heading" style="margin-bottom:6px"><div class="mm-node-title" style="font-weight:600">${title}</div></div>` : '';
    const body = bodies.map(value => `<div class="mm-node-paragraph" style="margin:0">${value}</div>`).join('<div style="height:8px"></div>');
    const plain = createDiv();
    setSafeHTML(plain, body);
    plain.querySelectorAll('p,div,li,tr,br,blockquote,pre').forEach(el => el.appendChild(document.createTextNode(' ')));
    const text = (plain.textContent || '').replace(/\s+/g, ' ').trim();
    const chars = Array.from(text);
    const summary = createDiv();
    summary.textContent = chars.slice(0, 140).join('') + (chars.length > 140 ? '…' : '');
    return `<div class="mm-node-shell" style="position:relative;display:inline-flex;align-items:center;vertical-align:middle;padding-left:30px;min-height:20px"><div class="mm-node-card" style="box-sizing:border-box;width:320px;white-space:normal;overflow-wrap:anywhere;text-align:left;border:1px solid var(--background-modifier-border,#cbd5e1);border-radius:8px;padding:8px 12px;background:var(--background-primary,#fff)">${heading}<div class="mm-node-body" style="font-size:.9em;line-height:1.45;max-height:5.8em;overflow:hidden;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical">${summary.innerHTML}</div><div class="mm-full-body" style="display:none">${body}</div></div>${toggle}</div>`;
}


/** Only document headings form branches; all other blocks remain intact body HTML. */
export function transformWithParagraphs(markdown: string, rootTitle?: string) {
    const parser = new MarkdownIt({ html: true, breaks: false });
    const env = {};
    const tokens = parser.parse(markdown, env);
    const root: INode = { t: 'heading', d: 0, v: rootTitle ? parser.utils.escapeHtml(rootTitle) : '', p: {}, c: [] };
    const stack = [{ level: 0, node: root }];
    let current = root;
    let bodyStart = 0;
    let paragraphId = 0;
    const attach = (end: number) => {
        const html = parser.renderer.render(tokens.slice(bodyStart, end), parser.options, env);
        if (html.trim()) {
            const id = paragraphId++;
            current.p = { ...current.p, paragraphId: id };
            current.v = contentHTML(current.v, [html], id);
        }
    };
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        // Headings inside quotes or list items belong to that content block.
        if (token.type !== 'heading_open' || token.level !== 0) continue;
        attach(i);
        const level = Number(token.tag.slice(1));
        while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();
        const title = tokens[i + 1];
        const node: INode = {
            t: 'heading', d: stack.length,
            v: parser.renderer.renderInline(title.children || [], parser.options, env),
            p: /<!--\s*fold\s*-->/.test(title.content) ? { f: true } : {}, c: []
        };
        stack[stack.length - 1].node.c.push(node);
        stack.push({ level, node });
        current = node;
        i += 2;
        bodyStart = i + 1;
    }
    attach(tokens.length);
    // Standalone callers without a filename can use the sole document heading.
    const result = !rootTitle && !root.v && root.c.length === 1 ? root.c[0] : root;
    const sanitize = (node: INode) => {
        node.v = safeHTML(node.v);
        (node.c || []).forEach(sanitize);
    };
    sanitize(result);
    return { root: result };
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
        body.setCssStyles({ display: collapsed ? 'none' : body.dataset.scrollable === 'true' ? 'block' : '-webkit-box' });
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

/** Mixed states collapse together; once all bodies are hidden, expand together. */
export function bodyState(root: INode): { id: number; expanded: boolean }[] {
    const states: { id: number; expanded: boolean }[] = [];
    const visit = (node: INode) => {
        if (node.p?.paragraphId !== undefined) {
            const container = createDiv();
            setSafeHTML(container, node.v);
            states.push({ id: node.p.paragraphId, expanded: container.querySelector('.mm-node-body-toggle')?.getAttribute('aria-expanded') === 'true' });
        }
        (node.c || []).forEach(visit);
    };
    visit(root);
    return states;
}

export function toggleAllBodies(root: INode, bordered: boolean) {
    const states = bodyState(root);
    const collapse = states.some(state => state.expanded);
    states.forEach(state => {
        if (state.expanded === collapse) toggleParagraphContent(root, state.id, bordered);
    });
}

/** Switch presentation without changing the canonical body or its fold state. */
export function applyBodyDisplay(root: INode, scrolling: boolean) {
    const visit = (node: INode) => {
        const container = createDiv();
        setSafeHTML(container, node.v);
        const body = container.querySelector<HTMLElement>('.mm-node-body');
        const full = container.querySelector<HTMLElement>('.mm-full-body');
        const button = container.querySelector('.mm-node-body-toggle');
        const title = container.querySelector<HTMLElement>('.mm-node-title');
        if (title) title.setCssStyles({ cursor: 'pointer' });
        if (body && full) {
            if (scrolling) setSafeHTML(body, full.innerHTML);
            else {
                const plain = full.cloneNode(true) as HTMLElement;
                plain.querySelectorAll('p,div,li,tr,br,blockquote,pre').forEach(el => el.appendChild(document.createTextNode(' ')));
                const chars = Array.from((plain.textContent || '').replace(/\s+/g, ' ').trim());
                body.textContent = chars.slice(0, 140).join('') + (chars.length > 140 ? '…' : '');
            }
            body.dataset.scrollable = String(scrolling);
            body.setCssStyles({ maxHeight: scrolling ? '360px' : '5.8em', overflow: scrolling ? 'auto' : 'hidden',
                display: button?.getAttribute('aria-expanded') === 'false' ? 'none' : scrolling ? 'block' : '-webkit-box',
                overscrollBehavior: 'contain', userSelect: scrolling ? 'text' : '' });
        }
        node.v = container.innerHTML;
        (node.c || []).forEach(visit);
    };
    visit(root);
}

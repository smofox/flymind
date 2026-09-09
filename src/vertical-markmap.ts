import { MindNode as INode } from './node-types';
import { layoutVertical, VerticalNode, VerticalLayout } from './vertical-layout';
import { markmapColors, markmapLinkWidth } from './markmap-style';
import { centerOf, keepScreenPoint } from './viewport-anchor';
import { createExpandHint } from './fold-icons';
import { Positions } from './manual-layout';
import { setSafeHTML } from './safe-html';

const SVG_NS = 'http://www.w3.org/2000/svg';
export interface VerticalOptions {
    font: string;
    nodeMinHeight: number;
    gapX: number;
    gapY: number;
    padding: number;
}
function svgElement<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
    return document.createElementNS(SVG_NS, tag);
}

/** Top-down layout with upright HTML labels; the horizontal renderer remains Markmap. */
export class VerticalMarkmap {
    private viewport = svgElement('g');
    private colors: WeakMap<INode, string>;
    private layout: VerticalLayout;
    private scale = 1;
    private offset = { x: 0, y: 0 };
    private drag: { x: number; y: number; ox: number; oy: number };
    private cleanup: (() => void)[] = [];
    redrawManual: () => void = () => {};
    getScale() { return this.scale; }
    rescale(factor: number) {
        const rect = this.svg.getBoundingClientRect();
        const x = (rect.width || 800) / 2, y = (rect.height || 600) / 2;
        const next = Math.max(.02, Math.min(8, this.scale * factor));
        this.offset = { x: x - (x - this.offset.x) * next / this.scale,
            y: y - (y - this.offset.y) * next / this.scale };
        this.scale = next;
        this.applyTransform();
    }

    constructor(private svg: SVGElement, private root: INode, private options: VerticalOptions, private manual: Positions = new Map()) {
        this.colors = markmapColors(root);
        svg.classList.add('mindmap-vertical');
        svg.setCssStyles({ touchAction: 'none' });
        const style = svgElement('style');
        style.textContent = `.mindmap-vertical .mm-label { display: inline-block; max-width: 360px;
            white-space: normal; overflow-wrap: anywhere; text-align: center; font: ${options.font}; }
            .mindmap-vertical .mm-label pre { white-space: pre-wrap; margin: 0; }
            .mindmap-vertical .mm-label code { font-size: .9em; }
            .mindmap-vertical .mm-label a { color: var(--link-color, #479acc); }
            .mindmap-vertical .mm-node { cursor: default; }
            .mindmap-vertical .mm-branch-toggle { cursor: pointer; }
            .mindmap-vertical .mm-node:focus { outline: none; }
            .mindmap-vertical .mm-node:focus > rect { stroke-width: 2; }`;
        svg.appendChild(style);
        svg.appendChild(this.viewport);
        this.listen('wheel', (event: WheelEvent) => {
            event.preventDefault();
            const rect = svg.getBoundingClientRect();
            const x = event.clientX - rect.left, y = event.clientY - rect.top;
            const next = Math.max(.02, Math.min(8, this.scale * Math.exp(-event.deltaY * .002)));
            this.offset = { x: x - (x - this.offset.x) * next / this.scale,
                y: y - (y - this.offset.y) * next / this.scale };
            this.scale = next;
            this.applyTransform();
        }, { passive: false });
        this.listen('pointerdown', (event: PointerEvent) => {
            if (event.button !== 0 || (event.target as Element).closest('.mm-node, a')) return;
            this.drag = { x: event.clientX, y: event.clientY, ox: this.offset.x, oy: this.offset.y };
            svg.setPointerCapture(event.pointerId);
        });
        this.listen('pointermove', (event: PointerEvent) => {
            if (!this.drag) return;
            this.offset = { x: this.drag.ox + event.clientX - this.drag.x,
                y: this.drag.oy + event.clientY - this.drag.y };
            this.applyTransform();
        });
        this.listen('pointerup', () => { this.drag = undefined; });
        this.listen('pointercancel', () => { this.drag = undefined; });
        this.render();
        this.fit();
    }

    private listen<K extends keyof SVGElementEventMap>(type: K, handler: (event: SVGElementEventMap[K]) => void, options?: AddEventListenerOptions) {
        this.svg.addEventListener(type, handler, options);
        this.cleanup.push(() => this.svg.removeEventListener(type, handler, options));
    }

    private render() {
        this.viewport.textContent = '';
        const groups = new Map<string, SVGGElement>();
        const dataNodes = new Map<string, INode>();
        const borderInsets = new Map<string, number>();
        const padding = this.options.padding;
        const measure = (data: INode, id: string): VerticalNode => {
            const group = svgElement('g');
            group.setAttribute('class', 'mm-node');
            group.setAttribute('data-node-id', id);
            const fo = svgElement('foreignObject');
            const div = createDiv();
            div.className = 'mm-label';
            setSafeHTML(div, data.v);
            fo.appendChild(div);
            fo.setAttribute('width', '360');
            fo.setAttribute('height', '10000');
            group.appendChild(fo);
            this.viewport.appendChild(group);
            // offset dimensions are not affected by the current SVG pan/zoom transform.
            // Leave room for fractional glyph widths before measuring the final wrapped height.
            const width = Math.max(30, div.offsetWidth || 100) + padding * 2 + 2;
            fo.setAttribute('width', String(width - padding * 2));
            const bodyToggle = div.querySelector<HTMLButtonElement>('.mm-node-body-toggle');
            const compact = bodyToggle?.getAttribute('aria-expanded') === 'false';
            const labelInset = compact ? 20 : 8;
            const height = Math.max(this.options.nodeMinHeight, div.offsetHeight || 20) + labelInset * 2;
            fo.setAttribute('x', String(padding));
            fo.setAttribute('y', String(labelInset));
            fo.setAttribute('width', String(width - padding * 2));
            fo.setAttribute('height', String(height - labelInset * 2));
            const color = this.colors.get(data);
            const borderInset = compact ? 0 : bodyToggle ? 8 : 0;
            borderInsets.set(id, borderInset);
            if (!bodyToggle && !compact) {
                const rect = svgElement('rect');
                // Paragraph cards draw their own HTML border to align the body toggle precisely.
                const inset = 0;
                rect.setAttribute('x', String(inset));
                rect.setAttribute('width', String(width - inset));
                rect.setAttribute('height', String(height));
                rect.setAttribute('rx', '8');
                rect.setAttribute('fill', 'var(--background-primary, #fff)');
                rect.setAttribute('stroke', color);
                rect.setAttribute('stroke-dasharray', '4 3');
                group.insertBefore(rect, fo);
            }
            group.setAttribute('aria-label', div.textContent || 'Mind map node');
            const hasChildren = !!data.c?.length;
            const folded = !!data.p?.f;
            if (hasChildren) group.setAttribute('aria-expanded', String(!folded));
            const addEndpoint = (cy: number, incoming: boolean) => {
                const circle = svgElement('circle');
                circle.setAttribute('cx', String(width / 2));
                circle.setAttribute('cy', String(cy));
                circle.setAttribute('r', '6');
                circle.setAttribute('stroke-width', '1.5');
                circle.setAttribute('fill', hasChildren && folded ? color : '#fff');
                circle.setAttribute('stroke', color);
                circle.setAttribute('class', hasChildren ? 'mm-branch-toggle' : 'mm-endpoint');
                circle.setAttribute('data-endpoint', incoming ? 'incoming' : 'outgoing');
                if (hasChildren) {
                    circle.setAttribute('role', 'button');
                    circle.setAttribute('tabindex', '0');
                    circle.setAttribute('aria-expanded', String(!folded));
                    circle.setAttribute('aria-label', folded ? 'Expand child branches' : 'Collapse child branches');
                    const activate = (event: Event) => {
                        event.stopPropagation();
                        const anchor = centerOf(circle);
                        data.p = { ...data.p, f: !data.p?.f };
                        this.render();
                        const next = this.viewport.querySelector<SVGCircleElement>(`[data-node-id="${id}"] [data-endpoint="${incoming ? 'incoming' : 'outgoing'}"]`);
                        keepScreenPoint(anchor, next, (x, y) => this.translateBy(x, y));
                        next?.focus({ preventScroll: true });
                    };
                    circle.addEventListener('click', activate);
                    circle.addEventListener('keydown', (event: KeyboardEvent) => {
                        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(event); }
                    });
                    if (folded && !incoming) {
                        const hint = createExpandHint(color);
                        hint.setAttribute('transform', `translate(${width / 2},${cy + 22})`);
                        hint.addEventListener('click', activate);
                        hint.addEventListener('keydown', (event: KeyboardEvent) => {
                            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(event); }
                        });
                        group.appendChild(hint);
                    }
                }
                group.appendChild(circle);
            };
            if (id !== 'root') addEndpoint(borderInset, true);
            if (hasChildren) addEndpoint(height - borderInset, false);
            groups.set(id, group);
            dataNodes.set(id, data);
            return { id, width, height: height + (folded && hasChildren ? 32 : 0), collapsed: !!data.p?.f,
                children: data.p?.f ? [] : (data.c || []).map((child, i) =>
                    measure(child, `${id}-${i}`)) };
        };
        const tree = measure(this.root, 'root');
        this.layout = layoutVertical(tree, this.options.gapX, this.options.gapY);
        const automatic = this.layout.nodes.map(node => ({ ...node }));
        const paths = svgElement('g');
        this.viewport.insertBefore(paths, this.viewport.firstChild);
        this.redrawManual = () => {
        this.layout.nodes = automatic.map(node => ({ ...node, ...this.manual.get(node.id) }));
        const positions = new Map(this.layout.nodes.map(node => [node.id, node] as [string, typeof node]));
        paths.textContent = '';
        this.layout.nodes.forEach(node => groups.get(node.id).setAttribute('transform', `translate(${node.x},${node.y})`));
        this.layout.edges.forEach(edge => {
            const from = positions.get(edge.from), to = positions.get(edge.to);
            const sx = from.x + from.width / 2, sy = from.y + from.height - borderInsets.get(edge.from);
            const tx = to.x + to.width / 2, ty = to.y + borderInsets.get(edge.to), mid = (sy + ty) / 2;
            const path = svgElement('path');
            path.setAttribute('d', `M${sx},${sy} C${sx},${mid} ${tx},${mid} ${tx},${ty}`);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', this.colors.get(dataNodes.get(edge.to)));
            path.setAttribute('stroke-width', String(markmapLinkWidth(dataNodes.get(edge.to))));
            paths.appendChild(path);
        });
        };
        this.redrawManual();
        this.applyTransform();
    }

    private applyTransform() {
        this.viewport.setAttribute('transform', `translate(${this.offset.x},${this.offset.y}) scale(${this.scale})`);
    }

    refresh() { this.render(); }

    translateBy(x: number, y: number) {
        this.offset = { x: this.offset.x + x, y: this.offset.y + y };
        this.applyTransform();
    }

    fit() {
        const rect = this.svg.getBoundingClientRect();
        const width = rect.width || 800, height = rect.height || 600;
        const minX = Math.min(...this.layout.nodes.map(n => n.x)), minY = Math.min(...this.layout.nodes.map(n => n.y));
        const extentX = Math.max(...this.layout.nodes.map(n => n.x + n.width)) - minX;
        const extentY = Math.max(...this.layout.nodes.map(n => n.y + n.height)) - minY;
        this.scale = Math.max(.001, Math.min(1, (width - 40) / extentX, (height - 40) / extentY));
        this.offset = { x: (width - extentX * this.scale) / 2 - minX * this.scale,
            y: (height - extentY * this.scale) / 2 - minY * this.scale };
        this.applyTransform();
    }

    destroy() {
        this.cleanup.forEach(remove => remove());
        this.cleanup = [];
        this.drag = undefined;
    }
}

import { Markmap } from 'markmap-view';
import { centerOf, keepScreenPoint } from './viewport-anchor';
import { createExpandHint } from './fold-icons';
import { IMarkmapFlexTreeItem as MarkmapTreeItem } from 'markmap-view/types/types';
import { MindNode } from './node-types';
interface IMarkmapFlexTreeItem extends Omit<MarkmapTreeItem, 'data' | 'parent'> { data: MindNode; parent: IMarkmapFlexTreeItem; }
import { Positions } from './manual-layout';
import { setSafeHTML } from './safe-html';
const NS = 'http://www.w3.org/2000/svg';

/** Preserve the stock layout/colors while limiting branch activation to endpoint circles. */
export function useEndpointControls(map: Markmap, positions: Positions = new Map()) {
    const render = map.renderData.bind(map);
    const position = (node: IMarkmapFlexTreeItem) => positions.get(node.data.p.layoutId)
        || { x: node.y, y: node.x - node.xSize / 2 };
    const redraw = () => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        map.g.selectAll<SVGGElement, IMarkmapFlexTreeItem>('g').filter(function () { return this.parentNode === map.g.node(); })
            .attr('transform', node => {
                const p = position(node);
                minX = Math.min(minX, p.y); minY = Math.min(minY, p.x);
                maxX = Math.max(maxX, p.y + node.xSize);
                maxY = Math.max(maxY, p.x + node.ySizeInner + (node.data.p.f && node.data.c?.length ? 32 : 0));
                return `translate(${p.x},${p.y})`;
            });
        if (Number.isFinite(minX)) Object.assign(map.state, { minX, minY, maxX, maxY });
        map.g.selectAll<SVGPathElement, { source: IMarkmapFlexTreeItem; target: IMarkmapFlexTreeItem }>('path')
            .filter(function () { return this.parentNode === map.g.node(); })
            .attr('d', edge => {
                const a = position(edge.source), b = position(edge.target);
                const sx = a.x + edge.source.ySizeInner, sy = a.y + edge.source.xSize;
                const tx = b.x, ty = b.y + edge.target.xSize, mid = (sx + tx) / 2;
                return `M${sx},${sy} C${mid},${sy} ${mid},${ty} ${tx},${ty}`;
            });
    };
    const bind = () => {
        const groups = map.g.selectAll<SVGGElement, IMarkmapFlexTreeItem>('g')
            .filter(function () { return this.parentNode === map.g.node(); });
        groups.on('click', null).style('cursor', 'default');
        groups.each((node, index, elements) => {
            const group = elements[index];
            group.setAttribute('data-node-id', node.data.p.layoutId || 'root');
            const fo = group.querySelector('foreignObject');
            if (fo) {
                const div = fo.firstElementChild;
                if (div && div.innerHTML !== node.data.v) setSafeHTML(div, node.data.v);
                fo.setAttribute('height', String(node.xSize));
            }
            const outgoing = Array.from(group.children).find(el => el.tagName.toLowerCase() === 'circle') as SVGCircleElement;
            if (outgoing) { outgoing.setAttribute('cx', String(node.ySizeInner)); outgoing.setAttribute('cy', String(node.xSize)); }
            const underline = group.querySelector(':scope > rect');
            if (underline) underline.setAttribute('y', String(node.xSize - Number(underline.getAttribute('height')) / 2));
            let incoming = group.querySelector<SVGGElement>(':scope > .mm-incoming');
            if (node.parent && !incoming) {
                incoming = document.createElementNS(NS, 'g');
                incoming.classList.add('mm-incoming');
                incoming.appendChild(document.createElementNS(NS, 'circle'));
                group.appendChild(incoming);
            }
            const circles: SVGCircleElement[] = outgoing ? [outgoing] : [];
            if (incoming) {
                const circle = incoming.firstElementChild as SVGCircleElement;
                circle.setAttribute('cx', '0');
                circle.setAttribute('cy', String(node.xSize));
                circles.push(circle);
            }
            let expand: (event: Event) => void;
            circles.forEach(circle => {
                const expandable = !!node.data.c?.length;
                circle.setAttribute('r', '6');
                circle.setAttribute('stroke-width', '1.5');
                circle.setAttribute('stroke', map.options.color(node.data));
                circle.setAttribute('fill', expandable && node.data.p?.f ? map.options.color(node.data) : '#fff');
                circle.setAttribute('class', expandable ? 'mm-branch-toggle' : 'mm-endpoint');
                circle.setCssStyles({ cursor: expandable ? 'pointer' : 'default' });
                if (expandable) {
                    circle.setAttribute('role', 'button');
                    circle.setAttribute('tabindex', '0');
                    circle.setAttribute('aria-label', node.data.p?.f ? 'Expand child branches' : 'Collapse child branches');
                    circle.setAttribute('aria-expanded', String(!node.data.p?.f));
                }
                const activate = (event: Event) => {
                    event.stopPropagation();
                    if (!expandable) return;
                    const anchor = centerOf(circle);
                    const isIncoming = circle.parentNode !== group;
                    map.handleClick(event, node);
                    const newGroup = map.g.selectAll<SVGGElement, IMarkmapFlexTreeItem>('g')
                        .filter(function (d) { return this.parentNode === map.g.node() && d.data === node.data; }).node();
                    const next = newGroup?.querySelector<SVGCircleElement>(isIncoming ? ':scope > .mm-incoming > circle' : ':scope > circle');
                    keepScreenPoint(anchor, next, (x, y) => translateHorizontal(map, x, y));
                    next?.focus({ preventScroll: true });
                };
                if (circle === outgoing) expand = activate;
                circle.onclick = activate;
                circle.onkeydown = event => {
                    if (expandable && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault(); activate(event);
                    }
                };
            });
            group.querySelector(':scope > .mm-expand-hint')?.remove();
            if (node.data.p?.f && node.data.c?.length && outgoing) {
                const hint = createExpandHint(map.options.color(node.data));
                hint.setAttribute('transform', `translate(${node.ySizeInner + 22},${node.xSize})`);
                hint.addEventListener('click', expand);
                hint.addEventListener('keydown', (event: KeyboardEvent) => {
                    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); expand(event); }
                });
                group.appendChild(hint);
                // Include the extra marker in an explicitly requested Fit, without changing zoom now.
                map.state.maxY = Math.max(map.state.maxY, node.y + node.ySizeInner + 32);
            }
        });
        redraw();
    };
    map.renderData = origin => {
        // Apply layout attributes synchronously, then compensate the selected endpoint before paint.
        const transition = map.transition.bind(map);
        map.transition = (<T>(selection: T) => selection) as typeof map.transition;
        try { render(origin); } finally { map.transition = transition; }
        bind();
    };
    bind();
    return redraw;
}

export function translateHorizontal(map: Markmap, x: number, y: number) {
    const zoom = map.svg.property('__zoom') as { k: number };
    map.svg.call(selection => map.zoom.translateBy(selection, x / zoom.k, y / zoom.k));
}

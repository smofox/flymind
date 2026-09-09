/** Symmetric strokes avoid font-baseline differences in +/− glyphs. */
export function bodyFoldIcon(collapsed: boolean): string {
    return `<svg data-icon="${collapsed ? 'plus' : 'minus'}" aria-hidden="true" focusable="false" viewBox="0 0 12 12" style="display:block;width:12px;height:12px;flex:none"><path d="M2 6H10${collapsed ? 'M6 2V10' : ''}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`;
}

export function createExpandHint(color: string): SVGGElement {
    const ns = 'http://www.w3.org/2000/svg';
    const group = document.createElementNS(ns, 'g');
    group.setAttribute('class', 'mm-expand-hint');
    group.setAttribute('role', 'button');
    group.setAttribute('tabindex', '0');
    group.setAttribute('aria-label', 'Expand child branches');
    group.setAttribute('aria-expanded', 'false');
    group.style.cursor = 'pointer';
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('r', '7');
    circle.setAttribute('fill', '#fff');
    circle.setAttribute('stroke', color);
    circle.setAttribute('stroke-width', '1.5');
    const plus = document.createElementNS(ns, 'path');
    plus.setAttribute('d', 'M-3 0H3M0-3V3');
    plus.setAttribute('fill', 'none');
    plus.setAttribute('stroke', color);
    plus.setAttribute('stroke-width', '1.5');
    plus.setAttribute('stroke-linecap', 'round');
    group.append(circle, plus);
    return group;
}

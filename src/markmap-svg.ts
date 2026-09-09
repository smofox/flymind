export function createSVG(containerEl: HTMLElement, lineHeight: string): SVGElement {
    removeExistingSVG(containerEl);
    const svg = createSvg('svg');
    svg.classList.add('mindmap-svg');
    svg.setCssStyles({ height: '100%', width: '100%' });
    const style = createSvg('style');
    const { color } = getComputedCss(containerEl);
    style.textContent = `.mindmap-svg div { color: ${color}; line-height: ${lineHeight || '1em'}; }`;
    svg.appendChild(style);
    containerEl.children[1].appendChild(svg);
    return svg;
}

export function removeExistingSVG(containerEl: HTMLElement) {
    containerEl.querySelectorAll('svg.mindmap-svg').forEach(svg => svg.remove());
}

export function getComputedCss(el: HTMLElement) {
    const computed = getComputedStyle(el);
    const color = computed.getPropertyValue('--text-normal') || computed.color || '#333';
    const family = computed.getPropertyValue('--font-text') || computed.getPropertyValue('--default-font') || 'sans-serif';
    return { color, font: `16px ${family}` };
}

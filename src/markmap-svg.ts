export function createSVG(containerEl: HTMLElement, lineHeight: string): SVGElement {
    removeExistingSVG(containerEl);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('mindmap-svg');
    svg.setAttribute('style', 'height: 100%; width: 100%;');
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
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

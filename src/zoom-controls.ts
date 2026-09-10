/** Header controls stay outside the canvas and follow all zoom gestures. */
export function createZoomControls(svg: SVGElement, scale: () => number, zoom: (factor: number) => void, fit: () => void, content?: { toggle: () => void; state: () => { available: boolean; expanded: boolean } }) {
    const host = svg.parentElement;
    const oldPosition = host.style.position;
    if (!oldPosition || oldPosition === 'static') host.setCssStyles({ position: 'relative' });
    const bar = createDiv();
    bar.className = 'mm-zoom-controls';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', '画布缩放');
    bar.setCssStyles({ display: 'inline-flex', alignItems: 'center', gap: '1px', padding: '0', background: 'transparent', color: 'var(--icon-color,var(--text-muted,#666))', flexShrink: '0' });
    const button = (label: string, paths: string, action: () => void, circle = false) => {
        const el = createEl('button');
        el.className = 'clickable-icon';
        el.title = label; el.setAttribute('aria-label', label);
        el.setCssStyles({ width: '24px', minWidth: '24px', height: '24px', padding: '3px', border: '0', boxShadow: 'none', background: 'transparent', color: 'inherit' });
        const icon = createSvg('svg');
        Object.entries({ width: '18', height: '18', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round' }).forEach(([key, value]) => icon.setAttribute(key, value));
        icon.setCssStyles({ width: '18px', height: '18px' });
        const path = createSvg('path'); path.setAttribute('d', paths); icon.appendChild(path);
        if (circle) { const ring = createSvg('circle'); ring.setAttribute('cx', '12'); ring.setAttribute('cy', '12'); ring.setAttribute('r', '9'); icon.appendChild(ring); }
        el.appendChild(icon);
        el.onclick = () => { action(); update(); };
        bar.appendChild(el);
        return el;
    };
    button('缩小', 'M4 12h16', () => zoom(1 / 1.2));
    const percent = createSpan();
    percent.setCssStyles({ minWidth: '38px', textAlign: 'center', fontSize: '13px', fontVariantNumeric: 'tabular-nums' });
    percent.setAttribute('aria-label', '当前缩放比例');
    bar.appendChild(percent);
    button('放大', 'M4 12h16M12 4v16', () => zoom(1.2));
    button('适配画布', 'M12 3v4m0 10v4M3 12h4m10 0h4', fit, true);
    const contentButton = content ? button('折叠全部正文', 'M4 8h16M4 16h16M9 3l3 3 3-3M9 21l3-3 3 3', content.toggle) : undefined;
    const update = () => {
        percent.textContent = `${Math.round(scale() * 100)}%`;
        if (contentButton && content) {
            const state = content.state();
            contentButton.disabled = !state.available;
            contentButton.title = state.expanded ? '折叠全部正文' : '展开全部正文';
            contentButton.setAttribute('aria-label', contentButton.title);
            contentButton.setAttribute('aria-pressed', String(!state.expanded));
            contentButton.querySelector('path').setAttribute('d', state.expanded
                ? 'M4 8h16M4 16h16M9 3l3 3 3-3M9 21l3-3 3 3'
                : 'M4 8h16M4 16h16M9 5l3-3 3 3M9 19l3 3 3-3');
        }
    };
    const observer = new window.MutationObserver(update);
    observer.observe(svg, { subtree: true, attributes: true, childList: true, attributeFilter: ['transform', 'aria-expanded'] });
    const actions = host.parentElement?.querySelector('.view-actions') || host;
    actions.insertBefore(bar, actions.firstChild);
    update();
    return () => { observer.disconnect(); bar.remove(); host.setCssStyles({ position: oldPosition }); };
}

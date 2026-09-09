/** Floating controls stay outside the transformed SVG and follow all zoom gestures. */
export function createZoomControls(svg: SVGElement, scale: () => number, zoom: (factor: number) => void, fit: () => void) {
    const host = svg.parentElement;
    const oldPosition = host.style.position;
    if (!oldPosition || oldPosition === 'static') host.setCssStyles({ position: 'relative' });
    const bar = createDiv();
    bar.className = 'mm-zoom-controls';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', '画布缩放');
    bar.setCssStyles({ position: 'absolute', right: '20px', top: '20px', zIndex: '5', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '12px', background: 'var(--background-primary,#fff)', color: 'var(--text-normal,#333)', boxShadow: '0 3px 18px rgba(0,0,0,.14)' });
    const button = (label: string, paths: string, action: () => void, circle = false) => {
        const el = createEl('button');
        el.className = 'clickable-icon';
        el.title = label; el.setAttribute('aria-label', label);
        el.setCssStyles({ width: '32px', height: '32px', padding: '4px', border: '0', boxShadow: 'none', background: 'transparent', color: 'inherit' });
        const icon = createSvg('svg');
        Object.entries({ width: '24', height: '24', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round' }).forEach(([key, value]) => icon.setAttribute(key, value));
        const path = createSvg('path'); path.setAttribute('d', paths); icon.appendChild(path);
        if (circle) { const ring = createSvg('circle'); ring.setAttribute('cx', '12'); ring.setAttribute('cy', '12'); ring.setAttribute('r', '9'); icon.appendChild(ring); }
        el.appendChild(icon);
        el.onclick = () => { action(); update(); };
        bar.appendChild(el);
    };
    button('缩小', 'M4 12h16', () => zoom(1 / 1.2));
    const percent = createSpan();
    percent.setCssStyles({ minWidth: '52px', textAlign: 'center', fontSize: '16px', fontVariantNumeric: 'tabular-nums' });
    percent.setAttribute('aria-label', '当前缩放比例');
    bar.appendChild(percent);
    button('放大', 'M4 12h16M12 4v16', () => zoom(1.2));
    button('适配画布', 'M12 3v4m0 10v4M3 12h4m10 0h4', fit, true);
    const update = () => { percent.textContent = `${Math.round(scale() * 100)}%`; };
    const observer = new window.MutationObserver(update);
    observer.observe(svg, { subtree: true, attributes: true, attributeFilter: ['transform'] });
    host.appendChild(bar); update();
    return () => { observer.disconnect(); bar.remove(); host.setCssStyles({ position: oldPosition }); };
}

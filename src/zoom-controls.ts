/** Floating controls stay outside the transformed SVG and follow all zoom gestures. */
export function createZoomControls(svg: SVGElement, scale: () => number, zoom: (factor: number) => void, fit: () => void) {
    const host = svg.parentElement!;
    const oldPosition = host.style.position;
    if (!oldPosition || oldPosition === 'static') host.style.position = 'relative';
    const bar = document.createElement('div');
    bar.className = 'mm-zoom-controls';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', '画布缩放');
    bar.style.cssText = 'position:absolute;right:20px;top:20px;z-index:5;display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:12px;background:var(--background-primary,#fff);color:var(--text-normal,#333);box-shadow:0 3px 18px rgba(0,0,0,.14);';
    const button = (label: string, paths: string, action: () => void) => {
        const el = document.createElement('button');
        el.className = 'clickable-icon';
        el.title = label; el.setAttribute('aria-label', label);
        el.style.cssText = 'width:32px;height:32px;padding:4px;border:0;box-shadow:none;background:transparent;color:inherit;';
        el.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">${paths}</svg>`;
        el.onclick = () => { action(); update(); };
        bar.appendChild(el);
    };
    button('缩小', '<path d="M4 12h16"/>', () => zoom(1 / 1.2));
    const percent = document.createElement('span');
    percent.style.cssText = 'min-width:52px;text-align:center;font-size:16px;font-variant-numeric:tabular-nums;';
    percent.setAttribute('aria-label', '当前缩放比例');
    bar.appendChild(percent);
    button('放大', '<path d="M4 12h16M12 4v16"/>', () => zoom(1.2));
    button('适配画布', '<circle cx="12" cy="12" r="9"/><path d="M12 3v4m0 10v4M3 12h4m10 0h4"/>', fit);
    const update = () => { percent.textContent = `${Math.round(scale() * 100)}%`; };
    const observer = new window.MutationObserver(update);
    observer.observe(svg, { subtree: true, attributes: true, attributeFilter: ['transform'] });
    host.appendChild(bar); update();
    return () => { observer.disconnect(); bar.remove(); host.style.position = oldPosition; };
}

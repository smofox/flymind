import { setIcon } from 'obsidian';
import { setSafeHTML } from './safe-html';

/** An unscaled, pane-local reader; node summaries never determine its content. */
export function bindContentDetails(svg: SVGElement) {
    const host = svg.parentElement;
    const panel = createDiv();
    panel.className = 'mm-content-details';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', '节点详情');
    panel.setCssStyles({ display: 'none', position: 'absolute', right: '12px', top: '12px', bottom: '12px', width: '380px', maxWidth: 'calc(100% - 24px)', zIndex: '6', flexDirection: 'column', border: '1px solid var(--background-modifier-border,#ddd)', borderRadius: '12px', background: 'var(--background-primary,#fff)', color: 'var(--text-normal,#333)', boxShadow: '0 4px 22px rgba(0,0,0,.16)', overflow: 'hidden' });
    const header = createDiv();
    header.setCssStyles({ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid var(--background-modifier-border,#ddd)', flexShrink: '0' });
    const title = createDiv();
    title.setCssStyles({ flex: '1', fontWeight: '600', overflowWrap: 'anywhere' });
    const close = createEl('button');
    close.className = 'clickable-icon';
    close.setAttribute('aria-label', '关闭详情');
    close.title = '关闭详情';
    setIcon(close, 'x');
    const body = createDiv();
    body.className = 'mm-content-details-body';
    body.setCssStyles({ padding: '16px', overflow: 'auto', minHeight: '0', flex: '1', lineHeight: '1.6', overflowWrap: 'anywhere', overscrollBehavior: 'contain', userSelect: 'text' });
    header.append(title, close); panel.append(header, body); host.appendChild(panel);
    const hide = () => { panel.setCssStyles({ display: 'none' }); body.replaceChildren(); };
    close.addEventListener('click', hide);
    let start: { x: number; y: number; target: Element };
    let releasedTarget: Element;
    let dragged = false;
    const down = (event: PointerEvent) => {
        releasedTarget = undefined;
        start = event.button === 0 ? { x: event.clientX, y: event.clientY, target: event.target as Element } : undefined;
        dragged = false;
    };
    const up = (event: PointerEvent) => {
        if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) dragged = true;
        releasedTarget = start && !dragged ? start.target : undefined;
        start = undefined;
    };
    const cancel = () => { start = undefined; releasedTarget = undefined; dragged = true; };
    const move = (event: PointerEvent) => { if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 4) dragged = true; };
    const click = (event: MouseEvent) => {
        const original = releasedTarget;
        releasedTarget = undefined;
        if (dragged || event.defaultPrevented) return;
        // Pointer capture retargets click to the SVG even when a title was pressed.
        const target = event.target === svg && original?.isConnected ? original : event.target as Element;
        if (panel.contains(target) || target.closest('button,a,circle,.mm-expand-hint,.mm-zoom-controls')) return;
        const node = target.closest('[data-node-id]');
        if (!node) { hide(); return; }
        const card = node.querySelector('.mm-node-card');
        const heading = target.closest('.mm-node-title');
        if (card ? !heading : !target.closest('foreignObject')) return;
        title.textContent = card?.querySelector('.mm-node-title')?.textContent || '节点详情';
        const full = card?.querySelector('.mm-full-body');
        if (full) setSafeHTML(body, full.innerHTML);
        else body.textContent = node.querySelector('foreignObject')?.textContent || node.textContent || '';
        body.scrollTop = 0;
        panel.setCssStyles({ display: 'flex' });
    };
    // Capture pointer positions before the node-drag handler consumes the event.
    svg.addEventListener('pointerdown', down, true);
    svg.addEventListener('pointermove', move, true);
    svg.addEventListener('pointerup', up, true);
    svg.addEventListener('pointercancel', cancel, true);
    host.addEventListener('click', click);
    return () => {
        svg.removeEventListener('pointerdown', down, true);
        svg.removeEventListener('pointermove', move, true);
        svg.removeEventListener('pointerup', up, true);
        svg.removeEventListener('pointercancel', cancel, true);
        host.removeEventListener('click', click);
        panel.remove();
    };
}

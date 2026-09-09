import { INode } from 'markmap-common';
export type Positions = Map<string, { x: number; y: number }>;
export function identifyNodes(node: INode, id = 'root') {
    node.p = { ...node.p, layoutId: id };
    (node.c || []).forEach((child, i) => identifyNodes(child, `${id}-${i}`));
}

/** Capture content gestures before the canvas pan handler; endpoints remain independent. */
export function bindNodeDragging(svg: SVGElement, positions: Positions, scale: () => number, paint: () => void) {
    let drag: { id: string; pointer: number; x: number; y: number; origin: { x: number; y: number } };
    const content = (event: Event) => {
        const target = event.target as Element;
        if (target.closest('button,a,circle,.mm-expand-hint,input,textarea')) return null;
        return target.closest<SVGGElement>('[data-node-id]');
    };
    const down = (event: PointerEvent) => {
        const node = content(event);
        if (!node || event.button !== 0) return;
        const match = /translate\(([-\d.e]+)[ ,]+([-\d.e]+)\)/i.exec(node.getAttribute('transform') || '');
        if (!match) return;
        event.stopImmediatePropagation();
        event.preventDefault();
        drag = { id: node.dataset.nodeId!, pointer: event.pointerId, x: event.clientX, y: event.clientY,
            origin: { x: Number(match[1]), y: Number(match[2]) } };
        svg.setPointerCapture?.(event.pointerId);
    };
    const move = (event: PointerEvent) => {
        if (!drag || event.pointerId !== drag.pointer) return;
        const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
        if (Math.hypot(dx, dy) < 4) return;
        event.preventDefault();
        positions.set(drag.id, { x: drag.origin.x + dx / scale(), y: drag.origin.y + dy / scale() });
        paint();
    };
    const up = () => { if (drag && svg.hasPointerCapture?.(drag.pointer)) svg.releasePointerCapture(drag.pointer); drag = undefined; };
    const mouse = (event: Event) => { if (content(event)) event.stopImmediatePropagation(); };
    svg.addEventListener('pointerdown', down, true);
    svg.addEventListener('mousedown', mouse, true);
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerup', up);
    svg.addEventListener('pointercancel', up);
    svg.addEventListener('lostpointercapture', up);
    return () => {
        up();
        svg.removeEventListener('pointerdown', down, true);
        svg.removeEventListener('mousedown', mouse, true);
        svg.removeEventListener('pointermove', move);
        svg.removeEventListener('pointerup', up);
        svg.removeEventListener('pointercancel', up);
        svg.removeEventListener('lostpointercapture', up);
    };
}

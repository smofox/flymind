export interface ScreenPoint { x: number; y: number; }
export function centerOf(element: Element): ScreenPoint {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
export function keepScreenPoint(before: ScreenPoint, element: Element, translate: (x: number, y: number) => void) {
    if (!element) return;
    const after = centerOf(element);
    const dx = before.x - after.x, dy = before.y - after.y;
    if (dx || dy) translate(dx, dy);
}

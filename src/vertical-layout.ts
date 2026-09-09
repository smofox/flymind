export interface VerticalNode {
    id: string;
    width: number;
    height: number;
    collapsed?: boolean;
    children?: VerticalNode[];
}
export interface PositionedNode extends VerticalNode { x: number; y: number; }
export interface VerticalLayout {
    nodes: PositionedNode[];
    edges: { from: string; to: string }[];
    width: number;
    height: number;
}
export function layoutVertical(root: VerticalNode, gapX: number, gapY: number): VerticalLayout {
    const spans = new Map<string, number>();
    const levelHeights: number[] = [];
    const visibleChildren = (node: VerticalNode) => node.collapsed ? [] : node.children || [];
    function measure(node: VerticalNode, depth: number): number {
        levelHeights[depth] = Math.max(levelHeights[depth] || 0, node.height);
        const children = visibleChildren(node);
        const childWidth = children.reduce((sum, child) => sum + measure(child, depth + 1), 0)
            + Math.max(0, children.length - 1) * gapX;
        const width = Math.max(node.width, childWidth);
        spans.set(node.id, width);
        return width;
    }
    const width = measure(root, 0);
    const levelY: number[] = [0];
    levelHeights.forEach((height, i) => { levelY[i + 1] = levelY[i] + height + gapY; });
    const nodes: PositionedNode[] = [];
    const edges: VerticalLayout['edges'] = [];
    function place(node: VerticalNode, left: number, depth: number) {
        const span = spans.get(node.id)!;
        nodes.push({ ...node, x: left + (span - node.width) / 2, y: levelY[depth] });
        const children = visibleChildren(node);
        const childWidth = children.reduce((sum, child) => sum + spans.get(child.id)!, 0)
            + Math.max(0, children.length - 1) * gapX;
        let childLeft = left + (span - childWidth) / 2;
        children.forEach(child => {
            edges.push({ from: node.id, to: child.id });
            place(child, childLeft, depth + 1);
            childLeft += spans.get(child.id)! + gapX;
        });
    }
    place(root, 0, 0);
    return { nodes, edges, width, height: levelY[levelHeights.length] - gapY };
}

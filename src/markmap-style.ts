import { INode } from 'markmap-common';

// d3.schemeCategory10, used by markmap-view 0.1.x in full-tree preorder.
const CATEGORY10 = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
export function markmapColors(root: INode): WeakMap<INode, string> {
    const colors = new WeakMap<INode, string>();
    let index = 0;
    const visit = (node: INode) => {
        colors.set(node, CATEGORY10[index++ % CATEGORY10.length]);
        (node.c || []).forEach(visit);
    };
    visit(root);
    return colors;
}
export function markmapLinkWidth(node: INode): number {
    return Math.max(6 - 2 * (node.d ?? 0), 1.5);
}

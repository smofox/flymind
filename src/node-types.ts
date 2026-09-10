import { INode as MarkmapNode } from 'markmap-common';

export interface NodeProperties {
    s?: [number, number];
    paragraphId?: number;
    layoutId?: string;
    f?: boolean | number;
}
export interface MindNode extends Omit<MarkmapNode, 'p' | 'c'> {
    p?: NodeProperties;
    c?: MindNode[];
}

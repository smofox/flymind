import { SplitDirection } from 'obsidian';

export type LayoutDirection = 'horizontal' | 'vertical';

export class MindMapSettings {
    layoutDirection: LayoutDirection = 'horizontal';
    splitDirection: SplitDirection = 'horizontal';
    nodeScrolling: boolean = false;
    nodeMinHeight: number = 16;
    lineHeight: string = '1em';
    spacingVertical: number = 5;
    spacingHorizontal: number = 80;
    paddingX: number = 8;
}
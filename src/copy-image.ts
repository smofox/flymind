import { Notice } from 'obsidian';

export async function copyImageToClipboard(svg: SVGElement) {
    const canvas = createEl('canvas');
    canvas.width = svg.clientWidth;
    canvas.height = svg.clientHeight;
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' }));
    try {
        const image = new Image();
        await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error('Could not render the mind map image.'));
            image.src = url;
        });
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas is unavailable.');
        context.drawImage(image, 0, 0);
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Image export failed.'))));
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        new Notice('Screenshot copied to the clipboard.');
    } catch (error) {
        console.error(error);
        new Notice('Could not copy the screenshot.');
    } finally { URL.revokeObjectURL(url); }
}

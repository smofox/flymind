import { Notice } from 'obsidian';

/** Resolve theme styles before loading the SVG in an isolated image document. */
export function screenshotSource(svg: SVGElement) {
    const clone = svg.cloneNode(true) as SVGElement;
    const rect = svg.getBoundingClientRect();
    const width = Math.round(svg.clientWidth || rect.width);
    const height = Math.round(svg.clientHeight || rect.height);
    if (!width || !height) throw new Error('导图尚未显示，请先打开导图再复制。');
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));
    const originals = [svg, ...Array.from(svg.querySelectorAll('*'))];
    const copies = [clone, ...Array.from(clone.querySelectorAll('*'))];
    originals.forEach((element, index) => {
        const computed = getComputedStyle(element);
        const style = Array.from(computed).map(key => `${key}:${computed.getPropertyValue(key)};`).join('');
        copies[index].setAttribute('style', style);
    });
    clone.querySelectorAll('.mm-full-body').forEach(el => el.remove());
    const xml = new XMLSerializer().serializeToString(clone);
    // A data URL keeps foreignObject content origin-clean for canvas export.
    return { width, height, url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}` };
}

async function renderScreenshot(svg: SVGElement): Promise<Blob> {
    const source = screenshotSource(svg);
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('导图图像转换失败。'));
        image.src = source.url;
    });
    const canvas = createEl('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('无法创建截图画布。');
    context.drawImage(image, 0, 0);
    return new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('无法导出 PNG。')), 'image/png'));
}

export async function copyImageToClipboard(svg: SVGElement) {
    try {
        if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') throw new Error('当前环境不支持复制图片到剪贴板。');
        // Begin the clipboard request while the menu click still has user activation.
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': renderScreenshot(svg) })]);
        new Notice('导图截图已复制。');
    } catch (error) {
        console.error(error);
        new Notice(`截图复制失败：${error instanceof Error ? error.message : String(error)}`);
    }
}

import { sanitizeHTMLToDom } from 'obsidian';

/** Sanitize Markdown-derived markup before either renderer or its measurement DOM sees it. */
export function setSafeHTML(element: Element, html: string) {
    element.replaceChildren(sanitizeHTMLToDom(html));
}

export function safeHTML(html: string): string {
    const container = createDiv();
    setSafeHTML(container, html);
    return container.innerHTML;
}

import MindmapView from '../../src/mindmap-view';
import { MindMapSettings, LayoutDirection } from '../../src/settings';

const md = document.querySelector<HTMLTextAreaElement>('#markdown')!;
const output = document.querySelector<HTMLElement>('#preview')!;
const select = document.querySelector<HTMLSelectElement>('#direction')!;
const status = document.querySelector<HTMLElement>('#status')!;
const source: any = { view: { getViewType: () => 'markdown', file: { path: 'fixture.md', basename: 'Fixture' } } };
const workspace: any = { activeLeaf: source, on: () => ({}), getGroupLeaves: () => [source] };
const app = { workspace, vault: { getName: () => 'Fixture', adapter: { read: async () => md.value } } };
const preview: any = { app, containerEl: output, view: { getViewType: () => 'mindmap' }, on: () => ({}) };
const settings = new MindMapSettings();
settings.layoutDirection = localStorage.getItem('fixture-direction') === 'vertical' ? 'vertical' : 'horizontal';
select.value = settings.layoutDirection;
let view: MindmapView;
async function changeDirection(direction: LayoutDirection) {
    settings.layoutDirection = direction;
    select.value = direction;
    localStorage.setItem('fixture-direction', direction);
    await view.update();
    status.textContent = direction;
}
view = new MindmapView(settings, preview, { path: 'fixture.md', basename: 'Fixture' }, changeDirection, source);
workspace.activeLeaf = preview;
select.onchange = () => { void changeDirection(select.value as LayoutDirection); };
md.oninput = () => { workspace.activeLeaf = source; void view.checkAndUpdate(); };
window.addEventListener('resize', () => { void view.update(); });
void view.onOpen().then(() => { status.textContent = settings.layoutDirection; });

// Exercise each production renderer's real wheel handler without depending on trackpad hardware.
for (const [id, deltaY] of [['zoom-in', -180], ['zoom-out', 180]] as [string, number][]) {
    document.getElementById(id)!.onclick = () => {
        const svg = output.querySelector('svg')!;
        const rect = svg.getBoundingClientRect();
        svg.dispatchEvent(new WheelEvent('wheel', { deltaY, clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2, bubbles: true, cancelable: true }));
    };
}

// Visible diagnostics for real pointer events (after browser auto-scroll, before the plugin handles them).
const trace = document.createElement('output');
trace.id = 'interaction-trace';
trace.style.cssText = 'position:fixed;bottom:0;right:0;background:#fff;font:11px monospace;pointer-events:none;max-width:100%;z-index:10';
document.body.appendChild(trace);
document.addEventListener('click', event => {
    const target = (event.target as Element).closest<HTMLElement>('.mm-node-body-toggle, .mm-branch-toggle');
    if (!target) return;
    const svg = target.closest('svg')!;
    const isBody = target.classList.contains('mm-node-body-toggle');
    const group = isBody ? target.closest('foreignObject')!.parentElement!
        : target.parentElement!.classList.contains('mm-incoming') ? target.parentElement!.parentElement! : target.parentElement!;
    const id = group.querySelector<HTMLElement>('[data-body-id]')?.dataset.bodyId;
    if (id === undefined) return;
    const incoming = target.getAttribute('data-endpoint') === 'incoming' || target.parentElement!.classList.contains('mm-incoming');
    const rect = target.getBoundingClientRect();
    const zoom = () => svg.querySelector('g')!.getAttribute('transform')!.match(/scale\(([^)]+)\)/)![1];
    const k = zoom();
    requestAnimationFrame(() => {
        const bodyButton = svg.querySelector<HTMLElement>(`[data-body-id="${id}"]`)!;
        const newGroup = bodyButton.closest('foreignObject')!.parentElement!;
        const circleSelector = svg.classList.contains('mindmap-vertical')
            ? `[data-endpoint="${incoming ? 'incoming' : 'outgoing'}"]`
            : incoming ? ':scope > .mm-incoming > circle' : ':scope > circle';
        const after = (isBody ? bodyButton : newGroup.querySelector(circleSelector))!.getBoundingClientRect();
        trace.textContent = JSON.stringify({ kind: isBody ? 'body' : 'branch', scaleUnchanged: k === zoom(),
            dx: +(after.x + after.width / 2 - rect.x - rect.width / 2).toFixed(3),
            dy: +(after.y + after.height / 2 - rect.y - rect.height / 2).toFixed(3) });
    });
}, true);

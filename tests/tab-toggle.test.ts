import './helpers/obsidian';
import { expect } from 'chai';
import { TabToggle } from '../src/tab-toggle';
import { MM_VIEW_TYPE } from '../src/constants';

describe('same-tab brain toggle', () => {
    function fixture() {
        let state: any = { type: 'markdown', state: { file: 'note.md', mode: 'source' } };
        let saved = false;
        const header = document.createElement('div');
        header.innerHTML = '<div class="workspace-tab-header-inner"><div class="workspace-tab-header-inner-title">note</div><div class="workspace-tab-header-inner-close-button"></div></div>';
        const leaf: any = { tabHeaderEl: header, view: { getViewType: () => state.type, getState: () => state.state, save: async () => { saved = true; } },
            getViewState: () => state, getEphemeralState: () => ({ scroll: 120 }),
            setViewState: async (next: any) => { expect(saved).to.equal(true); state = next; },
            setEphemeralState: (value: any) => { leaf.restored = value; } };
        const control = new TabToggle({ iterateAllLeaves: (fn: any) => fn(leaf) } as any);
        return { control, leaf, header, state: () => state };
    }
    it('places one brain before close and switches the same leaf back with editor state', async () => {
        const f = fixture();
        f.control.sync(); f.control.sync();
        expect(f.header.querySelectorAll('.mm-tab-toggle').length).to.equal(1);
        expect(f.header.querySelector('.mm-tab-toggle')!.nextElementSibling!.className).to.equal('clickable-icon mm-tab-split');
        expect(f.header.querySelector<HTMLElement>('.mm-tab-controls')!.style.gap).to.equal('1px');
        await f.control.toggle(f.leaf);
        expect(f.state()).to.deep.equal({ type: MM_VIEW_TYPE, state: { file: 'note.md', inline: true }, active: true });
        expect(f.header.querySelector('button')!.getAttribute('aria-pressed')).to.equal('true');
        await f.control.toggle(f.leaf);
        expect(f.state().state).to.deep.equal({ file: 'note.md', mode: 'source' });
        expect(f.leaf.restored).to.deep.equal({ scroll: 120 });
        f.control.destroy();
        expect(f.header.querySelector('button')).to.equal(null);
    });
    it('ignores repeated toggles while saving', async () => {
        const f = fixture();
        let release: () => void;
        const original = f.leaf.view.save;
        f.leaf.view.save = async () => { await new Promise<void>(resolve => { release = resolve; }); await original(); };
        const first = f.control.toggle(f.leaf);
        await f.control.toggle(f.leaf);
        release!(); await first;
        expect(f.state().type).to.equal(MM_VIEW_TYPE);
    });
});

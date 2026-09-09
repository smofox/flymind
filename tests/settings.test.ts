import { expect } from 'chai';
import { MindMapSettings } from '../src/settings';

describe('layout preference', () => {
    it('keeps legacy users horizontal independently of the split direction', () => {
        const settings: any = new MindMapSettings();
        expect(settings.layoutDirection).to.equal('horizontal');
        settings.splitDirection = 'vertical';
        expect(settings.layoutDirection).to.equal('horizontal');
    });
});

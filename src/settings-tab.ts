import {
    App,
    PluginSettingTab,
    SettingDefinitionItem,
    Setting,
    SplitDirection
} from 'obsidian';
import MindMap from './main';
import { LayoutDirection, MindMapSettings } from './settings';

export class MindMapSettingsTab extends PluginSettingTab {
    plugin: MindMap;
    constructor(app: App, plugin: MindMap) {
        super(app, plugin);
        this.plugin = plugin;
    }

    // Newer hosts discover these definitions for search; older hosts keep using display().
    getSettingDefinitions(): SettingDefinitionItem[] {
        return [
            { name: 'Mind map direction', control: { type: 'dropdown', key: 'layoutDirection', options: { horizontal: 'Horizontal (left to right)', vertical: 'Vertical (top to bottom)' } } },
            { name: 'Preview split', control: { type: 'dropdown', key: 'splitDirection', options: { horizontal: 'Horizontal（左右并排）', vertical: 'Vertical（上下排列）' } } },
            { name: 'Node min height', control: { type: 'number', key: 'nodeMinHeight', min: 1 } },
            { name: 'Node text line height', control: { type: 'text', key: 'lineHeight' } },
            { name: 'Vertical spacing', control: { type: 'number', key: 'spacingVertical', min: 0 } },
            { name: 'Horizontal spacing', control: { type: 'number', key: 'spacingHorizontal', min: 0 } },
            { name: 'Horizontal padding', control: { type: 'number', key: 'paddingX', min: 0 } }
        ];
    }

    getControlValue(key: string): unknown { return this.plugin.settings[key as keyof MindMapSettings]; }

    async setControlValue(key: string, value: unknown) {
        if (key === 'layoutDirection' && (value === 'horizontal' || value === 'vertical')) {
            await this.plugin.setLayoutDirection(value);
            return;
        }
        if (key === 'splitDirection' && (value === 'horizontal' || value === 'vertical')) this.plugin.settings.splitDirection = value;
        else if (key === 'lineHeight' && typeof value === 'string') this.plugin.settings.lineHeight = value;
        else if ((key === 'nodeMinHeight' || key === 'spacingVertical' || key === 'spacingHorizontal' || key === 'paddingX') && typeof value === 'number' && Number.isFinite(value) && value >= 0) this.plugin.settings[key] = value;
        else return;
        await this.plugin.saveData(this.plugin.settings);
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();
        new Setting(containerEl).setName(`FlyMind ${this.plugin.manifest.version}`).setHeading();
        containerEl.createEl('p', { text: `作者：${this.plugin.manifest.author || ''}` });
        containerEl.createEl('p', { text: '将 Markdown 笔记变为可交互的思维导图：同标签切换、水平／垂直布局、正文与分支独立折叠、自由拖动、自动排列和焦点缩放。' });

        new Setting(containerEl)
            .setName('Mind map direction')
            .setDesc('Direction of the map itself; independent of the preview pane split.')
            .addDropdown(dropDown => dropDown
                .addOption('horizontal', 'Horizontal (left to right)')
                .addOption('vertical', 'Vertical (top to bottom)')
                .setValue(this.plugin.settings.layoutDirection)
                .onChange((value: string) => this.plugin.setLayoutDirection(value as LayoutDirection)));

        new Setting(containerEl)
            .setName('Preview split')
            .setDesc('左右并排或上下排列。仅影响新建预览窗格，不改变导图方向。')
            .addDropdown(dropDown =>
                dropDown
                    .addOption('horizontal', 'Horizontal（左右并排）')
                    .addOption('vertical', 'Vertical（上下排列）')
                    .setValue(this.plugin.settings.splitDirection || 'horizontal')
                    .onChange((value: string) => {
                        this.plugin.settings.splitDirection = value as SplitDirection;
                        void this.plugin.saveData(this.plugin.settings);
                    }));

        new Setting(containerEl)
            .setName('Node min height')
            .setDesc('Minimum height for the mind map nodes')
            .addText(text =>
                text
                    .setValue(this.plugin.settings.nodeMinHeight?.toString())
                    .setPlaceholder('Example: 16')
                    .onChange((value: string) => {
                        this.plugin.settings.nodeMinHeight = Number.parseInt(value);
                        void this.plugin.saveData(this.plugin.settings);
                    }));

        new Setting(containerEl)
            .setName('Node text line height')
            .setDesc('Line height for content in mind map nodes')
            .addText(text =>
                text
                    .setValue(this.plugin.settings.lineHeight?.toString())
                    .setPlaceholder('Example: 1em')
                    .onChange((value: string) => {
                        this.plugin.settings.lineHeight = value;
                        void this.plugin.saveData(this.plugin.settings);
                    }));


        new Setting(containerEl)
            .setName('Vertical spacing')
            .setDesc('Vertical spacing of the mind map nodes')
            .addText(text =>
                text
                    .setValue(this.plugin.settings.spacingVertical?.toString())
                    .setPlaceholder('Example: 5')
                    .onChange((value: string) => {
                        this.plugin.settings.spacingVertical = Number.parseInt(value);
                        void this.plugin.saveData(this.plugin.settings);
                    }));


        new Setting(containerEl)
            .setName('Horizontal spacing')
            .setDesc('Horizontal spacing of the mind map nodes')
            .addText(text =>
                text
                    .setValue(this.plugin.settings.spacingHorizontal?.toString())
                    .setPlaceholder('Example: 80')
                    .onChange((value: string) => {
                        this.plugin.settings.spacingHorizontal = Number.parseInt(value);
                        void this.plugin.saveData(this.plugin.settings);
                    }));

        new Setting(containerEl)
            .setName('Horizontal padding')
            .setDesc('Leading space before the content of mind map nodes')
            .addText(text =>
                text
                    .setValue(this.plugin.settings.paddingX?.toString())
                    .setPlaceholder('Example: 8')
                    .onChange((value: string) => {
                        this.plugin.settings.paddingX = Number.parseInt(value);
                        void this.plugin.saveData(this.plugin.settings);
                    }));
    }
}

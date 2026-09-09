import {
    App,
    PluginSettingTab,
    Setting,
    SplitDirection
} from 'obsidian';
import MindMap from './main';
import { LayoutDirection } from './settings';

export class MindMapSettingsTab extends PluginSettingTab {
    plugin: MindMap;
    constructor(app: App, plugin: MindMap) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl('h2', { text: `FlyMind ${this.plugin.manifest.version}` });
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
            .setName('Preview Split')
            .setDesc('Where to place the preview pane. This does not change the map direction.')
            .addDropdown(dropDown =>
                dropDown
                    .addOption('horizontal', 'Horizontal')
                    .addOption('vertical', 'Vertical')
                    .setValue(this.plugin.settings.splitDirection || 'horizontal')
                    .onChange((value: string) => {
                        this.plugin.settings.splitDirection = value as SplitDirection;
                        this.plugin.saveData(this.plugin.settings);
                    }));

        new Setting(containerEl)
            .setName('Node Min Height')
            .setDesc('Minimum height for the mind map nodes')
            .addText(text =>
                text
                    .setValue(this.plugin.settings.nodeMinHeight?.toString())
                    .setPlaceholder('Example: 16')
                    .onChange((value: string) => {
                        this.plugin.settings.nodeMinHeight = Number.parseInt(value);
                        this.plugin.saveData(this.plugin.settings);
                    }));

        new Setting(containerEl)
            .setName('Node Text Line Height')
            .setDesc('Line height for content in mind map nodes')
            .addText(text =>
                text
                    .setValue(this.plugin.settings.lineHeight?.toString())
                    .setPlaceholder('Example: 1em')
                    .onChange((value: string) => {
                        this.plugin.settings.lineHeight = value;
                        this.plugin.saveData(this.plugin.settings);
                    }));


        new Setting(containerEl)
            .setName('Vertical Spacing')
            .setDesc('Vertical spacing of the mind map nodes')
            .addText(text =>
                text
                    .setValue(this.plugin.settings.spacingVertical?.toString())
                    .setPlaceholder('Example: 5')
                    .onChange((value: string) => {
                        this.plugin.settings.spacingVertical = Number.parseInt(value);
                        this.plugin.saveData(this.plugin.settings);
                    }));


        new Setting(containerEl)
            .setName('Horizontal Spacing')
            .setDesc('Horizontal spacing of the mind map nodes')
            .addText(text =>
                text
                    .setValue(this.plugin.settings.spacingHorizontal?.toString())
                    .setPlaceholder('Example: 80')
                    .onChange((value: string) => {
                        this.plugin.settings.spacingHorizontal = Number.parseInt(value);
                        this.plugin.saveData(this.plugin.settings);
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
                        this.plugin.saveData(this.plugin.settings);
                    }));
    }
}

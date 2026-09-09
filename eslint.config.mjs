import { defineConfig } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default defineConfig([
    { ignores: ['node_modules/**', 'dist/**', 'test-vault/**', 'tests/**', '*.config.js', 'eslint.config.mjs'] },
    ...obsidianmd.configs.recommended,
    { files: ['src/**/*.ts'], languageOptions: { parserOptions: { projectService: true } } }
]);

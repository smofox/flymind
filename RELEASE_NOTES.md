## FlyMind 1.2.3 — type-checking compatibility

- Declare ES2018 library types for named regular-expression groups and Object.entries.
- Enable strict bind/call/apply typing and remove redundant bound-method assertions.
- Preserve the existing runtime behavior and all 1.2.2 review fixes below.

### Included 1.2.2 fixes

- Sanitize Markdown-derived HTML before rendering and off-screen measurement.
- Preserve node content, safe note links, body folding, branch controls, dragging and zoom.
- Use supported Obsidian styling and settings-heading APIs; declare the required minimum app version as 1.1.0.
- Add searchable setting definitions for newer hosts while retaining the existing settings page for older hosts.
- Remove unsafe type flows, handle asynchronous clipboard export failures, and update deprecated split/focus APIs.
- Pin runtime dependencies, update vulnerable d3-color and KaTeX versions, and commit the npm lockfile.
- Add strict Obsidian lint checks and a GitHub build-and-attest release workflow.

Install `main.js` and `manifest.json` in `<vault>/.obsidian/plugins/flymind/`, preserve `data.json`, then reload the plugin. Release assets contain only the files Obsidian installs.

Clipboard access is used only when you explicitly choose **Copy screenshot**. FlyMind does not read clipboard contents.

Community review must be rerun against this version; local checks do not constitute approval by Obsidian.

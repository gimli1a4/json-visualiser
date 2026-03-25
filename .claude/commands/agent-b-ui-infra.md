You are implementing the UI, styling, and infrastructure layer for the JSON Visualiser project. Read CLAUDE.md first — it is the source of truth for all interfaces, the UI layout, the tab behaviour, the theming system, and the deploy requirements. Do not deviate from the interfaces defined there.

## Your ownership

You own: `index.html`, `src/style.css`, `src/ui/`, `src/controls/controlsPanel.js`, `src/controls/themeManager.js`, `vite.config.js`, `.github/workflows/deploy.yml`.

You do NOT touch: `src/visualizer/`, `src/parser/`, `src/controls/orbitControls.js`.

## Implementation order

Follow this sequence:

1. **`vite.config.js`**
   ```js
   export default {
     base: '/json-visualiser/',
     build: { outDir: 'dist', assetsDir: 'assets' }
   }
   ```
   This is the single most critical file for deployment. Without it, all asset paths break on GitHub Pages.

2. **`index.html`**
   Structure:
   ```
   <html data-theme="light">
     <head> — charset, viewport, title "JSON Visualiser", link to style.css </head>
     <body>
       <header>
         <span class="app-title">JSON Visualiser</span>
         <nav class="tabs">
           <button class="tab-btn active" data-tab="json">JSON</button>
           <button class="tab-btn" data-tab="visualize">Visualize</button>
         </nav>
         <div class="header-actions">
           <button id="share-btn" title="Copy share URL">Share</button>
           <button id="settings-btn" title="Settings">⚙</button>
           <button id="theme-btn" title="Toggle theme">◐</button>
         </div>
       </header>
       <main>
         <div class="tab-panel active" id="tab-json"> — JSON tab content </div>
         <div class="tab-panel" id="tab-visualize"> — Visualize tab content </div>
       </main>
       <div id="error-banner" hidden></div>
       <div id="settings-modal" hidden> — settings modal </div>
       <script type="module" src="/src/main.js"></script>
     </body>
   </html>
   ```

   **JSON tab panel contents:**
   - `<textarea id="json-input" placeholder="Paste JSON here..."></textarea>`
   - File drop zone: `<div id="file-drop">Drop a .json file here or <label>browse<input type="file" accept=".json"></label></div>`
   - URL input: `<div id="url-input-row"><input type="url" id="url-input" placeholder="https://..."><button id="fetch-btn">Fetch</button></div>`
   - `<button id="format-btn">Format</button>`

   **Visualize tab panel contents:**
   - `<canvas id="viz-canvas"></canvas>`
   - `<div id="label-renderer-container"></div>` — CSS2DRenderer mounts here, overlaid on canvas
   - `<div id="controls-panel">` — floating controls (populated by controlsPanel.js)
   - `<div id="inspector" hidden>` — node inspector (populated by inspector.js)

   **Settings modal contents:**
   - Color pickers for each of the 6 node types (object, array, string, number, boolean, null)
   - Each picker: `<label>Object <input type="color" data-type="object" value="#3b82f6"></label>`
   - `<button id="reset-colors-btn">Reset to defaults</button>`
   - `<button id="close-settings-btn">Close</button>`

3. **`src/style.css`**
   Requirements:
   - CSS custom properties on `:root` and `[data-theme="dark"]` for: `--bg`, `--bg-panel`, `--text`, `--text-muted`, `--border`, `--accent`
   - Light theme: white/near-white background, dark text. Dark theme: `#0f0f0f` background, light text.
   - Accent color: `#aa3bff` (purple) — used for active tab indicator, buttons, focus rings
   - Header: fixed height (~48px), flexbox, space-between
   - Tab panels: `display:none` / `display:flex` (or block) toggled by `.active` class
   - Visualize tab: canvas fills the full available viewport height, `position: relative`
   - `#label-renderer-container`: `position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none`
   - `#controls-panel`: `position: absolute; bottom: 1.5rem; left: 50%; transform: translateX(-50%); display: flex; gap: 0.5rem`
   - `.node-label` div (used by Three.js CSS2DRenderer): small font, semi-transparent bg, rounded, pointer-events none
   - `#inspector`: slide-up panel, `position: absolute; bottom: 0; right: 0; width: 320px`
   - Settings modal: centered overlay with backdrop
   - Responsive: below 768px, JSON tab textarea gets full height; controls panel stacks vertically
   - Font stack: `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
   - JSON textarea font: `font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace`
   - Minimal transitions (150ms) on theme switch, tab change, inspector slide

4. **`.github/workflows/deploy.yml`**
   ```yaml
   name: Deploy to GitHub Pages
   on:
     push:
       branches: [main]
     workflow_dispatch:
   permissions:
     contents: read
     pages: write
     id-token: write
   concurrency:
     group: pages
     cancel-in-progress: true
   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: '20'
             cache: 'npm'
         - run: npm ci
         - run: npm run build
         - uses: actions/upload-pages-artifact@v3
           with:
             path: dist/
     deploy:
       needs: build
       runs-on: ubuntu-latest
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       steps:
         - id: deployment
           uses: actions/deploy-pages@v4
   ```

5. **`src/ui/tabs.js`**
   - Exports `initTabs({ onActivateViz })`
   - Handles tab button clicks: toggles `.active` on buttons and panels
   - Calls `onActivateViz()` when switching TO the Visualize tab (main.js triggers the re-render here)

6. **`src/ui/jsonTab.js`**
   - Exports `initJsonTab({ onJsonChange })`
   - Textarea: calls `onJsonChange(value)` on input (just stores the string — no parsing here)
   - File drop: reads `.json` file via `FileReader`, calls `onJsonChange`
   - URL fetch: `fetch(url)`, on success calls `onJsonChange(text)`, on failure calls errorBanner
   - Format button: `JSON.parse` + `JSON.stringify(parsed, null, 2)` back into textarea
   - **Query param handling** (call this on init):
     - `?data=<base64url>`: decode with `atob(decodeURIComponent(param))`, populate textarea, call `onJsonChange`
     - `?url=<url>`: populate the URL input field and auto-trigger a fetch
     - If either param present: signal to main.js to auto-switch to the Visualize tab after load (return a `{ autoVisualize: boolean }` from init)

7. **`src/ui/errorBanner.js`**
   - Exports `showError(message: string | null)`
   - `null` hides the banner; a string shows it with the message

8. **`src/ui/inspector.js`**
   - Exports `initInspector()`
   - Returns `{ show(node), hide() }`
   - Displays: key path (`node.id`), value type, raw value (truncated to 500 chars for large strings)
   - Close button calls `hide()`

9. **`src/controls/themeManager.js`**
   - Exports `initThemeManager({ onThemeChange })`
   - Returns `{ getColor(valueType: string): string, setColor(valueType, hex), resetColors(), getTheme(): 'light'|'dark' }`
   - Default palette (see CLAUDE.md). Merges with localStorage `jv-color-prefs` on init.
   - `initThemeManager` reads `localStorage['jv-theme']` and `prefers-color-scheme` to set initial theme
   - Sets `document.documentElement.dataset.theme` on toggle
   - `onThemeChange(theme)` is called whenever theme changes so main.js can call `scene.setTheme()`

10. **`src/controls/controlsPanel.js`**
    - Exports `initControlsPanel({ onResetCamera, onLayoutChange, onZoom, onSearch, onCollapseAll, onExpandAll })`
    - Populates `#controls-panel` with buttons and a layout `<select>`
    - Layout select options are built dynamically — this module imports `listLayouts` from `src/visualizer/layouts/registry.js` (the one Three.js-adjacent import Agent B makes — it's pure JS with no Three.js, so it's safe)
    - Search input: debounced 300ms, calls `onSearch(query)`
    - Zoom buttons: call `onZoom('in')` / `onZoom('out')`

11. **`src/ui/settingsPanel.js`**
    - Exports `initSettingsPanel({ themeManager })`
    - Wires the color pickers in `#settings-modal` to `themeManager.setColor()`
    - On open: reads current colors from `themeManager.getColor()` and sets picker values
    - Reset button calls `themeManager.resetColors()` and re-reads picker values
    - Gear button and close button toggle `hidden` on the modal

## Share button

Wire this in `src/ui/jsonTab.js` or `src/main.js` (your choice):
- On click: take the current JSON string, `btoa(encodeURIComponent(json))`, append as `?data=` to `window.location.href`, copy to clipboard with `navigator.clipboard.writeText()`
- Show a brief "Copied!" tooltip on the button

## Key constraints

- No runtime dependencies beyond what's already in `package.json` (Vite is dev-only)
- All CSS uses custom properties — no hardcoded colour values outside `:root` / `[data-theme="dark"]`
- All JS uses named exports
- Do not import from `src/visualizer/scene.js` — that coupling lives only in `main.js`
- The canvas element must be `id="viz-canvas"` — Agent A's scene.js targets this ID
- The label renderer container must be `id="label-renderer-container"` — Agent A mounts to it

## When you are done

Report back:
- Which files were created
- Any deviations from the interfaces in CLAUDE.md and why
- Any open questions for integration with Agent A's work

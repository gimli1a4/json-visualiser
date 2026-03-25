# JSON Visualiser — Claude Code Guide

A GitHub Pages SPA that accepts JSON input and renders it as an interactive 3D graph using Three.js.
Deployed via GitHub Actions to `https://gimli1a4.github.io/json-visualiser/`.

---

## Product Overview

- Paste, drop, or load JSON from a URL → see it visualized as a 3D radial tree
- Share a URL that encodes the JSON directly (`?data=<base64>`) or fetches it (`?url=<url>`)
- Full light/dark mode with per-node-type color overrides persisted in localStorage
- Extensible: layouts, node types, and controls are all designed to be added to without rewrites

---

## File Structure

```
json-visualiser/
├── index.html
├── package.json                      # three as runtime dep, vite as dev dep
├── vite.config.js                    # base: '/json-visualiser/'
├── public/favicon.svg
└── src/
    ├── main.js                       # Entry: wires all modules; handles tab switching
    ├── style.css                     # Layout, tabs, CSS custom properties for theming
    │
    ├── parser/
    │   └── jsonParser.js             # JSON string → GraphNode tree
    │
    ├── visualizer/
    │   ├── scene.js                  # JsonScene class — public API for the Three.js layer
    │   ├── displayState.js           # Map<nodeId, {collapsed, highlighted}> — mutable render state
    │   ├── layouts/
    │   │   ├── registry.js           # registerLayout / getLayout / listLayouts
    │   │   └── radial.js             # Default layout — registers itself on import
    │   ├── nodeFactory.js            # Produces Three.js Mesh per node type using current theme colors
    │   ├── edgeFactory.js            # Produces Three.js Line for edges
    │   ├── labelRenderer.js          # CSS2DRenderer overlay; labels shown on hover/select
    │   └── interaction.js            # Raycaster: hover highlight, click-to-select, click-to-collapse
    │
    ├── controls/
    │   ├── orbitControls.js          # Re-exports Three's OrbitControls
    │   ├── controlsPanel.js          # Floating controls: zoom, reset, layout selector, search, collapse-all
    │   └── themeManager.js           # Manages light/dark + per-type color overrides (localStorage)
    │
    └── ui/
        ├── tabs.js                   # Tab switching logic; triggers viz update on tab change
        ├── jsonTab.js                # Textarea editor, file drop, URL input, ?data/?url query param handling
        ├── vizTab.js                 # Mounts the canvas, initialises JsonScene on first activation
        ├── settingsPanel.js          # Gear icon → modal: per-type color pickers, resets to defaults
        ├── inspector.js              # Slide-up panel on node click: key path + value
        └── errorBanner.js            # Parse/fetch error display
```

---

## Agent Responsibilities

### Agent A — Three.js Visualizer
Owns: `src/visualizer/`, `src/parser/`, `src/controls/orbitControls.js`

Implementation order:
1. `npm install three` (generates `package-lock.json` — must be committed)
2. `src/parser/jsonParser.js`
3. `src/visualizer/layouts/registry.js` + `layouts/radial.js`
4. `src/visualizer/displayState.js`
5. `src/visualizer/nodeFactory.js` + `edgeFactory.js`
6. `src/visualizer/labelRenderer.js`
7. `src/visualizer/interaction.js`
8. `src/visualizer/scene.js` — `JsonScene` class (see interface below)
9. Minimal `src/main.js` stub with hardcoded JSON for isolated scene testing

### Agent B — UI + Infrastructure
Owns: `src/ui/`, `src/controls/controlsPanel.js`, `src/controls/themeManager.js`, `index.html`, `src/style.css`, `vite.config.js`, `.github/workflows/deploy.yml`

Implementation order:
1. `vite.config.js`
2. `index.html` — tab shell, canvas container, settings modal scaffold
3. `src/style.css` — tab layout, CSS custom properties for all theme tokens
4. `.github/workflows/deploy.yml`
5. `src/ui/tabs.js`
6. `src/ui/jsonTab.js` — textarea, file drop, URL input, `?data=` / `?url=` query param handling
7. `src/ui/vizTab.js`
8. `src/ui/errorBanner.js`, `inspector.js`
9. `src/controls/controlsPanel.js`, `themeManager.js`
10. `src/ui/settingsPanel.js`

---

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│  JSON Visualiser    [ JSON ] [ Visualize ]   [⚙] [◐] │  ← header
├─────────────────────────────────────────────────────┤
│                                                     │
│  [JSON tab]              [Visualize tab]            │
│  ─────────               ──────────────             │
│  Textarea (full height)  Full-screen Three.js canvas│
│  + File drop area        + floating controls:       │
│  + URL input field         layout selector          │
│  + Fetch button            zoom in/out              │
│                            reset camera             │
│                            search input             │
│                            collapse all / expand all│
│                                                     │
│                          Inspector panel (slide-up  │
│                          on node click)             │
└─────────────────────────────────────────────────────┘
```

**Tab update behaviour:** Switching to the Visualize tab triggers `scene.load(parseJson(currentJson))`. If JSON is unchanged since the last load, skip re-render. No live updates on every keystroke.

**Settings modal (gear icon):** Per-type color pickers (6 types × light/dark = one picker per type, applied to both modes). Reset-to-defaults button. Preferences stored in `localStorage` under key `jv-color-prefs`.

---

## Key Interfaces

### GraphNode (parser → visualizer contract)
```js
{
  id: string,           // path-based: "root.users[0].name"
  key: string,
  valueType: 'object'|'array'|'string'|'number'|'boolean'|'null',
  value: any,           // null for containers
  depth: number,
  parentId: string | null,
  children: GraphNode[],
  position: { x: number, y: number, z: number }  // {0,0,0}; layout fills this
}
```

### Layout Registry (`src/visualizer/layouts/registry.js`)
```js
// Layouts self-register on import — adding a new layout = one new file
export function registerLayout(id, { label, compute }) {}
// compute: (rootNode: GraphNode) => void  — mutates node.position in-place

export function getLayout(id: string): { label, compute }
export function listLayouts(): Array<{ id, label }>  // used by controlsPanel to build selector
```

### JsonScene (`src/visualizer/scene.js`) — public API
```js
export class JsonScene {
  constructor(canvas: HTMLCanvasElement)
  load(rootNode: GraphNode): void        // full re-render; respects current layout + displayState
  resetCamera(): void
  setLayout(id: string): void            // looks up layout in registry, re-positions nodes
  setTheme(theme: 'light'|'dark'): void  // updates material colors from themeManager
  search(query: string): void            // highlights matching nodes, dims others; '' clears
  collapseAll(): void
  expandAll(): void
  onNodeSelect(handler: (node: GraphNode) => void): void
  onNodeToggle(handler: (node: GraphNode) => void): void  // collapse/expand a single node
  resize(): void
  dispose(): void
}
```

### Display State (`src/visualizer/displayState.js`)
```js
// Separate from GraphNode data — tracks render-only state
export const displayState = new Map()  // nodeId → { collapsed: boolean, highlighted: boolean }
export function setCollapsed(nodeId, value) {}
export function setHighlighted(nodeId, value) {}
export function reset() {}             // clears all overrides
```

### Theme Manager (`src/controls/themeManager.js`)
```js
// Default palette — consistent hues, lightness varies by mode
const defaults = {
  object:  '#3b82f6',  // blue
  array:   '#14b8a6',  // teal
  string:  '#22c55e',  // green
  number:  '#f59e0b',  // amber
  boolean: '#a855f7',  // purple
  null:    '#6b7280',  // grey
}
// User overrides merged on top from localStorage 'jv-color-prefs'
// Exposes: getColor(valueType), setColor(valueType, hex), resetColors()
// onThemeChange callback updates Three.js materials via scene.setTheme()
```

### UI module init pattern
All UI/control modules use a plain options object with callbacks — no shared state, no event bus:
```js
initControlsPanel({ onResetCamera, onLayoutChange, onZoom, onSearch, onCollapseAll, onExpandAll })
initThemeManager({ onThemeChange: (theme) => void })
initSettingsPanel({ onColorChange: (type, hex) => void, onReset: () => void })
initInspector({ onClose: () => void })
```

### main.js — integration seam
`src/main.js` is the only file that imports from both the visualizer and UI layers:
```js
// On tab switch to Visualize:
function activateVizTab() {
  if (jsonDirty) {
    try {
      const root = parseJson(currentJson)
      scene.load(root)
      jsonDirty = false
      showError(null)
    } catch (e) {
      showError(e.message)
    }
  }
}
```

---

## Visualization

### Layout System
- **Radial tree** (default): nodes distributed in concentric rings by depth in XY plane. Slight Z jitter per depth for parallax. Adding a new layout = create `src/visualizer/layouts/myLayout.js`, call `registerLayout(...)` and import it in `main.js`.
- Layout selector in controls panel is built dynamically from `listLayouts()` — no hardcoded options.

### Node Geometry by Type
| Type | Geometry | Default Color |
|------|----------|---------------|
| Object `{}` | Octahedron (larger) | Blue `#3b82f6` |
| Array `[]` | Cylinder | Teal `#14b8a6` |
| String | Sphere | Green `#22c55e` |
| Number | Box/cube | Amber `#f59e0b` |
| Boolean | Tetrahedron | Purple `#a855f7` |
| Null | Wireframe sphere | Grey `#6b7280` |

Colors are defaults. User can override per-type via the settings panel; overrides persist in localStorage.

### Labels
CSS2DRenderer (HTML divs that follow 3D positions). Off by default; shown on hover + selected node. Key name always shown on hover; value shown on selected. Toggle for all-labels mode in controls.

### Performance cap
Max 500 nodes rendered. If the parsed tree exceeds this, render the first 500 in BFS order and show a warning banner.

### Collapse behaviour
Collapsing a node hides its entire subtree. `displayState` tracks collapsed nodes. `scene.load()` reads displayState when building the scene — collapsed nodes' children are excluded from layout and mesh creation.

### Search
`scene.search(query)` string-matches against `node.key` and string representation of `node.value`. Matching nodes are highlighted (full opacity), non-matching nodes are dimmed (0.15 opacity). Empty string clears.

---

## URL Sharing

Two mechanisms, both parsed on app load in `src/ui/jsonTab.js`:

- `?data=<base64url-encoded-json>` — JSON embedded in URL. Works without CORS. Best for small payloads.
- `?url=<remote-url>` — fetches remote JSON via `fetch()`. Subject to CORS. Show a clear warning if blocked.

On load, if either param is present: auto-populate the editor and immediately switch to the Visualize tab.

A "Share" button in the header encodes the current JSON as `?data=` and copies the URL to clipboard.

---

## Theming

- CSS custom properties drive all colours (background, text, panel borders, etc.)
- `data-theme="light"|"dark"` on `<html>` switches the CSS variable set
- Three.js material colors sourced from `themeManager.getColor(type)` — updated via `scene.setTheme()`
- System preference respected on first load (`prefers-color-scheme`)
- User toggle stored in localStorage

**Fonts:** System sans-serif stack for UI (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`). Monospace stack for the JSON editor (`'JetBrains Mono', 'Fira Code', monospace` with system mono fallback).

---

## Build & Deploy

- **Build:** `npm run build` → `dist/` via Vite
- **Deploy:** GitHub Actions on push to `main` → GitHub Pages
- **Live URL:** `https://gimli1a4.github.io/json-visualiser/`

### Critical requirements
- `vite.config.js` must set `base: '/json-visualiser/'`
- `package-lock.json` must be committed (generated after `npm install three`)
- GitHub repo Settings → Pages → Source must be set to **"GitHub Actions"** (not a branch)

### `.github/workflows/deploy.yml` outline
```yaml
on: push to main + workflow_dispatch
permissions: contents:read, pages:write, id-token:write
jobs:
  build: checkout → setup-node@v4 (node 20, npm cache) → npm ci → npm run build → upload-pages-artifact (dist/)
  deploy: needs build → deploy-pages → outputs page_url
```

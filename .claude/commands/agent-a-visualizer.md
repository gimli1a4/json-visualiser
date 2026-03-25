You are implementing the Three.js visualizer layer for the JSON Visualiser project. Read CLAUDE.md first — it is the source of truth for all interfaces, the GraphNode shape, the JsonScene API, the layout registry pattern, and the display state contract. Do not deviate from the interfaces defined there.

## Your ownership

You own everything under `src/visualizer/`, `src/parser/`, and `src/controls/orbitControls.js`.

You do NOT touch: `index.html`, `src/style.css`, `src/ui/`, `src/controls/controlsPanel.js`, `src/controls/themeManager.js`, `vite.config.js`, `.github/`.

## Implementation order

Follow this sequence exactly — each step depends on the previous:

1. **Install Three.js:** `npm install three`. This generates `package-lock.json` — stage and commit it alongside your first file changes.

2. **`src/parser/jsonParser.js`**
   - Exports `parseJson(jsonString): GraphNode`
   - Throws a descriptive `Error` on invalid JSON
   - Builds the full `GraphNode` tree recursively (see CLAUDE.md for the exact shape)
   - Sets `position` to `{x:0, y:0, z:0}` on every node — layout fills this in later
   - Array indices become the `key` (e.g. `"0"`, `"1"`)
   - Node `id` is a path string: `"root"`, `"root.users"`, `"root.users[0]"`, `"root.users[0].name"`

3. **`src/visualizer/layouts/registry.js`**
   - Exports `registerLayout(id, { label, compute })`, `getLayout(id)`, `listLayouts()`
   - `compute` signature: `(rootNode: GraphNode) => void` — mutates `node.position` in-place on every node in the tree
   - No Three.js imports in this file

4. **`src/visualizer/layouts/radial.js`**
   - Implements radial tree layout: nodes at each depth distributed evenly around a circle in the XY plane
   - Circle radius = `depth * 3` units. Root at origin.
   - Add a small Z jitter per depth level (`depth * 0.3`) for parallax when orbiting — not used for hierarchy separation
   - Self-registers: `registerLayout('radial', { label: 'Radial Tree', compute: radialLayout })`

5. **`src/visualizer/displayState.js`**
   - Exports a `Map`-backed store: `setCollapsed(nodeId, bool)`, `setHighlighted(nodeId, bool)`, `isCollapsed(nodeId)`, `isHighlighted(nodeId)`, `reset()`
   - No Three.js imports

6. **`src/visualizer/nodeFactory.js`**
   - Pure function: `createNodeMesh(node: GraphNode, color: string): THREE.Mesh`
   - Geometry per type (see CLAUDE.md table): object=OctahedronGeometry, array=CylinderGeometry, string=SphereGeometry, number=BoxGeometry, boolean=TetrahedronGeometry (use IcosahedronGeometry detail=0 as approximation), null=SphereGeometry with MeshBasicMaterial wireframe
   - Object nodes get radius/size 0.6; all others 0.35
   - Use `MeshStandardMaterial` with the provided color hex string
   - No scene mutation — returns the mesh only

7. **`src/visualizer/edgeFactory.js`**
   - Pure function: `createEdge(parentPos, childPos): THREE.Line`
   - Use `LineBasicMaterial` with opacity 0.35, transparent true, color `#888888`
   - Returns the Line object only

8. **`src/visualizer/labelRenderer.js`**
   - Sets up a `CSS2DRenderer` alongside the main WebGL renderer
   - Exports `createLabel(text: string): CSS2DObject`
   - Exports `initLabelRenderer(container: HTMLElement): CSS2DRenderer`
   - Labels are `<div class="node-label">` elements — styling is handled by `style.css` (Agent B's file), so just assign the class

9. **`src/visualizer/interaction.js`**
   - Exports `initInteraction({ camera, scene, onSelect, onToggleCollapse })`
   - Uses `THREE.Raycaster` on `pointermove` (hover) and `pointerdown` (click)
   - Hover: scale hovered mesh to 1.3, restore others to 1.0. Show label on hovered node.
   - Click: fires `onSelect(node)`. Double-click fires `onToggleCollapse(node)`.
   - Attach/detach listeners cleanly (return a `dispose()` function)

10. **`src/visualizer/scene.js`**
    - Implements the `JsonScene` class exactly as specified in CLAUDE.md
    - Constructor: creates WebGLRenderer, PerspectiveCamera, Scene, AmbientLight + DirectionalLight, OrbitControls, CSS2DRenderer, calls the animation loop
    - `load(rootNode)`: clears scene, reads layout from registry, applies layout, reads displayState to skip collapsed subtrees, creates meshes + edges + labels, adds to scene
    - `search(query)`: updates displayState highlighted flags, re-applies material opacity
    - `setTheme(theme)`: updates all existing material colors by calling themeManager (import it by path — it is Agent B's file but this coupling is acceptable and documented)
    - Animation loop: `requestAnimationFrame` → `controls.update()` → `renderer.render()` → `labelRenderer.render()`

11. **Minimal test stub in `src/main.js`**
    - Import `parseJson` and `JsonScene`
    - Hardcode a small JSON sample (an object with nested array and mixed value types)
    - Create a `JsonScene` on `document.getElementById('viz-canvas')`
    - Call `scene.load(parseJson(sample))`
    - This stub will be replaced during integration — its only purpose is to verify the visualizer works in isolation

## Key constraints

- `package-lock.json` must be committed — CI uses `npm ci`
- Do not add any runtime dependencies beyond `three`
- All exports are named exports (no default exports on multi-export modules)
- Three.js imports use the npm path: `import * as THREE from 'three'`, `import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'`, `import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'`
- Max 500 nodes: in `scene.load()`, collect nodes via BFS and stop at 500; if truncated, emit a custom event `jv:truncated` on `window` with `{ count }` detail so the UI can show a warning

## When you are done

Report back:
- Which files were created
- Any deviations from the interfaces in CLAUDE.md and why
- Any issues or open questions for integration with Agent B's work
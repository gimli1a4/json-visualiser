/**
 * registry.js
 * Layout registry — layouts self-register on import.
 * No Three.js imports in this file.
 *
 * A layout's `compute` function receives the root GraphNode and mutates
 * every node's `position` property in-place.
 *
 * compute: (rootNode: GraphNode) => void
 */

/** @type {Map<string, { label: string, compute: (root: GraphNode) => void }>} */
const _layouts = new Map();

/**
 * Register a layout under an id.
 * @param {string} id
 * @param {{ label: string, compute: (root: GraphNode) => void }} descriptor
 */
export function registerLayout(id, { label, compute }) {
  _layouts.set(id, { label, compute });
}

/**
 * Retrieve a registered layout by id.
 * Throws if not found.
 * @param {string} id
 * @returns {{ label: string, compute: (root: GraphNode) => void }}
 */
export function getLayout(id) {
  const layout = _layouts.get(id);
  if (!layout) {
    throw new Error(`Layout "${id}" is not registered. Available: ${[..._layouts.keys()].join(', ')}`);
  }
  return layout;
}

/**
 * List all registered layouts.
 * @returns {Array<{ id: string, label: string }>}
 */
export function listLayouts() {
  return [..._layouts.entries()].map(([id, { label }]) => ({ id, label }));
}

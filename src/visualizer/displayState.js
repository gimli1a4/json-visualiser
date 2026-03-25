/**
 * displayState.js
 * Render-only state: tracks collapsed and highlighted status per node id.
 * Intentionally decoupled from GraphNode data.
 * No Three.js imports.
 *
 * Shape stored per nodeId: { collapsed: boolean, highlighted: boolean }
 */

/** @type {Map<string, { collapsed: boolean, highlighted: boolean }>} */
export const displayState = new Map();

/**
 * Ensure an entry exists for the given nodeId and return it.
 * @param {string} nodeId
 * @returns {{ collapsed: boolean, highlighted: boolean }}
 */
function getOrCreate(nodeId) {
  if (!displayState.has(nodeId)) {
    displayState.set(nodeId, { collapsed: false, highlighted: false });
  }
  return displayState.get(nodeId);
}

/**
 * Set the collapsed flag for a node.
 * @param {string} nodeId
 * @param {boolean} value
 */
export function setCollapsed(nodeId, value) {
  getOrCreate(nodeId).collapsed = value;
}

/**
 * Set the highlighted flag for a node.
 * @param {string} nodeId
 * @param {boolean} value
 */
export function setHighlighted(nodeId, value) {
  getOrCreate(nodeId).highlighted = value;
}

/**
 * Whether a node is currently collapsed.
 * @param {string} nodeId
 * @returns {boolean}
 */
export function isCollapsed(nodeId) {
  return displayState.get(nodeId)?.collapsed ?? false;
}

/**
 * Whether a node is currently highlighted.
 * @param {string} nodeId
 * @returns {boolean}
 */
export function isHighlighted(nodeId) {
  return displayState.get(nodeId)?.highlighted ?? false;
}

/**
 * Clear all display state overrides.
 */
export function reset() {
  displayState.clear();
}

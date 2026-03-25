/**
 * radial.js
 * Radial tree layout with subtree-proportional angular sectors.
 *
 * Each node's angular sector is proportional to its subtree size, so large
 * subtrees get more arc and don't overlap with small neighbours.
 *
 * Axes:
 *   XY  — radial position (angle + radius)
 *   Z   — encodes depth, so orbiting reveals hierarchy
 *
 * Self-registers on import.
 */

import { registerLayout } from './registry.js';

const RADIAL_STEP = 6;  // XY radius per depth level (units)
const Z_STEP      = 2;  // Z separation per depth level (units)

/**
 * Annotate every node with _subtreeSize (number of nodes in its subtree,
 * including itself). Must be called before layout placement.
 * @param {GraphNode} node
 * @returns {number}
 */
function computeSubtreeSizes(node) {
  if (!node.children || node.children.length === 0) {
    node._subtreeSize = 1;
    return 1;
  }
  let size = 1;
  for (const child of node.children) {
    size += computeSubtreeSizes(child);
  }
  node._subtreeSize = size;
  return size;
}

/**
 * Place a single node at a given angle and depth.
 * @param {GraphNode} node
 * @param {number} angle  - radians
 * @param {number} depth
 */
function placeNode(node, angle, depth) {
  const r = depth * RADIAL_STEP;
  node.position.x = Math.cos(angle) * r;
  node.position.y = Math.sin(angle) * r;
  node.position.z = depth * Z_STEP;
}

/**
 * Recursively place children of `node` within the angular sector
 * [startAngle, endAngle], then recurse into each child's subtree.
 *
 * Each child's share of the sector is proportional to its _subtreeSize,
 * so large subtrees get more arc and never collapse into adjacent ones.
 *
 * @param {GraphNode} node
 * @param {number} startAngle
 * @param {number} endAngle
 * @param {number} depth      - depth of the children being placed
 */
function placeChildren(node, startAngle, endAngle, depth) {
  const children = node.children;
  if (!children || children.length === 0) return;

  // Total subtree size of all children (excludes the node itself)
  const totalChildSize = children.reduce((s, c) => s + c._subtreeSize, 0);
  const sectorRange = endAngle - startAngle;

  let currentAngle = startAngle;
  for (const child of children) {
    const fraction = child._subtreeSize / totalChildSize;
    const childSector = sectorRange * fraction;
    const childAngle = currentAngle + childSector / 2;  // centre of sector

    placeNode(child, childAngle, depth);
    placeChildren(child, currentAngle, currentAngle + childSector, depth + 1);
    currentAngle += childSector;
  }
}

/**
 * Radial tree layout entry point.
 * Mutates node.position on every node in the tree.
 * @param {GraphNode} rootNode
 */
function radialLayout(rootNode) {
  computeSubtreeSizes(rootNode);

  rootNode.position.x = 0;
  rootNode.position.y = 0;
  rootNode.position.z = 0;

  // Root's children get the full 2π circle
  placeChildren(rootNode, 0, Math.PI * 2, 1);
}

registerLayout('radial', { label: 'Radial Tree', compute: radialLayout });

export { radialLayout };

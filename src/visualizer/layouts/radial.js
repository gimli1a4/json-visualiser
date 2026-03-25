/**
 * radial.js
 * Default radial tree layout.
 *
 * Nodes at each depth are distributed evenly around a circle in the XY plane.
 * Circle radius = depth * 3 units. Root sits at the origin.
 * A small Z offset per depth level (depth * 0.3) adds parallax when orbiting —
 * it does NOT encode hierarchy.
 *
 * Self-registers on import.
 */

import { registerLayout } from './registry.js';

/**
 * Recursive helper that distributes `node`'s children evenly within an
 * angular sector [startAngle, endAngle] at the next depth ring.
 *
 * @param {GraphNode} node
 * @param {number} startAngle  - sector start in radians
 * @param {number} endAngle    - sector end in radians
 */
function placeChildren(node, startAngle, endAngle) {
  const children = node.children;
  if (!children || children.length === 0) return;

  const count = children.length;
  const sectorSize = endAngle - startAngle;

  for (let i = 0; i < count; i++) {
    const child = children[i];
    // Angle for this child: distribute evenly in the parent's sector
    const angle = startAngle + (i + 0.5) * (sectorSize / count);
    const radius = child.depth * 3;

    child.position.x = Math.cos(angle) * radius;
    child.position.y = Math.sin(angle) * radius;
    child.position.z = child.depth * 0.3;

    // Each child gets its own sub-sector for its own children
    const childSectorSize = sectorSize / count;
    const childStart = startAngle + i * childSectorSize;
    const childEnd = childStart + childSectorSize;

    placeChildren(child, childStart, childEnd);
  }
}

/**
 * Radial tree layout.
 * Mutates node.position on every node in the tree.
 * @param {GraphNode} rootNode
 */
function radialLayout(rootNode) {
  // Root sits at the origin
  rootNode.position.x = 0;
  rootNode.position.y = 0;
  rootNode.position.z = 0;

  // Top-level children get the full 2π circle
  placeChildren(rootNode, 0, Math.PI * 2);
}

registerLayout('radial', { label: 'Radial Tree', compute: radialLayout });

export { radialLayout };

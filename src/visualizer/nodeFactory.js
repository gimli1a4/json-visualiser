/**
 * nodeFactory.js
 * Pure factory: creates a Three.js Mesh for a given GraphNode.
 * Does not mutate the scene — returns the mesh only.
 *
 * Geometry per type:
 *   object  → OctahedronGeometry  (size 0.6)
 *   array   → CylinderGeometry    (size 0.35)
 *   string  → SphereGeometry      (size 0.35)
 *   number  → BoxGeometry         (size 0.35)
 *   boolean → IcosahedronGeometry detail=0 (tetrahedron approx, size 0.35)
 *   null    → SphereGeometry wireframe (size 0.35)
 */

import * as THREE from 'three';

const LARGE_SIZE = 0.6;
const SMALL_SIZE = 0.35;

/**
 * Create a Three.js Mesh representing the given node.
 * @param {GraphNode} node
 * @param {string} color  - CSS hex color string, e.g. '#3b82f6'
 * @returns {THREE.Mesh}
 */
export function createNodeMesh(node, color) {
  let geometry;
  let material;

  switch (node.valueType) {
    case 'object':
      geometry = new THREE.OctahedronGeometry(LARGE_SIZE);
      break;
    case 'array':
      geometry = new THREE.CylinderGeometry(SMALL_SIZE, SMALL_SIZE, SMALL_SIZE * 2, 8);
      break;
    case 'string':
      geometry = new THREE.SphereGeometry(SMALL_SIZE, 16, 12);
      break;
    case 'number':
      geometry = new THREE.BoxGeometry(SMALL_SIZE * 2, SMALL_SIZE * 2, SMALL_SIZE * 2);
      break;
    case 'boolean':
      // IcosahedronGeometry with detail=0 gives a shape close to a tetrahedron
      geometry = new THREE.IcosahedronGeometry(SMALL_SIZE, 0);
      break;
    case 'null':
      geometry = new THREE.SphereGeometry(SMALL_SIZE, 16, 12);
      material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        wireframe: true,
      });
      break;
    default:
      geometry = new THREE.SphereGeometry(SMALL_SIZE, 16, 12);
  }

  if (!material) {
    material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
    });
  }

  const mesh = new THREE.Mesh(geometry, material);
  // Store a reference to the source node for interaction lookups
  mesh.userData.node = node;

  return mesh;
}

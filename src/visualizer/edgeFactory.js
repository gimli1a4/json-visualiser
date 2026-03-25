/**
 * edgeFactory.js
 * Pure factory: creates a Three.js Line connecting two 3D positions.
 * Does not mutate the scene — returns the Line only.
 */

import * as THREE from 'three';

const EDGE_MATERIAL = new THREE.LineBasicMaterial({
  color: 0x888888,
  opacity: 0.35,
  transparent: true,
});

/**
 * Create a Three.js Line between two positions.
 * @param {{ x: number, y: number, z: number }} parentPos
 * @param {{ x: number, y: number, z: number }} childPos
 * @returns {THREE.Line}
 */
export function createEdge(parentPos, childPos) {
  const points = [
    new THREE.Vector3(parentPos.x, parentPos.y, parentPos.z),
    new THREE.Vector3(childPos.x, childPos.y, childPos.z),
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  // Share the material across all edges (read-only properties like color/opacity)
  return new THREE.Line(geometry, EDGE_MATERIAL);
}

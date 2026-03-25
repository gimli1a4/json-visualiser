/**
 * interaction.js
 * Wires pointer events to a Three.js Raycaster for hover + click interaction.
 *
 * Hover (pointermove): scale hovered mesh to 1.3, restore others to 1.0.
 *                      Show label on hovered node.
 * Click (pointerdown): fires onSelect(node).
 * Double-click:        fires onToggleCollapse(node).
 *
 * Returns a dispose() function that removes all listeners.
 */

import * as THREE from 'three';

/**
 * @param {{
 *   camera: THREE.Camera,
 *   scene: THREE.Scene,
 *   domElement: HTMLElement,
 *   meshes: THREE.Mesh[],       // live reference — updated by scene.load()
 *   labels: Map<string, import('three/examples/jsm/renderers/CSS2DRenderer.js').CSS2DObject>,
 *   onSelect: (node: GraphNode) => void,
 *   onToggleCollapse: (node: GraphNode) => void,
 * }} options
 * @returns {{ dispose: () => void }}
 */
export function initInteraction({ camera, scene, domElement, meshes, labels, onSelect, onToggleCollapse }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let hoveredMesh = null;

  function getPointerNDC(event) {
    const rect = domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function onPointerMove(event) {
    getPointerNDC(event);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(meshes, false);

    // Restore previously hovered mesh
    if (hoveredMesh) {
      hoveredMesh.scale.setScalar(1.0);
      // Hide label
      const nodeId = hoveredMesh.userData.node?.id;
      if (nodeId && labels.has(nodeId)) {
        labels.get(nodeId).visible = false;
      }
      hoveredMesh = null;
    }

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      hit.scale.setScalar(1.3);
      // Show label
      const nodeId = hit.userData.node?.id;
      if (nodeId && labels.has(nodeId)) {
        labels.get(nodeId).visible = true;
      }
      hoveredMesh = hit;
    }
  }

  function onPointerDown(event) {
    // Only handle primary button
    if (event.button !== 0) return;
    getPointerNDC(event);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      const node = intersects[0].object.userData.node;
      if (node) onSelect(node);
    }
  }

  function onDblClick(event) {
    getPointerNDC(event);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      const node = intersects[0].object.userData.node;
      if (node) onToggleCollapse(node);
    }
  }

  domElement.addEventListener('pointermove', onPointerMove);
  domElement.addEventListener('pointerdown', onPointerDown);
  domElement.addEventListener('dblclick', onDblClick);

  return {
    dispose() {
      domElement.removeEventListener('pointermove', onPointerMove);
      domElement.removeEventListener('pointerdown', onPointerDown);
      domElement.removeEventListener('dblclick', onDblClick);
    },
  };
}

/**
 * labelRenderer.js
 * Sets up a CSS2DRenderer that overlays the WebGL canvas.
 * Labels are plain HTML divs with class "node-label" — styled by style.css.
 */

import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

/**
 * Initialise a CSS2DRenderer and append it to the given container element.
 * The container should be positioned absolutely over the canvas
 * (id="label-renderer-container" per the HTML spec).
 *
 * @param {HTMLElement} container
 * @returns {CSS2DRenderer}
 */
export function initLabelRenderer(container) {
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(container.offsetWidth, container.offsetHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(labelRenderer.domElement);
  return labelRenderer;
}

/**
 * Create a CSS2DObject (HTML label) for a given text string.
 * The div carries class "node-label"; styling lives in style.css.
 *
 * @param {string} text
 * @returns {CSS2DObject}
 */
export function createLabel(text) {
  const div = document.createElement('div');
  div.className = 'node-label';
  div.textContent = text;
  return new CSS2DObject(div);
}

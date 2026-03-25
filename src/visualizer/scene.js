/**
 * scene.js
 * JsonScene — the public API for the Three.js visualizer layer.
 *
 * Public API (see CLAUDE.md for full contract):
 *   constructor(canvas)
 *   load(rootNode)
 *   resetCamera()
 *   setLayout(id)
 *   setTheme(theme)
 *   search(query)
 *   collapseAll()
 *   expandAll()
 *   onNodeSelect(handler)
 *   onNodeToggle(handler)
 *   resize()
 *   dispose()
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getLayout } from './layouts/registry.js';
import { isCollapsed, setCollapsed, setHighlighted, reset as resetDisplayState } from './displayState.js';
import { createNodeMesh } from './nodeFactory.js';
import { createEdge } from './edgeFactory.js';
import { initLabelRenderer, createLabel } from './labelRenderer.js';
import { initInteraction } from './interaction.js';

// Import radial layout so it self-registers
import './layouts/radial.js';

const MAX_NODES = 500;
const DEFAULT_LAYOUT = 'radial';

export class JsonScene {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this._canvas = canvas;
    this._currentLayoutId = DEFAULT_LAYOUT;
    this._rootNode = null;
    this._selectHandler = null;
    this._toggleHandler = null;
    this._animationId = null;

    // --- Renderer ---
    this._renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    // --- Scene + Camera ---
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x1a1a2e);

    this._camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    this._camera.position.set(0, 0, 20);

    // --- Lights ---
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const directional = new THREE.DirectionalLight(0xffffff, 1.2);
    directional.position.set(10, 20, 10);
    this._scene.add(ambient, directional);

    // --- Orbit Controls ---
    this._controls = new OrbitControls(this._camera, canvas);
    this._controls.enableDamping = true;
    this._controls.dampingFactor = 0.08;

    // --- CSS2D Label Renderer ---
    const labelContainer = document.getElementById('label-renderer-container');
    this._labelRenderer = initLabelRenderer(labelContainer || canvas.parentElement);

    // --- Internal state ---
    /** @type {THREE.Mesh[]} */
    this._meshes = [];
    /** @type {Map<string, import('three/examples/jsm/renderers/CSS2DRenderer.js').CSS2DObject>} */
    this._labels = new Map();

    // --- Interaction ---
    this._interaction = initInteraction({
      camera: this._camera,
      scene: this._scene,
      domElement: canvas,
      meshes: this._meshes,
      labels: this._labels,
      onSelect: (node) => {
        if (this._selectHandler) this._selectHandler(node);
      },
      onToggleCollapse: (node) => {
        const collapsed = isCollapsed(node.id);
        setCollapsed(node.id, !collapsed);
        if (this._toggleHandler) this._toggleHandler(node);
        // Re-render with updated collapse state
        if (this._rootNode) this.load(this._rootNode);
      },
    });

    // --- Animation loop ---
    this._animate();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  _animate() {
    this._animationId = requestAnimationFrame(() => this._animate());
    this._controls.update();
    this._renderer.render(this._scene, this._camera);

    const container = document.getElementById('label-renderer-container');
    if (container) {
      this._labelRenderer.setSize(container.offsetWidth, container.offsetHeight);
    }
    this._labelRenderer.render(this._scene, this._camera);
  }

  /**
   * Clear all meshes, edges, and labels from the scene.
   */
  _clearScene() {
    // Dispose geometries and materials to avoid GPU leaks
    this._scene.traverse((obj) => {
      if (obj.isMesh || obj.isLine) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });

    // Remove all top-level scene children except lights
    for (const child of [...this._scene.children]) {
      if (!child.isLight) {
        this._scene.remove(child);
      }
    }

    this._meshes.length = 0;
    this._labels.clear();
  }

  /**
   * Get the color for a node type from themeManager if available,
   * otherwise fall back to built-in defaults.
   * @param {string} valueType
   * @returns {string}
   */
  _getColor(valueType) {
    try {
      // themeManager is Agent B's module; import lazily to avoid hard failure
      // if it hasn't been initialised yet during standalone testing.
      if (this._themeManager) {
        return this._themeManager.getColor(valueType);
      }
    } catch (_) { /* ignore */ }

    const defaults = {
      object:  '#3b82f6',
      array:   '#14b8a6',
      string:  '#22c55e',
      number:  '#f59e0b',
      boolean: '#a855f7',
      null:    '#6b7280',
    };
    return defaults[valueType] ?? '#ffffff';
  }

  /**
   * BFS traversal of the node tree, respecting collapsed state.
   * Returns nodes in BFS order, capped at MAX_NODES.
   * @param {GraphNode} rootNode
   * @returns {GraphNode[]}
   */
  _collectVisibleNodes(rootNode) {
    const result = [];
    const queue = [rootNode];

    while (queue.length > 0 && result.length < MAX_NODES) {
      const node = queue.shift();
      result.push(node);

      if (!isCollapsed(node.id) && node.children) {
        for (const child of node.children) {
          queue.push(child);
        }
      }
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Full re-render. Applies current layout, respects displayState.
   * @param {GraphNode} rootNode
   */
  load(rootNode) {
    this._rootNode = rootNode;
    this._clearScene();

    // Apply layout (mutates node.position in-place)
    const layout = getLayout(this._currentLayoutId);
    layout.compute(rootNode);

    // Collect visible nodes (BFS, collapsed subtrees excluded, max 500)
    const visibleNodes = this._collectVisibleNodes(rootNode);

    if (visibleNodes.length === MAX_NODES) {
      window.dispatchEvent(new CustomEvent('jv:truncated', { detail: { count: MAX_NODES } }));
    }

    // Build a Map of visible nodes by id (O(1) lookups for edge building)
    const visibleById = new Map(visibleNodes.map((n) => [n.id, n]));

    // Determine whether any search is active before the mesh loop
    const searchQuery = this._searchQuery || '';
    const searchActive = searchQuery.length > 0;

    // Create meshes and labels
    for (const node of visibleNodes) {
      const color = this._getColor(node.valueType);
      const mesh = createNodeMesh(node, color);
      mesh.position.set(node.position.x, node.position.y, node.position.z);

      // Dim non-matching nodes when a search is active
      if (searchActive) {
        const isMatch =
          node.key.includes(searchQuery) ||
          String(node.value ?? '').includes(searchQuery);
        if (mesh.material) {
          mesh.material.opacity = isMatch ? 1.0 : 0.15;
          mesh.material.transparent = true;
        }
      }

      this._scene.add(mesh);
      this._meshes.push(mesh);

      // Create label (hidden by default; interaction.js shows on hover)
      const labelText = node.key !== 'root'
        ? node.valueType === 'object' || node.valueType === 'array'
          ? `${node.key} (${node.valueType})`
          : `${node.key}: ${String(node.value).slice(0, 40)}`
        : 'root';
      const label = createLabel(labelText);
      label.position.set(0, 0.6, 0);
      label.visible = false;
      mesh.add(label);
      this._labels.set(node.id, label);
    }

    // Create edges (parent → child, both must be visible)
    for (const node of visibleNodes) {
      if (node.parentId && visibleById.has(node.parentId)) {
        const parentNode = visibleById.get(node.parentId);
        const edge = createEdge(parentNode.position, node.position);
        this._scene.add(edge);
      }
    }
  }

  /** Reset camera to default position. */
  resetCamera() {
    this._camera.position.set(0, 0, 20);
    this._camera.lookAt(0, 0, 0);
    this._controls.reset();
  }

  /**
   * Switch to a different layout and re-render if a tree is loaded.
   * @param {string} id
   */
  setLayout(id) {
    this._currentLayoutId = id;
    if (this._rootNode) this.load(this._rootNode);
  }

  /**
   * Update scene background and material colors to match the chosen theme.
   * @param {'light'|'dark'} theme
   */
  setTheme(theme) {
    this._currentTheme = theme;
    this._scene.background = new THREE.Color(theme === 'dark' ? 0x0f0f0f : 0xf8f8f8);
    if (this._rootNode) this.load(this._rootNode);
  }

  /**
   * Attach a themeManager instance so scene can pull per-type colors.
   * Called by main.js after both layers are initialised.
   * @param {{ getColor: (type: string) => string }} themeManager
   */
  attachThemeManager(themeManager) {
    this._themeManager = themeManager;
  }

  /**
   * Highlight nodes whose key or value matches query; dim all others.
   * Empty string clears search.
   * @param {string} query
   */
  search(query) {
    this._searchQuery = query;

    if (!query) {
      // Clear all highlights — restore full opacity
      for (const mesh of this._meshes) {
        if (mesh.material) {
          mesh.material.opacity = 1.0;
          mesh.material.transparent = false;
        }
      }
      return;
    }

    for (const mesh of this._meshes) {
      const node = mesh.userData.node;
      if (!node) continue;
      const isMatch =
        node.key.includes(query) ||
        String(node.value ?? '').includes(query);
      if (mesh.material) {
        mesh.material.opacity = isMatch ? 1.0 : 0.15;
        mesh.material.transparent = true;
      }
    }
  }

  /** Collapse every node that has children. */
  collapseAll() {
    if (!this._rootNode) return;
    const queue = [this._rootNode];
    while (queue.length) {
      const node = queue.shift();
      if (node.children?.length) {
        setCollapsed(node.id, true);
        queue.push(...node.children);
      }
    }
    this.load(this._rootNode);
  }

  /** Expand every node. */
  expandAll() {
    if (!this._rootNode) return;
    const queue = [this._rootNode];
    while (queue.length) {
      const node = queue.shift();
      setCollapsed(node.id, false);
      if (node.children) queue.push(...node.children);
    }
    this.load(this._rootNode);
  }

  /**
   * Register a handler called when a node is selected (single click).
   * @param {(node: GraphNode) => void} handler
   */
  onNodeSelect(handler) {
    this._selectHandler = handler;
  }

  /**
   * Register a handler called when a node is toggled (double-click).
   * @param {(node: GraphNode) => void} handler
   */
  onNodeToggle(handler) {
    this._toggleHandler = handler;
  }

  /** Handle canvas resize. */
  resize() {
    const canvas = this._canvas;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;

    this._renderer.setSize(w, h, false);
    this._labelRenderer.setSize(w, h);
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
  }

  /** Clean up all Three.js resources and event listeners. */
  dispose() {
    cancelAnimationFrame(this._animationId);
    this._interaction.dispose();
    this._clearScene();
    this._renderer.dispose();
  }
}

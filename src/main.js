/**
 * main.js — Integration entry point.
 * Wires the UI layer (Agent B) with the visualizer layer (Agent A).
 * This is the only file that imports from both layers.
 */

import './style.css'
import { initTabs } from './ui/tabs.js'
import { initJsonTab } from './ui/jsonTab.js'
import { showError } from './ui/errorBanner.js'
import { initInspector } from './ui/inspector.js'
import { initThemeManager } from './controls/themeManager.js'
import { initControlsPanel } from './controls/controlsPanel.js'
import { initSettingsPanel } from './ui/settingsPanel.js'

// ── State ────────────────────────────────────────────────────────────────────

let currentJson = ''
let jsonDirty = false
let scene = null
let sceneInitialized = false

// ── Lazy visualizer imports ──────────────────────────────────────────────────

async function loadVisualizerModules() {
  const [{ parseJson }, { JsonScene }] = await Promise.all([
    import('./parser/jsonParser.js'),
    import('./visualizer/scene.js'),
  ])
  return { parseJson, JsonScene }
}

// ── Scene init ───────────────────────────────────────────────────────────────

async function ensureScene(themeManager) {
  if (sceneInitialized) return scene

  try {
    const { JsonScene } = await loadVisualizerModules()
    const canvas = document.getElementById('viz-canvas')
    scene = new JsonScene(canvas)
    scene.attachThemeManager(themeManager)
    scene.resize()
    scene.setTheme(themeManager.getTheme())

    // Node select → inspector
    const inspector = initInspector()
    scene.onNodeSelect((node) => {
      if (node) inspector.show(node)
      else inspector.hide()
    })

    sceneInitialized = true

    // Handle resize
    window.addEventListener('resize', () => scene.resize())

    // Truncation warning
    window.addEventListener('jv:truncated', (e) => {
      showError(`Graph truncated: showing first ${e.detail.count} nodes (max 500).`)
    })
  } catch (err) {
    console.warn('[main.js] Visualizer not available:', err.message)
  }

  return scene
}

// ── Activate visualize tab ───────────────────────────────────────────────────

async function activateVizTab(themeManager) {
  if (!jsonDirty && sceneInitialized) return

  const s = await ensureScene(themeManager)
  if (!s) return

  if (!currentJson.trim()) return

  try {
    const { parseJson } = await loadVisualizerModules()
    const root = parseJson(currentJson)
    s.load(root)
    jsonDirty = false
    showError(null)
  } catch (err) {
    showError(`JSON parse error: ${err.message}`)
  }
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', async () => {
  // Theme manager — must be first so data-theme is set before any render
  const themeManager = initThemeManager({
    onThemeChange: (theme) => {
      if (scene) scene.setTheme(theme)
    },
  })

  // JSON tab — returns a promise (handles async ?url= fetch)
  const jsonTabResult = await initJsonTab({
    onJsonChange: (value) => {
      currentJson = value
      jsonDirty = true
    },
  })
  const { autoVisualize, getCurrentJson } = jsonTabResult

  // Tabs
  const { activateTab } = initTabs({
    onActivateViz: () => activateVizTab(themeManager),
  })

  // Controls panel (async — imports layout registry)
  initControlsPanel({
    onResetCamera: () => { if (scene) scene.resetCamera() },
    onLayoutChange: (id) => { if (scene) scene.setLayout(id) },
    onZoom: (dir) => {
      if (!scene) return
      // Zoom via camera position step — delegate to scene if it exposes zoom,
      // otherwise use a synthetic wheel event on the canvas as fallback
      if (typeof scene.zoom === 'function') {
        scene.zoom(dir)
      } else {
        const canvas = document.getElementById('viz-canvas')
        const delta = dir === 'in' ? -100 : 100
        canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: delta, bubbles: true }))
      }
    },
    onSearch: (query) => { if (scene) scene.search(query) },
    onCollapseAll: () => { if (scene) scene.collapseAll() },
    onExpandAll: () => { if (scene) scene.expandAll() },
  })

  // Settings panel
  initSettingsPanel({ themeManager })

  // Auto-switch to Visualize if query param was present
  if (autoVisualize) {
    currentJson = getCurrentJson()
    jsonDirty = true
    activateTab('visualize')
  }

  // Expose for console debugging
  window._scene = () => scene
  window._themeManager = themeManager
})

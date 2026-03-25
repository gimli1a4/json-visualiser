/**
 * vizTab.js — Visualize tab: mounts canvas, initialises JsonScene on first activation
 * Exports: initVizTab({ themeManager, onSceneReady })
 */

export function initVizTab({ themeManager, onSceneReady } = {}) {
  let scene = null
  let initialized = false

  async function ensureInitialized() {
    if (initialized) return scene

    try {
      const { JsonScene } = await import('../visualizer/scene.js')
      const canvas = document.getElementById('viz-canvas')
      scene = new JsonScene(canvas)

      // Apply initial theme
      if (themeManager) {
        scene.setTheme(themeManager.getTheme())
      }

      initialized = true

      if (typeof onSceneReady === 'function') {
        onSceneReady(scene)
      }
    } catch (err) {
      console.warn('JsonScene not yet available:', err.message)
    }

    return scene
  }

  function getScene() {
    return scene
  }

  return { ensureInitialized, getScene }
}

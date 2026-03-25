/**
 * controlsPanel.js — Floating controls: zoom, reset, layout selector, search, collapse/expand all
 * Exports: initControlsPanel({ onResetCamera, onLayoutChange, onZoom, onSearch, onCollapseAll, onExpandAll })
 */

let listLayouts

// Dynamically import layouts registry — may not exist yet if Agent A hasn't created it
async function tryLoadLayouts() {
  try {
    const mod = await import('../visualizer/layouts/registry.js')
    listLayouts = mod.listLayouts
  } catch (_) {
    listLayouts = () => [{ id: 'radial', label: 'Radial' }]
  }
}

export async function initControlsPanel({
  onResetCamera,
  onLayoutChange,
  onZoom,
  onSearch,
  onCollapseAll,
  onExpandAll,
} = {}) {
  await tryLoadLayouts()

  const panel = document.getElementById('controls-panel')
  if (!panel) return

  const layouts = listLayouts()

  // Layout selector
  const select = document.createElement('select')
  select.title = 'Layout'
  layouts.forEach(({ id, label }) => {
    const opt = document.createElement('option')
    opt.value = id
    opt.textContent = label
    select.appendChild(opt)
  })
  select.addEventListener('change', () => {
    if (typeof onLayoutChange === 'function') onLayoutChange(select.value)
  })

  // Zoom buttons
  const zoomInBtn = makeBtn('+', 'Zoom in', () => {
    if (typeof onZoom === 'function') onZoom('in')
  })
  const zoomOutBtn = makeBtn('−', 'Zoom out', () => {
    if (typeof onZoom === 'function') onZoom('out')
  })

  // Reset camera button
  const resetBtn = makeBtn('⌂', 'Reset camera', () => {
    if (typeof onResetCamera === 'function') onResetCamera()
  })

  // Search input (debounced 300ms)
  const searchInput = document.createElement('input')
  searchInput.type = 'text'
  searchInput.placeholder = 'Search…'
  searchInput.title = 'Search nodes'
  let searchTimer = null
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      if (typeof onSearch === 'function') onSearch(searchInput.value)
    }, 300)
  })

  // Collapse / expand all
  const collapseBtn = makeBtn('⊟', 'Collapse all', () => {
    if (typeof onCollapseAll === 'function') onCollapseAll()
  })
  const expandBtn = makeBtn('⊞', 'Expand all', () => {
    if (typeof onExpandAll === 'function') onExpandAll()
  })

  panel.appendChild(select)
  panel.appendChild(zoomInBtn)
  panel.appendChild(zoomOutBtn)
  panel.appendChild(resetBtn)
  panel.appendChild(searchInput)
  panel.appendChild(collapseBtn)
  panel.appendChild(expandBtn)
}

function makeBtn(text, title, onClick) {
  const btn = document.createElement('button')
  btn.textContent = text
  btn.title = title
  btn.addEventListener('click', onClick)
  return btn
}

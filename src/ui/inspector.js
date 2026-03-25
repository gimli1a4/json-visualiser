/**
 * inspector.js — Slide-up panel on node click: key path + value
 * Exports: initInspector()
 * Returns: { show(node), hide() }
 */

export function initInspector() {
  const panel = document.getElementById('inspector')

  function truncate(str, max = 500) {
    if (typeof str !== 'string') str = String(str)
    if (str.length <= max) return str
    return str.slice(0, max) + `… (${str.length - max} more chars)`
  }

  function show(node) {
    const rawValue = node.value !== null && node.value !== undefined
      ? truncate(typeof node.value === 'object' ? JSON.stringify(node.value, null, 2) : String(node.value))
      : '(container)'

    panel.innerHTML = `
      <div class="inspector-header">
        <span class="inspector-title">Node Inspector</span>
        <button class="inspector-close" title="Close">&times;</button>
      </div>
      <div class="inspector-field">
        <div class="inspector-field-label">Path</div>
        <div class="inspector-field-value">${escapeHtml(node.id)}</div>
      </div>
      <div class="inspector-field">
        <div class="inspector-field-label">Key</div>
        <div class="inspector-field-value">${escapeHtml(node.key)}</div>
      </div>
      <div class="inspector-field">
        <div class="inspector-field-label">Type</div>
        <div class="inspector-field-value">
          <span class="inspector-type-badge">${escapeHtml(node.valueType)}</span>
        </div>
      </div>
      <div class="inspector-field">
        <div class="inspector-field-label">Value</div>
        <div class="inspector-field-value">${escapeHtml(rawValue)}</div>
      </div>
      <div class="inspector-field">
        <div class="inspector-field-label">Depth</div>
        <div class="inspector-field-value">${node.depth}</div>
      </div>
    `

    panel.querySelector('.inspector-close').addEventListener('click', hide)
    panel.hidden = false
  }

  function hide() {
    panel.hidden = true
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  return { show, hide }
}

/**
 * jsonTab.js — JSON input tab: textarea, file drop, URL fetch, query param handling
 * Exports: initJsonTab({ onJsonChange })
 */

import { showError } from './errorBanner.js'

export function initJsonTab({ onJsonChange }) {
  const textarea = document.getElementById('json-input')
  const fileDrop = document.getElementById('file-drop')
  const fileInput = fileDrop.querySelector('input[type="file"]')
  const urlInput = document.getElementById('url-input')
  const fetchBtn = document.getElementById('fetch-btn')
  const formatBtn = document.getElementById('format-btn')
  const shareBtn = document.getElementById('share-btn')

  let currentJson = ''

  function setJson(value) {
    textarea.value = value
    currentJson = value
    onJsonChange(value)
  }

  // Textarea input
  textarea.addEventListener('input', () => {
    currentJson = textarea.value
    onJsonChange(textarea.value)
  })

  // File drop — drag events
  fileDrop.addEventListener('dragover', (e) => {
    e.preventDefault()
    fileDrop.classList.add('drag-over')
  })

  fileDrop.addEventListener('dragleave', () => {
    fileDrop.classList.remove('drag-over')
  })

  fileDrop.addEventListener('drop', (e) => {
    e.preventDefault()
    fileDrop.classList.remove('drag-over')
    const file = e.dataTransfer.files[0]
    if (file) readFile(file)
  })

  // File browse
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0]
    if (file) readFile(file)
  })

  function readFile(file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      setJson(e.target.result)
      showError(null)
    }
    reader.onerror = () => showError('Failed to read file.')
    reader.readAsText(file)
  }

  // URL fetch
  async function fetchUrl(url) {
    showError(null)
    try {
      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      const text = await res.text()
      setJson(text)
    } catch (err) {
      if (err.name === 'TypeError') {
        showError(`Fetch failed — possibly blocked by CORS. ${err.message}`)
      } else {
        showError(`Fetch error: ${err.message}`)
      }
    }
  }

  fetchBtn.addEventListener('click', () => {
    const url = urlInput.value.trim()
    if (url) fetchUrl(url)
  })

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const url = urlInput.value.trim()
      if (url) fetchUrl(url)
    }
  })

  // Format button
  formatBtn.addEventListener('click', () => {
    try {
      const parsed = JSON.parse(textarea.value)
      const formatted = JSON.stringify(parsed, null, 2)
      textarea.value = formatted
      currentJson = formatted
      onJsonChange(formatted)
      showError(null)
    } catch (err) {
      showError(`Invalid JSON: ${err.message}`)
    }
  })

  // Share button — encode current JSON as ?data= param, copy to clipboard
  if (shareBtn) {
    const tooltip = document.createElement('span')
    tooltip.className = 'tooltip'
    tooltip.textContent = 'Copied!'
    shareBtn.appendChild(tooltip)

    shareBtn.addEventListener('click', () => {
      const json = currentJson
      if (!json.trim()) {
        showError('Nothing to share — paste some JSON first.')
        return
      }
      try {
        const encoded = btoa(encodeURIComponent(json))
        const url = new URL(window.location.href)
        url.search = ''
        url.searchParams.set('data', encoded)
        navigator.clipboard.writeText(url.toString()).then(() => {
          tooltip.classList.add('visible')
          setTimeout(() => tooltip.classList.remove('visible'), 2000)
        }).catch(() => {
          showError('Clipboard write failed.')
        })
      } catch (err) {
        showError(`Share failed: ${err.message}`)
      }
    })
  }

  // Query param handling — ?data= and ?url=
  // Returns a promise that resolves to { autoVisualize: boolean }
  const params = new URLSearchParams(window.location.search)

  const dataParam = params.get('data')
  if (dataParam) {
    try {
      const decoded = decodeURIComponent(atob(dataParam))
      setJson(decoded)
    } catch (err) {
      showError(`Failed to decode shared data: ${err.message}`)
    }
    // autoVisualize is synchronous — resolve immediately
    return Promise.resolve({ autoVisualize: true, getCurrentJson: () => currentJson })
  }

  const urlParam = params.get('url')
  if (urlParam) {
    urlInput.value = urlParam
    // Wait for fetch to complete before signalling autoVisualize
    return fetchUrl(urlParam).then(() => ({
      autoVisualize: true,
      getCurrentJson: () => currentJson,
    })).catch(() => ({
      autoVisualize: false,
      getCurrentJson: () => currentJson,
    }))
  }

  return Promise.resolve({ autoVisualize: false, getCurrentJson: () => currentJson })
}

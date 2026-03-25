/**
 * themeManager.js — Manages light/dark mode + per-type color overrides
 * Exports: initThemeManager({ onThemeChange })
 * Returns: { getColor, setColor, resetColors, getTheme }
 */

const STORAGE_KEY_THEME = 'jv-theme'
const STORAGE_KEY_COLORS = 'jv-color-prefs'

const defaults = {
  object:  '#3b82f6',
  array:   '#14b8a6',
  string:  '#22c55e',
  number:  '#f59e0b',
  boolean: '#a855f7',
  null:    '#6b7280',
}

export function initThemeManager({ onThemeChange } = {}) {
  // Determine initial theme
  let savedTheme = null
  try {
    savedTheme = localStorage.getItem(STORAGE_KEY_THEME)
  } catch (_) {}

  let currentTheme
  if (savedTheme === 'light' || savedTheme === 'dark') {
    currentTheme = savedTheme
  } else {
    currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  document.documentElement.dataset.theme = currentTheme

  // Load color overrides from localStorage
  let colorOverrides = {}
  try {
    const stored = localStorage.getItem(STORAGE_KEY_COLORS)
    if (stored) {
      colorOverrides = JSON.parse(stored)
    }
  } catch (_) {}

  function getColor(valueType) {
    return colorOverrides[valueType] ?? defaults[valueType] ?? '#888888'
  }

  function setColor(valueType, hex) {
    colorOverrides[valueType] = hex
    persistColors()
    if (typeof onThemeChange === 'function') {
      onThemeChange(currentTheme)
    }
  }

  function resetColors() {
    colorOverrides = {}
    persistColors()
    if (typeof onThemeChange === 'function') {
      onThemeChange(currentTheme)
    }
  }

  function getTheme() {
    return currentTheme
  }

  function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light'
    document.documentElement.dataset.theme = currentTheme
    try {
      localStorage.setItem(STORAGE_KEY_THEME, currentTheme)
    } catch (_) {}
    if (typeof onThemeChange === 'function') {
      onThemeChange(currentTheme)
    }
  }

  function persistColors() {
    try {
      localStorage.setItem(STORAGE_KEY_COLORS, JSON.stringify(colorOverrides))
    } catch (_) {}
  }

  // Wire theme toggle button
  const themeBtn = document.getElementById('theme-btn')
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme)
  }

  return { getColor, setColor, resetColors, getTheme, toggleTheme }
}

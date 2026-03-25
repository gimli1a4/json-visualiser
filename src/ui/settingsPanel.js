/**
 * settingsPanel.js — Settings modal: per-type color pickers
 * Exports: initSettingsPanel({ themeManager })
 */

export function initSettingsPanel({ themeManager }) {
  const modal = document.getElementById('settings-modal')
  const settingsBtn = document.getElementById('settings-btn')
  const closeBtn = document.getElementById('close-settings-btn')
  const resetBtn = document.getElementById('reset-colors-btn')
  const backdrop = modal.querySelector('.modal-backdrop')
  const colorPickers = modal.querySelectorAll('input[type="color"]')

  function open() {
    // Sync picker values to current theme colors
    colorPickers.forEach((picker) => {
      const type = picker.dataset.type
      picker.value = themeManager.getColor(type)
    })
    modal.hidden = false
  }

  function close() {
    modal.hidden = true
  }

  settingsBtn.addEventListener('click', open)
  closeBtn.addEventListener('click', close)
  backdrop.addEventListener('click', close)

  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close()
  })

  colorPickers.forEach((picker) => {
    picker.addEventListener('input', () => {
      themeManager.setColor(picker.dataset.type, picker.value)
    })
  })

  resetBtn.addEventListener('click', () => {
    themeManager.resetColors()
    // Re-read picker values after reset
    colorPickers.forEach((picker) => {
      const type = picker.dataset.type
      picker.value = themeManager.getColor(type)
    })
  })
}

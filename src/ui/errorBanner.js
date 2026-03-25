/**
 * errorBanner.js — Parse/fetch error display
 * Exports: showError(message: string | null)
 */

const banner = document.getElementById('error-banner')

export function showError(message) {
  if (message === null || message === undefined) {
    banner.hidden = true
    banner.textContent = ''
  } else {
    banner.textContent = message
    banner.hidden = false
  }
}

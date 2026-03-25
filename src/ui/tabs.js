/**
 * tabs.js — Tab switching logic
 * Exports: initTabs({ onActivateViz })
 */

export function initTabs({ onActivateViz }) {
  const tabBtns = document.querySelectorAll('.tab-btn')
  const tabPanels = document.querySelectorAll('.tab-panel')

  function activateTab(tabId) {
    tabBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabId)
    })
    tabPanels.forEach((panel) => {
      panel.classList.toggle('active', panel.id === `tab-${tabId}`)
    })

    if (tabId === 'visualize' && typeof onActivateViz === 'function') {
      onActivateViz()
    }
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      activateTab(btn.dataset.tab)
    })
  })

  return { activateTab }
}

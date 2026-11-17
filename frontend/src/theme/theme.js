// Light / dark mode.
// The choice is saved in the browser (localStorage). Until the user picks one, the
// device setting is followed. The page gets <html data-theme="light|dark">.

const KEY = 'leettrack-theme'
const listeners = new Set()

function readSaved() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

function systemTheme() {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

let preference = readSaved() // 'light' | 'dark' | 'system'

function resolved() {
  return preference === 'system' ? systemTheme() : preference
}

function apply() {
  document.documentElement.setAttribute('data-theme', resolved())
  listeners.forEach((fn) => fn())
}

export function initTheme() {
  apply()
  try {
    window
      .matchMedia('(prefers-color-scheme: light)')
      .addEventListener('change', () => preference === 'system' && apply())
  } catch {
    /* very old browsers: keep what we have */
  }
}

export function setPreference(next) {
  preference = next
  try {
    if (next === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, next)
  } catch {
    /* private window: the choice just lasts until the page closes */
  }
  apply()
}

export const getPreference = () => preference
export const getTheme = resolved
export const subscribe = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

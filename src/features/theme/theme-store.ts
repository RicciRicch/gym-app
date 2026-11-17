import { useSyncExternalStore } from 'react'
import { THEME_KEY, parseStoredTheme, serializeTheme, themeById, type Theme, type ThemeId } from '../../lib/theme'

// The chosen theme lives on this device (localStorage). The accent is applied as
// CSS variables on <html>, which every accent utility and glow reads.

const listeners = new Set<() => void>()

function read(): Theme {
  try {
    return parseStoredTheme(localStorage.getItem(THEME_KEY))
  } catch {
    return themeById(null)
  }
}

let current = read()

function apply(theme: Theme) {
  const style = document.documentElement.style
  style.setProperty('--color-accent', theme.accent)
  style.setProperty('--color-accent-dim', theme.dim)
}

/** Re-applies the stored theme (index.html already did, this also fixes a tampered value). */
export function initTheme() {
  apply(current)
}

export function setTheme(id: ThemeId) {
  current = themeById(id)
  try {
    localStorage.setItem(THEME_KEY, serializeTheme(current))
  } catch {
    // Private mode: the theme still applies for this visit.
  }
  apply(current)
  listeners.forEach((l) => l())
}

/** The theme right now, for canvas and chart code that needs a hex value. */
export const currentTheme = () => current

export function useTheme(): Theme {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
}

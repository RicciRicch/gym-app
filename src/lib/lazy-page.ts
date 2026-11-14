import { lazy, type ComponentType } from 'react'

// After a deploy, an open copy of the app still points at the old chunk file
// names, which no longer exist. Loading a screen then fails; reloading picks
// up the new version. The timestamp guard stops a reload loop when the
// failure is something else (for example no connection and nothing cached).

const KEY = 'gym-app:chunk-reload'
const WINDOW_MS = 30_000

/** Reloads the page unless it already did so in the last 30 s. Returns whether it reloads. */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0)
    if (Date.now() - last < WINDOW_MS) return false
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}

/** React.lazy for a named export, recovering from stale chunks by reloading once. */
export function lazyPage<M, K extends keyof M>(load: () => Promise<M>, name: K) {
  return lazy(() =>
    load().then(
      (m) => ({ default: m[name] as ComponentType }),
      (error: unknown) => {
        // Keep the loader on screen while the page reloads.
        if (reloadForNewVersion()) return new Promise<never>(() => {})
        throw error
      },
    ),
  )
}

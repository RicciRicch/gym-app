import { dehydrate, hydrate, type QueryClient } from '@tanstack/react-query'

// Keeps the last loaded data (split, workouts, exercises...) in localStorage so
// every screen still has something to show with no connection. Query keys
// include the user id, and the copy is wiped on sign-out.

const KEY = 'gym-app:query-cache'
const VERSION = 1
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

interface Saved {
  version: number
  savedAt: number
  state: ReturnType<typeof dehydrate>
}

/** Loads the saved copy into the cache. Call once, before the first render. */
export function restoreQueryCache(queryClient: QueryClient) {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return
    const saved = JSON.parse(raw) as Saved
    if (saved.version !== VERSION || Date.now() - saved.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(KEY)
      return
    }
    hydrate(queryClient, saved.state)
  } catch {
    // corrupt or blocked storage: start with an empty cache
  }
}

/** Saves the cache (debounced) whenever it changes. Returns an unsubscribe function. */
export function persistQueryCache(queryClient: QueryClient) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const save = () => {
    try {
      const state = dehydrate(queryClient, { shouldDehydrateQuery: (q) => q.state.status === 'success' })
      if (state.queries.length === 0) localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, JSON.stringify({ version: VERSION, savedAt: Date.now(), state } satisfies Saved))
    } catch {
      // storage full or blocked: offline data just won't be refreshed
    }
  }
  const unsubscribe = queryClient.getQueryCache().subscribe(() => {
    clearTimeout(timer)
    timer = setTimeout(save, 1000)
  })
  return () => {
    clearTimeout(timer)
    unsubscribe()
  }
}

export function clearPersistedQueryCache() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing to clear */
  }
}

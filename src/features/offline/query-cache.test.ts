import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearPersistedQueryCache, persistQueryCache, restoreQueryCache } from './query-cache'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  }
}

describe('offline query cache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('localStorage', memoryStorage())
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('saves loaded data and restores it into a fresh client', () => {
    const a = new QueryClient()
    const stop = persistQueryCache(a)
    a.setQueryData(['split', 'u1'], { name: 'PPL' })
    vi.advanceTimersByTime(1000)
    stop()

    const b = new QueryClient()
    restoreQueryCache(b)
    expect(b.getQueryData(['split', 'u1'])).toEqual({ name: 'PPL' })
  })

  it('drops a copy from an older format', () => {
    localStorage.setItem('gym-app:query-cache', JSON.stringify({ version: 0, savedAt: Date.now(), state: { queries: [] } }))
    restoreQueryCache(new QueryClient())
    expect(localStorage.getItem('gym-app:query-cache')).toBeNull()
  })

  it('ignores corrupt data and can be cleared', () => {
    localStorage.setItem('gym-app:query-cache', '{nope')
    expect(() => restoreQueryCache(new QueryClient())).not.toThrow()
    clearPersistedQueryCache()
    expect(localStorage.getItem('gym-app:query-cache')).toBeNull()
  })
})

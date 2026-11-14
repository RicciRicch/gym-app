import { describe, expect, it } from 'vitest'
import { createAuthStorage, REMEMBER_KEY, type KeyValueStore } from './auth-storage'

function memory(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

describe('createAuthStorage', () => {
  it('remembers by default and writes to persistent storage', () => {
    const local = memory()
    const session = memory()
    const s = createAuthStorage(local, session)
    expect(s.remember()).toBe(true)
    s.setItem('sb', 'token')
    expect(local.data.get('sb')).toBe('token')
    expect(session.data.has('sb')).toBe(false)
  })

  it('writes to session storage when remember is off', () => {
    const local = memory()
    const session = memory()
    const s = createAuthStorage(local, session)
    s.setRemember(false)
    expect(local.data.get(REMEMBER_KEY)).toBe('0')
    s.setItem('sb', 'token')
    expect(session.data.get('sb')).toBe('token')
    expect(local.data.has('sb')).toBe(false)
  })

  it('moves the session when the preference changes and reads from either', () => {
    const local = memory()
    const session = memory()
    const s = createAuthStorage(local, session)
    s.setItem('sb', 'a')
    s.setRemember(false)
    s.setItem('sb', 'b')
    expect(local.data.has('sb')).toBe(false)
    expect(s.getItem('sb')).toBe('b')
  })

  it('removes from both stores', () => {
    const local = memory()
    const session = memory()
    local.setItem('sb', 'a')
    session.setItem('sb', 'b')
    createAuthStorage(local, session).removeItem('sb')
    expect(local.data.has('sb') || session.data.has('sb')).toBe(false)
  })
})

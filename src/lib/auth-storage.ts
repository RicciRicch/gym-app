/**
 * "Remember me" for Supabase auth: the session goes to localStorage when the
 * user wants to stay signed in, otherwise to sessionStorage (gone when the
 * browser/tab closes). Reads check both so an existing session is always found.
 */

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const REMEMBER_KEY = 'gym-app:remember-me'

export function createAuthStorage(persistent: KeyValueStore, session: KeyValueStore): KeyValueStore & {
  setRemember(remember: boolean): void
  remember(): boolean
} {
  const remember = () => persistent.getItem(REMEMBER_KEY) !== '0'
  return {
    remember,
    setRemember(value) {
      persistent.setItem(REMEMBER_KEY, value ? '1' : '0')
    },
    getItem(key) {
      return persistent.getItem(key) ?? session.getItem(key)
    },
    setItem(key, value) {
      const [target, other] = remember() ? [persistent, session] : [session, persistent]
      target.setItem(key, value)
      other.removeItem(key)
    },
    removeItem(key) {
      persistent.removeItem(key)
      session.removeItem(key)
    },
  }
}

/** Storage that never throws (private mode, blocked storage). */
export function safeStore(get: () => Storage): KeyValueStore {
  return {
    getItem: (k) => {
      try {
        return get().getItem(k)
      } catch {
        return null
      }
    },
    setItem: (k, v) => {
      try {
        get().setItem(k, v)
      } catch {
        /* ignore */
      }
    },
    removeItem: (k) => {
      try {
        get().removeItem(k)
      } catch {
        /* ignore */
      }
    },
  }
}

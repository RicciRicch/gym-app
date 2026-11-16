import { useSyncExternalStore } from 'react'
import { parseFriendCode } from '../../lib/friends'

// The friend code the app should ask about: from an invite link (?add=CODE) or
// typed on the Friends page. Kept in localStorage so a link opened while signed
// out still works after signing in or creating an account.

const EVENT = 'gym-app:invite'
const KEY = 'gym-app:pending-invite'

function read(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function write(code: string | null) {
  try {
    if (code) localStorage.setItem(KEY, code)
    else localStorage.removeItem(KEY)
  } catch {
    /* storage blocked: the invite just won't survive a reload */
  }
  window.dispatchEvent(new Event(EVENT))
}

export const openInvite = (code: string) => write(code)
export const clearInvite = () => write(null)

/** Call once at startup: moves ?add=CODE from the address bar into the store. */
export function captureInviteFromUrl() {
  const url = new URL(window.location.href)
  const param = url.searchParams.get('add')
  if (param === null) return
  const code = parseFriendCode(param)
  if (code) write(code)
  url.searchParams.delete('add')
  window.history.replaceState(window.history.state, '', url)
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function usePendingInvite(): string | null {
  return useSyncExternalStore(subscribe, read)
}

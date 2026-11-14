import { useSyncExternalStore } from 'react'

// The first-run guide is queued when a new account finishes onboarding and
// cleared when the user closes it. It can be reopened from the profile page.

const EVENT = 'gym-app:guide'
const key = (userId: string) => `gym-app:guide:${userId}`

function read(userId: string | undefined): boolean {
  if (!userId) return false
  try {
    return localStorage.getItem(key(userId)) === 'open'
  } catch {
    return false
  }
}

function write(userId: string, open: boolean) {
  try {
    if (open) localStorage.setItem(key(userId), 'open')
    else localStorage.removeItem(key(userId))
  } catch {
    /* storage blocked: the guide just won't persist */
  }
  window.dispatchEvent(new Event(EVENT))
}

export const openGuide = (userId: string) => write(userId, true)
export const closeGuide = (userId: string) => write(userId, false)

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function useGuideOpen(userId: string | undefined): boolean {
  return useSyncExternalStore(subscribe, () => read(userId))
}

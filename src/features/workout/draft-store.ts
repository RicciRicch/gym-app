import { useCallback, useSyncExternalStore } from 'react'
import { DEFAULT_REST_SECONDS, isWorkoutDraft, type WorkoutDraft } from '../../lib/workout'
import { useAuth } from '../auth/auth-context'

// The in-progress workout lives in localStorage (one per user) so nothing is
// lost if the app closes. A tiny external store keeps every screen in sync.

const draftKey = (userId: string) => `gym-app:workout:${userId}`
const REST_KEY = 'gym-app:rest-seconds'

const listeners = new Set<() => void>()
const cache = new Map<string, { raw: string | null; draft: WorkoutDraft | null }>()

function read(userId: string): WorkoutDraft | null {
  const key = draftKey(userId)
  let raw: string | null
  try {
    raw = localStorage.getItem(key)
  } catch {
    // storage unavailable (private mode): fall back to the in-memory copy
    return cache.get(key)?.draft ?? null
  }
  const cached = cache.get(key)
  if (cached && cached.raw === raw) return cached.draft
  let draft: WorkoutDraft | null = null
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (isWorkoutDraft(parsed)) draft = parsed
    } catch {
      draft = null
    }
  }
  cache.set(key, { raw, draft })
  return draft
}

export function writeDraft(userId: string, draft: WorkoutDraft | null) {
  const key = draftKey(userId)
  const raw = draft ? JSON.stringify(draft) : null
  cache.set(key, { raw, draft })
  try {
    if (raw) localStorage.setItem(key, raw)
    else localStorage.removeItem(key)
  } catch {
    // keep working from memory
  }
  listeners.forEach((notify) => notify())
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  // Another tab changed the draft.
  window.addEventListener('storage', notify)
  return () => {
    listeners.delete(notify)
    window.removeEventListener('storage', notify)
  }
}

/** The current user's in-progress workout and an updater. */
export function useWorkoutDraft() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const draft = useSyncExternalStore(subscribe, () => (userId ? read(userId) : null))

  const setDraft = useCallback(
    (next: WorkoutDraft | null | ((current: WorkoutDraft) => WorkoutDraft)) => {
      if (!userId) return
      if (typeof next === 'function') {
        const current = read(userId)
        if (current) writeDraft(userId, next(current))
      } else {
        writeDraft(userId, next)
      }
    },
    [userId],
  )

  return { draft, setDraft }
}

/** The user's preferred rest duration, remembered across workouts. */
export function loadRestSeconds(): number {
  try {
    const value = Number(localStorage.getItem(REST_KEY))
    return value >= 10 && value <= 900 ? value : DEFAULT_REST_SECONDS
  } catch {
    return DEFAULT_REST_SECONDS
  }
}

export function saveRestSeconds(seconds: number) {
  try {
    localStorage.setItem(REST_KEY, String(seconds))
  } catch {
    // not critical
  }
}

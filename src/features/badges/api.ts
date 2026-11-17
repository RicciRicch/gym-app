import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { computeBadges, unseenBadges, type BadgeState, type BadgeWorkout } from '../../lib/badges'
import { useAuth } from '../auth/auth-context'
import { useLoggedSets } from '../progress/api'
import { weeklyTarget } from '../schedule/plan'
import { useActiveSplit } from '../split/api'
import { useStreakFreezes } from '../streak/api'

/** Every finished workout with the fields badges look at. Key starts with ['workouts', userId] so finishing one refreshes it. */
function useBadgeWorkouts() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['workouts', user?.id, 'badges'],
    enabled: !!user,
    queryFn: async (): Promise<BadgeWorkout[]> => {
      const { data, error } = await supabase
        .from('workouts')
        .select('id, date, day_name, started_at, finished_at')
        .order('date', { ascending: false })
        .limit(3000)
      if (error) throw error
      return data.map((w) => ({ id: w.id, date: w.date, dayName: w.day_name, startedAt: w.started_at, finishedAt: w.finished_at }))
    },
  })
}

/** Every badge with its progress and earned date. null until all data has loaded. */
export function useBadges(): BadgeState[] | null {
  const workouts = useBadgeWorkouts()
  const sets = useLoggedSets()
  const freezes = useStreakFreezes()
  const split = useActiveSplit()
  return useMemo(
    () =>
      workouts.data && sets.data && freezes.data && !split.isPending
        ? computeBadges({
            workouts: workouts.data,
            sets: sets.data,
            streakTarget: weeklyTarget(split.data),
            frozenWeeks: freezes.data,
          })
        : null,
    [workouts.data, sets.data, freezes.data, split.isPending, split.data],
  )
}

// Badges the user has already been shown, per user in localStorage. The key
// ends with the user id, so deleting the account clears it.

const EVENT = 'gym-app:badges-seen'
const key = (userId: string) => `gym-app:badges-seen:${userId}`

function readSeen(userId: string | undefined): string | null {
  if (!userId) return null
  try {
    return localStorage.getItem(key(userId))
  } catch {
    return null
  }
}

/** Adds badge ids to the ones the user has seen. */
export function markBadgesSeen(userId: string, ids: readonly string[]) {
  const raw = readSeen(userId)
  const seen = new Set<string>(raw ? (JSON.parse(raw) as string[]) : [])
  ids.forEach((id) => seen.add(id))
  try {
    localStorage.setItem(key(userId), JSON.stringify([...seen]))
  } catch {
    /* storage blocked: badges just won't pop up */
  }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/**
 * Earned badges the user has not been shown yet. The first time this runs for
 * a user (nothing stored), the badges already earned are stored as seen, so
 * existing accounts don't get a pile of pop-ups at once.
 */
export function useNewBadges(states: readonly BadgeState[] | null): string[] {
  const { user } = useAuth()
  const raw = useSyncExternalStore(subscribe, () => readSeen(user?.id))
  useEffect(() => {
    if (user && states && raw === null) markBadgesSeen(user.id, unseenBadges(states, new Set()))
  }, [user, states, raw])
  return useMemo(() => {
    if (!states || raw === null) return []
    return unseenBadges(states, new Set(JSON.parse(raw) as string[]))
  }, [states, raw])
}

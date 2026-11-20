import { useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/auth-context'

// The rest alarm on the server (table rest_alarms): a push at the end of the
// rest to this phone, which works even when the phone has put the app to sleep.
// Only set when this browser has notifications on for the account.

let armedFor: number | null = null

/** The server will send the alert for the rest ending at `endsAt`. */
export function isServerArmed(endsAt: number): boolean {
  return armedFor === endsAt
}

/** This browser's push subscription, when notifications are allowed. */
async function deviceEndpoint(): Promise<string | null> {
  if (!('serviceWorker' in navigator) || !('Notification' in window) || Notification.permission !== 'granted') return null
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager?.getSubscription()
  return subscription?.endpoint ?? null
}

/**
 * Keeps the server alarm in step with the running rest: set when a rest starts,
 * moved by −/+15, removed when it is skipped, switched off or the workout ends.
 */
export function useRestAlarm(endsAt: number | null) {
  const { user } = useAuth()
  const previous = useRef<number | null>(null)

  useEffect(() => {
    const before = previous.current
    previous.current = endsAt
    if (!user) return
    let cancelled = false

    if (endsAt === null || endsAt <= Date.now()) {
      // Nothing to cancel unless a rest was running (or armed before a reload).
      if (before === null && armedFor === null) return
      armedFor = null
      // Query builders only run once awaited, so `then` is what sends it.
      void supabase
        .from('rest_alarms')
        .delete()
        .eq('user_id', user.id)
        .then(
          () => {},
          () => {},
        )
      return
    }

    void (async () => {
      const endpoint = await deviceEndpoint()
      if (!endpoint || cancelled) return
      const { error } = await supabase
        .from('rest_alarms')
        .upsert({ user_id: user.id, endpoint, fires_at: new Date(endsAt).toISOString() })
      if (!error && !cancelled) armedFor = endsAt
    })().catch(() => {})

    return () => {
      cancelled = true
    }
  }, [user, endsAt])

  // Back in the app: a "Rest is over" notification has done its job.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      void navigator.serviceWorker
        .getRegistration()
        .then((registration) => registration?.getNotifications({ tag: 'rest' }))
        .then((shown) => shown?.forEach((n) => n.close()))
        .catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])
}

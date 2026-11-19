import { useCallback, useEffect, useState } from 'react'
import { keyBytes, pushSupport, subscriptionRow, VAPID_PUBLIC_KEY } from '../../lib/push'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/auth-context'

/** Where this browser stands: can it, may it, and is it signed up for this account? */
export type DeviceState = 'loading' | 'unsupported' | 'install' | 'denied' | 'off' | 'on'

function environment() {
  const ua = navigator.userAgent
  return {
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notification: 'Notification' in window,
    ios: /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1),
    standalone: window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true,
  }
}

/** The service worker, or null (dev server, or it failed to install). */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

async function currentState(userId: string): Promise<DeviceState> {
  const support = pushSupport(environment())
  if (support !== 'ok') return support
  const reg = await registration()
  if (!reg) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const sub = await reg.pushManager.getSubscription()
  if (!sub || Notification.permission !== 'granted') return 'off'
  // Subscribed in this browser, but maybe for another account that used it before.
  const { data } = await supabase.from('push_subscriptions').select('id').eq('endpoint', sub.endpoint).eq('user_id', userId).maybeSingle()
  return data ? 'on' : 'off'
}

async function subscribe(reg: ServiceWorkerRegistration): Promise<PushSubscription> {
  const options = { userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }
  try {
    return await reg.pushManager.subscribe(options)
  } catch (err) {
    // An old subscription made with another key blocks a new one: replace it.
    const old = await reg.pushManager.getSubscription()
    if (!old) throw err
    await old.unsubscribe()
    return reg.pushManager.subscribe(options)
  }
}

const PUSH_SERVICE_ERROR =
  'This browser could not reach its notification service. In Brave, turn on "Use Google services for push messaging" in Settings, Privacy and security. Or try another browser.'

/** Notifications on this phone: its state, and turning them on or off. */
export function usePushDevice() {
  const { user } = useAuth()
  const [state, setState] = useState<DeviceState>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    currentState(user.id).then(
      (s) => !cancelled && setState(s),
      () => !cancelled && setState('unsupported'),
    )
    return () => {
      cancelled = true
    }
  }, [user])

  const enable = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off')
        return
      }
      const reg = await navigator.serviceWorker.ready
      let sub: PushSubscription
      try {
        sub = await subscribe(reg)
      } catch {
        // The browser's own push service said no (Brave ships with it switched off).
        setError(PUSH_SERVICE_ERROR)
        return
      }
      const row = subscriptionRow(sub.toJSON())
      if (!row) throw new Error('No subscription')
      const { error: saveError } = await supabase.rpc('save_push_subscription', {
        p_endpoint: row.endpoint,
        p_p256dh: row.p256dh,
        p_auth: row.auth,
      })
      if (saveError) throw saveError
      setState('on')
    } catch {
      setError('Could not turn notifications on. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }, [])

  const disable = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      await forgetThisDevice()
      setState('off')
    } catch {
      setError('Could not turn notifications off. Try again.')
    } finally {
      setBusy(false)
    }
  }, [])

  return { state, busy, error, enable, disable }
}

/** Stops notifications to this browser for the signed-in account (also on sign-out). */
export async function forgetThisDevice(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const reg = await registration()
  const sub = await reg?.pushManager?.getSubscription()
  if (!sub) return
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  if (error) throw error
  await sub.unsubscribe()
}

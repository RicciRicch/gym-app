// Pure helpers for push notifications in the browser. The private half of the
// VAPID key lives only in Supabase Vault; this public half is meant to be public.

export const VAPID_PUBLIC_KEY = 'BLlwPBlPafMfA9ushZNh8UZgabyTCfxXAlM5aSfZ7QGufHYDO2xx8xywNvvs-7WV71GW89y3TrPAVG72xle2REg'

/** A base64url key as the bytes `pushManager.subscribe` wants. */
export function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64url.length / 4) * 4, '=')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

export type PushSupport = 'ok' | 'install' | 'unsupported'

export interface PushEnvironment {
  serviceWorker: boolean
  pushManager: boolean
  notification: boolean
  /** iPhone or iPad (including iPads that say they are a Mac). */
  ios: boolean
  /** Opened from the Home Screen as an app. */
  standalone: boolean
}

/** Can this browser get notifications? iOS only can once the app is on the Home Screen. */
export function pushSupport(env: PushEnvironment): PushSupport {
  if (env.ios && !env.standalone) return 'install'
  return env.serviceWorker && env.pushManager && env.notification ? 'ok' : 'unsupported'
}

export interface SubscriptionRow {
  endpoint: string
  p256dh: string
  auth: string
}

/** The parts of a browser subscription the server stores; null when something is missing. */
export function subscriptionRow(json: { endpoint?: string; keys?: Record<string, string> }): SubscriptionRow | null {
  const endpoint = json.endpoint
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!endpoint || !p256dh || !auth) return null
  return { endpoint, p256dh, auth }
}

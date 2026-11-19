import { describe, expect, it } from 'vitest'
import { keyBytes, pushSupport, subscriptionRow, VAPID_PUBLIC_KEY } from './push'

describe('push helpers', () => {
  it('turns the public key into 65 bytes of an uncompressed P-256 point', () => {
    const bytes = keyBytes(VAPID_PUBLIC_KEY)
    expect(bytes).toHaveLength(65)
    expect(bytes[0]).toBe(4)
  })

  it('knows when a browser can get notifications', () => {
    const all = { serviceWorker: true, pushManager: true, notification: true, ios: false, standalone: false }
    expect(pushSupport(all)).toBe('ok')
    expect(pushSupport({ ...all, pushManager: false })).toBe('unsupported')
    // iPhone Safari: only from the Home Screen.
    expect(pushSupport({ ...all, ios: true })).toBe('install')
    expect(pushSupport({ ...all, ios: true, standalone: true })).toBe('ok')
  })

  it('keeps only what the server needs from a subscription', () => {
    expect(subscriptionRow({ endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'a', auth: 'b' } })).toEqual({
      endpoint: 'https://fcm.googleapis.com/x',
      p256dh: 'a',
      auth: 'b',
    })
    expect(subscriptionRow({ endpoint: 'https://fcm.googleapis.com/x' })).toBeNull()
  })
})

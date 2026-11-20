import { describe, expect, it } from 'vitest'
import { restAlert, showRestPush } from './rest-alert'

const env = { visible: true, canVibrate: true, permission: 'granted' as const, serverArmed: false }

describe('rest alert', () => {
  it('vibrates while the app is on screen', () => {
    expect(restAlert(env)).toBe('vibrate')
    expect(restAlert({ ...env, serverArmed: true })).toBe('vibrate')
    expect(restAlert({ ...env, permission: 'unsupported' })).toBe('vibrate')
  })

  it('leaves it to the server push when an alarm is set', () => {
    expect(restAlert({ ...env, visible: false, serverArmed: true })).toBe('server')
    // iPhone: no vibrate API, the push is the alert even with the app open.
    expect(restAlert({ ...env, canVibrate: false, serverArmed: true })).toBe('server')
  })

  it('shows a notification itself when no alarm could be set', () => {
    expect(restAlert({ ...env, visible: false })).toBe('notify')
    expect(restAlert({ ...env, canVibrate: false })).toBe('notify')
  })

  it('falls back to a plain buzz, or nothing', () => {
    expect(restAlert({ ...env, visible: false, permission: 'default' })).toBe('vibrate')
    expect(restAlert({ ...env, canVibrate: false, permission: 'unsupported' })).toBe('none')
  })

  it('skips the push only on Android with the app open', () => {
    const android = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/131.0 Mobile Safari/537.36'
    const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
    expect(showRestPush(android, true)).toBe(false)
    expect(showRestPush(android, false)).toBe(true)
    expect(showRestPush(iphone, true)).toBe(true)
    expect(showRestPush(iphone, false)).toBe(true)
  })
})

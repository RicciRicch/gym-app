import { describe, expect, it } from 'vitest'
import { offerBackgroundAlert, restAlert } from './rest-alert'

describe('rest alert', () => {
  it('vibrates while the app is on screen', () => {
    expect(restAlert({ visible: true, canVibrate: true, permission: 'granted' })).toBe('vibrate')
    expect(restAlert({ visible: true, canVibrate: true, permission: 'unsupported' })).toBe('vibrate')
  })

  it('sends a notification in the background, or where pages cannot vibrate', () => {
    expect(restAlert({ visible: false, canVibrate: true, permission: 'granted' })).toBe('notify')
    // iPhone home-screen app: no vibrate API, but notifications buzz.
    expect(restAlert({ visible: true, canVibrate: false, permission: 'granted' })).toBe('notify')
  })

  it('falls back to a plain buzz, or nothing', () => {
    expect(restAlert({ visible: false, canVibrate: true, permission: 'default' })).toBe('vibrate')
    expect(restAlert({ visible: true, canVibrate: false, permission: 'unsupported' })).toBe('none')
  })

  it('offers notifications only when the browser has not been asked yet', () => {
    expect(offerBackgroundAlert({ canVibrate: true, permission: 'default' })).toBe(true)
    expect(offerBackgroundAlert({ canVibrate: true, permission: 'granted' })).toBe(false)
    expect(offerBackgroundAlert({ canVibrate: true, permission: 'denied' })).toBe(false)
    expect(offerBackgroundAlert({ canVibrate: false, permission: 'unsupported' })).toBe(false)
  })
})

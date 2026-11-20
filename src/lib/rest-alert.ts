// How to tell someone their rest is over. A page may only vibrate the phone while
// it is on screen (and iPhones never let it), and a sleeping phone stops the
// page's timers. So when notifications are on, the app also leaves an alarm on
// the server, which sends a real push notification at the end of the rest.

export type RestAlert = 'vibrate' | 'server' | 'notify' | 'none'

export const REST_BUZZ = [300, 150, 300, 150, 300]

export interface AlertEnvironment {
  /** The app is on screen. */
  visible: boolean
  /** navigator.vibrate exists (not on iPhone). */
  canVibrate: boolean
  /** Notification permission; 'unsupported' without the Notification API or a service worker. */
  permission: NotificationPermission | 'unsupported'
  /** The server holds an alarm for this rest and will send the push itself. */
  serverArmed: boolean
}

/** What the page does itself when the rest timer reaches zero. */
export function restAlert(env: AlertEnvironment): RestAlert {
  if (env.visible && env.canVibrate) return 'vibrate'
  if (env.serverArmed) return 'server'
  if (env.permission === 'granted') return 'notify'
  // In the background without permission: try anyway, some browsers still buzz.
  return env.canVibrate ? 'vibrate' : 'none'
}

/**
 * Whether the service worker shows a rest push. Android buzzes from the open
 * app itself, so a second alert on top would be noise; Chrome allows a push
 * without a notification while the site is on screen. Everywhere else (iPhone)
 * the push is the only alert.
 */
export function showRestPush(userAgent: string, appVisible: boolean): boolean {
  return !(appVisible && /Android/i.test(userAgent))
}

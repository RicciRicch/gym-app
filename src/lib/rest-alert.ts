// How to tell someone their rest is over. A page may only vibrate the phone while
// it is on screen (and iPhones never let it), so in the background a notification
// does the job: the phone shows it and vibrates by itself.

export type RestAlert = 'vibrate' | 'notify' | 'none'

export const REST_BUZZ = [300, 150, 300, 150, 300]

export interface AlertEnvironment {
  /** The app is on screen. */
  visible: boolean
  /** navigator.vibrate exists (not on iPhone). */
  canVibrate: boolean
  /** Notification permission; 'unsupported' without the Notification API or a service worker. */
  permission: NotificationPermission | 'unsupported'
}

export function restAlert(env: AlertEnvironment): RestAlert {
  if (env.visible && env.canVibrate) return 'vibrate'
  if (env.permission === 'granted') return 'notify'
  // In the background without permission: try anyway, some browsers still buzz.
  return env.canVibrate ? 'vibrate' : 'none'
}

/** Whether to offer "allow notifications" so rest also ends with a buzz when the screen is off. */
export function offerBackgroundAlert(env: Omit<AlertEnvironment, 'visible'>): boolean {
  return env.permission === 'default'
}

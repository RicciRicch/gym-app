import { REST_BUZZ, restAlert, type AlertEnvironment } from '../../lib/rest-alert'

/** What this browser can do right now. */
export function alertEnvironment(): AlertEnvironment {
  const notifications = 'Notification' in window && 'serviceWorker' in navigator
  return {
    visible: document.visibilityState === 'visible',
    canVibrate: 'vibrate' in navigator,
    permission: notifications ? Notification.permission : 'unsupported',
  }
}

/** Rest is over: buzz the phone, or show a notification that buzzes it. */
export async function restOver(): Promise<void> {
  const env = alertEnvironment()
  const how = restAlert(env)
  if (how === 'vibrate') {
    navigator.vibrate(REST_BUZZ)
    return
  }
  if (how !== 'notify') return
  // The service worker only runs in the built app; without it, try a plain buzz.
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) {
    if (env.canVibrate) navigator.vibrate(REST_BUZZ)
    return
  }
  await registration.showNotification('Rest is over', {
    body: 'Time for your next set.',
    tag: 'rest',
    icon: `${import.meta.env.BASE_URL}icon-192.png`,
    data: { url: 'workout' },
    // Not in every TypeScript DOM lib yet, supported by Android Chrome.
    ...({ renotify: true, vibrate: REST_BUZZ } as object),
  })
  // Once the app is back on screen the notification has done its job.
  const onVisible = () => {
    if (document.visibilityState !== 'visible') return
    document.removeEventListener('visibilitychange', onVisible)
    void registration.getNotifications({ tag: 'rest' }).then((shown) => shown.forEach((n) => n.close()))
  }
  document.addEventListener('visibilitychange', onVisible)
}

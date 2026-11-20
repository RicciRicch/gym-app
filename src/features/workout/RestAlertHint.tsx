import { useState } from 'react'
import { offerBackgroundAlert } from '../../lib/rest-alert'
import { alertEnvironment } from './rest-alert'

/**
 * Under the rest picker: the phone buzzes when rest is over while the app is on
 * screen; with notifications allowed it also does with the screen off.
 */
export function RestAlertHint() {
  const [env, setEnv] = useState(alertEnvironment)
  const [asking, setAsking] = useState(false)

  if (offerBackgroundAlert(env)) {
    return (
      <button
        type="button"
        disabled={asking}
        onClick={async () => {
          setAsking(true)
          try {
            await Notification.requestPermission()
          } finally {
            setAsking(false)
            setEnv(alertEnvironment())
          }
        }}
        className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-xl bg-surface-2 px-3 text-left text-sm transition active:scale-[0.98]"
      >
        <BellIcon />
        <span className="flex-1">
          <span className="block font-semibold">Buzz with the screen off too</span>
          <span className="block text-xs text-muted">Allow notifications for the end of each rest.</span>
        </span>
      </button>
    )
  }

  const text =
    env.permission === 'granted'
      ? 'The phone buzzes when rest is over, even with the screen off.'
      : env.canVibrate
        ? 'The phone buzzes when rest is over while the app is open.'
        : 'This browser cannot buzz. Add the app to your Home Screen and allow notifications to get an alert.'
  return <p className="mt-3 text-xs text-muted">{text}</p>
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  )
}

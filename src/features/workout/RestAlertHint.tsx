import { usePushDevice } from '../notifications/push'

/**
 * Under the rest picker: how the end of a rest reaches you on this phone. With
 * notifications on, a push arrives even when the phone has put the app to sleep.
 */
export function RestAlertHint() {
  const device = usePushDevice()
  const canVibrate = 'vibrate' in navigator

  if (device.state === 'loading') return null

  if (device.state === 'off') {
    return (
      <div className="mt-3">
        <button
          type="button"
          disabled={device.busy}
          onClick={device.enable}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl bg-surface-2 px-3 py-2 text-left text-sm transition active:scale-[0.98] disabled:opacity-60"
        >
          <BellIcon />
          <span className="flex-1">
            <span className="block font-semibold">{device.busy ? 'Turning on...' : 'Buzz with the screen off too'}</span>
            <span className="block text-xs text-muted">Turns on notifications for this phone.</span>
          </span>
        </button>
        {device.error && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {device.error}
          </p>
        )}
      </div>
    )
  }

  const text = {
    on: 'The phone buzzes when rest is over, even with the screen off.',
    denied: canVibrate
      ? 'The phone buzzes while the app is open. Allow notifications in the phone settings to get it with the screen off.'
      : 'Notifications are blocked, so there is no alert when rest is over. Allow them in the phone settings.',
    install: 'On iPhone, add the app to your Home Screen and turn on notifications to get an alert when rest is over.',
    unsupported: canVibrate ? 'The phone buzzes when rest is over while the app is open.' : 'This browser cannot alert you when rest is over.',
  }[device.state]
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

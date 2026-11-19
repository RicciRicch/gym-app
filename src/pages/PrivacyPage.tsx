import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sheet } from '../components/Sheet'
import { Button } from '../components/ui'
import { useProfile } from '../features/auth/useProfile'
import { usePushDevice, type DeviceState } from '../features/notifications/push'
import { useRegenerateFriendCode, useUpdatePrivacy, type PrivacySetting } from '../features/privacy/api'
import { POST_DAYS } from '../lib/feed'

/** What friends see, who may reach you, and the photo step after a workout. */
export function PrivacyPage() {
  const { data: profile } = useProfile()
  const update = useUpdatePrivacy()
  const [newCode, setNewCode] = useState(false)
  if (!profile) return null

  const toggle = (setting: PrivacySetting, title: string, text: string) => (
    <Toggle
      title={title}
      text={text}
      checked={profile[setting]}
      onChange={(value) => update.mutate({ setting, value })}
    />
  )

  return (
    <div className="animate-fade-up pb-6">
      <Link to="/profile" className="-ml-1 inline-flex min-h-11 items-center gap-1 pt-2 font-semibold text-muted">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m15 6-6 6 6 6" />
        </svg>
        Profile
      </Link>
      <h1 className="text-3xl font-black tracking-tight">Privacy &amp; notifications</h1>

      {update.isError && (
        <p role="alert" className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
          Could not save that. Check your connection and try again.
        </p>
      )}

      <Group title="Notifications">
        <ThisDevice />
        {toggle('notify_nudges', 'Nudges', 'When a friend tells you to get off the couch.')}
        {toggle('notify_friends', 'Friend requests', 'When someone asks to be friends, or accepts your request.')}
        {toggle('notify_reactions', 'Reactions', 'When friends react to your posts.')}
      </Group>

      <Group title="What friends see">
        {toggle('share_activity', 'When you train', 'Your last workout, days and sets this week and the last four weeks. Off: you also leave the weekly table.')}
        {toggle('share_streak', 'Streak', 'Your week streak and its flame.')}
        {toggle('share_badges', 'Badges and records', 'Your medals and how many PRs you have set.')}
        <p className="flex items-start gap-3 px-1 pt-2 text-sm text-muted">
          <LockIcon />
          Weights and body weight are never shown to friends.
        </p>
      </Group>

      <Group title="Friends">
        {toggle('accept_requests', 'Friend requests', 'Anyone with your code or invite link can ask. Off: nobody can send you a new request.')}
        {toggle('accept_nudges', 'Nudges', 'Friends can tell your gorilla to get you off the couch, once a day.')}
        <div className="flex min-h-16 items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-bold">Friend code</p>
            <p className="font-mono text-sm tracking-widest text-muted">{profile.friend_code}</p>
          </div>
          <button
            type="button"
            onClick={() => setNewCode(true)}
            className="min-h-11 shrink-0 rounded-xl bg-surface px-4 text-sm font-semibold text-text transition active:scale-95"
          >
            New code
          </button>
        </div>
      </Group>

      <Group title="After a workout">
        {toggle('ask_proof', 'Ask for a proof photo', 'The camera opens after the summary when you have friends. Off: the workout simply ends.')}
        <p className="px-1 pt-2 text-sm text-muted">
          Nothing is posted until you tap &ldquo;Post to friends&rdquo;. Posts disappear after {POST_DAYS} days.
        </p>
      </Group>

      {newCode && <NewCodeSheet onClose={() => setNewCode(false)} />}
    </div>
  )
}

const DEVICE_TEXT: Record<Exclude<DeviceState, 'loading'>, string> = {
  on: 'Notifications are on for this phone.',
  off: 'Turn them on to hear about nudges, friend requests and reactions right away.',
  denied: 'Notifications are blocked for this app. Allow them in the browser or phone settings, then come back.',
  install: 'On iPhone, add the app to your Home Screen first (Share, then Add to Home Screen) and open it from there.',
  unsupported: 'This browser cannot show notifications. Try the app on your phone.',
}

/** Turns push on or off for the browser in hand; the switches below apply to every device. */
function ThisDevice() {
  const device = usePushDevice()
  const { state } = device
  return (
    <div className="py-3">
      <div className="flex min-h-12 items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-bold">This phone</p>
          <p className="mt-0.5 text-sm text-muted">{state === 'loading' ? 'Checking...' : DEVICE_TEXT[state]}</p>
        </div>
        {(state === 'off' || state === 'on') && (
          <Button
            variant={state === 'on' ? 'secondary' : 'primary'}
            className="shrink-0 px-4"
            loading={device.busy}
            onClick={state === 'on' ? device.disable : device.enable}
          >
            {state === 'on' ? 'Turn off' : 'Turn on'}
          </Button>
        )}
      </div>
      {device.error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {device.error}
        </p>
      )}
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="text-sm font-semibold tracking-widest text-muted uppercase">{title}</h2>
      <div className="mt-1 flex flex-col divide-y divide-line/60">{children}</div>
    </section>
  )
}

function Toggle({ title, text, checked, onChange }: { title: string; text: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-16 w-full items-center gap-4 py-3 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{text}</span>
      </span>
      <span
        aria-hidden="true"
        className={`relative h-8 w-13 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-accent' : 'bg-surface-2'}`}
      >
        <span
          className={`absolute top-1 left-1 size-6 rounded-full shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5 bg-accent-ink' : 'bg-muted'}`}
        />
      </span>
    </button>
  )
}

function NewCodeSheet({ onClose }: { onClose: () => void }) {
  const regenerate = useRegenerateFriendCode()
  return (
    <Sheet title="Get a new friend code?" onClose={regenerate.isPending ? () => {} : onClose}>
      <p className="text-muted">
        Your old code, invite links and QR code stop working. Friends you already have stay, and so do open requests.
      </p>
      {regenerate.isError && (
        <p role="alert" className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
          Could not change the code. Try again.
        </p>
      )}
      <div className="mt-5 flex flex-col gap-2 pb-2">
        <Button className="w-full" loading={regenerate.isPending} onClick={() => regenerate.mutate(undefined, { onSuccess: onClose })}>
          New code
        </Button>
        <Button variant="ghost" className="w-full" disabled={regenerate.isPending} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Sheet>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  )
}

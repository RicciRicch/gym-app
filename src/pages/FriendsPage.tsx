import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mascot } from '../components/Mascot'
import { Flame } from '../components/Flame'
import { Avatar, Button, Field, PageLoader } from '../components/ui'
import { avatarPhotoUrl } from '../features/avatar/api'
import { useAcceptFriendRequest, useFriends, useRemoveFriendship, useTogether, type Friend } from '../features/friends/api'
import { usePostAuthors } from '../features/feed/authors'
import { FeedStrip } from '../features/feed/FeedStrip'
import { useAuth } from '../features/auth/auth-context'
import { FistBump, type Buddy } from '../features/friends/FistBump'
import { GymPass } from '../features/friends/GymPass'
import { openInvite } from '../features/friends/invite-store'
import { NudgeButton } from '../features/friends/NudgeButton'
import { WeeklyTable } from '../features/friends/WeeklyTable'
import { QUIET_DAYS, lastWorkoutLabel, liveStreak, parseFriendCode, splitQuiet } from '../lib/friends'
import { toISODate } from '../lib/schedule'

/** Friends: your gym pass, adding by code, requests, the weekly table and the list. */
export function FriendsPage() {
  const friends = useFriends()
  const [bumped, setBumped] = useState<Buddy | null>(null)
  const all = friends.data ?? []
  const incoming = all.filter((f) => f.status === 'incoming')
  const outgoing = all.filter((f) => f.status === 'outgoing')
  const accepted = all.filter((f) => f.status === 'accepted')
  const { active, quiet } = splitQuiet(accepted, toISODate(new Date()))
  const { user } = useAuth()
  const authors = usePostAuthors()

  return (
    <div className="animate-fade-up">
      <h1 className="pt-2 text-3xl font-black tracking-tight">Friends</h1>

      {incoming.length > 0 && (
        <section className="mt-5">
          <h2 className="text-sm font-semibold tracking-widest text-accent uppercase">Wants to train with you</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {incoming.map((f) => (
              <RequestRow key={f.friendshipId} friend={f} onAccepted={() => setBumped({ name: f.name, avatarKey: f.avatarKey, avatarPath: f.avatarPath })} />
            ))}
          </ul>
        </section>
      )}

      {accepted.length > 0 && <FeedStrip authors={authors} me={user?.id} className="mt-5" />}

      <GymPass className="mt-5" />
      <AddByCode />

      {friends.isPending ? (
        <PageLoader label="Loading friends" />
      ) : friends.isError ? (
        <div className="pt-10 text-center">
          <p className="font-bold">Could not load your friends</p>
          <button className="mt-2 min-h-11 px-4 font-semibold text-accent" onClick={() => friends.refetch()}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <WeeklyTable className="mt-6" />

          {accepted.length > 0 ? (
            <>
              {active.length > 0 && (
                <section className="mt-6">
                  <h2 className="text-sm font-semibold tracking-widest text-muted uppercase">Your friends · {active.length}</h2>
                  <ul className="mt-2 flex flex-col gap-2">
                    {active.map((f) => (
                      <FriendRow key={f.id} friend={f} />
                    ))}
                  </ul>
                </section>
              )}
              {quiet.length > 0 && <QuietFriends friends={quiet} openAtStart={active.length === 0} />}
            </>
          ) : (
            <div className="mt-8 flex flex-col items-center text-center">
              <Mascot pose="sad" className="h-28" />
              <p className="mt-3 text-lg font-bold">Training alone?</p>
              <p className="mt-1 text-muted">Send your pass to a gym buddy. I&apos;ll keep score.</p>
            </div>
          )}

          {outgoing.length > 0 && (
            <section className="mt-6">
              <h2 className="text-sm font-semibold tracking-widest text-muted uppercase">Waiting for an answer</h2>
              <ul className="mt-2 flex flex-col gap-2">
                {outgoing.map((f) => (
                  <PendingRow key={f.friendshipId} friend={f} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {bumped && <FistBump buddy={bumped} onClose={() => setBumped(null)} />}
    </div>
  )
}

function AddByCode() {
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    const code = parseFriendCode(value)
    if (!code) return setInvalid(true)
    setValue('')
    openInvite(code)
  }

  return (
    <form onSubmit={submit} className="mt-6 flex items-start gap-2">
      <Field
        label="Got a friend's code?"
        className="flex-1"
        value={value}
        maxLength={80}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        placeholder="GORILA-4X2P"
        onChange={(e) => {
          setValue(e.target.value)
          setInvalid(false)
        }}
        error={invalid ? 'A code looks like GORILA-4X2P.' : null}
      />
      <Button type="submit" variant="secondary" className="mt-7" disabled={!value.trim()}>
        Add
      </Button>
    </form>
  )
}

const row = 'flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface py-2 pr-2 pl-3'

function RequestRow({ friend, onAccepted }: { friend: Friend; onAccepted: () => void }) {
  const accept = useAcceptFriendRequest()
  const remove = useRemoveFriendship()
  const busy = accept.isPending || remove.isPending
  return (
    <li className={`${row} border-accent/40 bg-accent/10`}>
      <Avatar avatarKey={friend.avatarKey} photoUrl={avatarPhotoUrl(friend.avatarPath)} className="size-11 shrink-0" />
      <span className="min-w-0 flex-1 truncate font-bold">{friend.name}</span>
      <button
        className="min-h-11 px-2 text-sm font-semibold text-muted disabled:opacity-50"
        disabled={busy}
        onClick={() => remove.mutate(friend.friendshipId)}
      >
        Decline
      </button>
      <Button className="min-h-11 px-4" loading={accept.isPending} disabled={busy} onClick={() => accept.mutate(friend.friendshipId, { onSuccess: onAccepted })}>
        Accept
      </Button>
    </li>
  )
}

function PendingRow({ friend }: { friend: Friend }) {
  const remove = useRemoveFriendship()
  return (
    <li className={row}>
      <Avatar avatarKey={friend.avatarKey} photoUrl={avatarPhotoUrl(friend.avatarPath)} className="size-11 shrink-0 opacity-70" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{friend.name}</span>
        <span className="block text-sm text-muted">Request sent</span>
      </span>
      <button
        className="min-h-11 px-3 text-sm font-semibold text-muted disabled:opacity-50"
        disabled={remove.isPending}
        onClick={() => remove.mutate(friend.friendshipId)}
      >
        Cancel
      </button>
    </li>
  )
}

/** Friends without a workout for QUIET_DAYS+, folded away so the list shows who is training. */
function QuietFriends({ friends, openAtStart }: { friends: Friend[]; openAtStart: boolean }) {
  const [open, setOpen] = useState(openAtStart)
  return (
    <section className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="-mx-1 flex min-h-11 w-[calc(100%+0.5rem)] items-center gap-2 px-1 text-left"
      >
        <span className="flex-1 text-sm font-semibold tracking-widest text-muted uppercase">Quiet lately · {friends.length}</span>
        <svg
          viewBox="0 0 24 24"
          className={`size-5 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <>
          <p className="text-sm text-muted">No workout in {QUIET_DAYS}+ days. A nudge might get them moving.</p>
          <ul className="mt-2 flex flex-col gap-2">
            {friends.map((f) => (
              <FriendRow key={f.id} friend={f} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function FriendRow({ friend }: { friend: Friend }) {
  const today = toISODate(new Date())
  const streak = liveStreak(friend.streakWeeks, friend.streakWeek, today)
  const together = useTogether().get(friend.id)
  return (
    <li className={row}>
      <Link to={`/friends/${friend.id}`} className="flex min-w-0 flex-1 items-center gap-3 transition active:scale-[0.98]">
        <Avatar avatarKey={friend.avatarKey} photoUrl={avatarPhotoUrl(friend.avatarPath)} className="size-11 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-bold">{friend.name}</span>
            {streak > 0 && (
              <span className="flex shrink-0 items-center text-sm font-bold text-muted">
                <Flame level={streak >= 4 ? 3 : 2} className="h-4" />
                {streak}
              </span>
            )}
          </span>
          <span className="block truncate text-sm text-muted">
            {friend.sharesActivity ? lastWorkoutLabel(friend.lastDate, friend.lastDay, today) : 'Workouts are private'}
            {together && ` · 🤝 ${together.count} together`}
          </span>
        </span>
      </Link>
      <NudgeButton friend={friend} compact />
    </li>
  )
}

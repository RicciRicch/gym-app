import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Flame } from '../components/Flame'
import { Sheet } from '../components/Sheet'
import { Avatar, Button, PageLoader } from '../components/ui'
import { avatarPhotoUrl } from '../features/avatar/api'
import { Medal } from '../features/badges/Medal'
import { useFriends, useRemoveFriendship, type Friend } from '../features/friends/api'
import { NudgeButton } from '../features/friends/NudgeButton'
import { BADGES } from '../lib/badges'
import { lastWorkoutLabel, liveStreak } from '../lib/friends'
import { addDays, startOfWeek, toISODate, WEEKDAY_SHORT } from '../lib/schedule'

/** A friend's profile: streak, this week, the last four weeks and their badges. No weights. */
export function FriendPage() {
  const { friendId } = useParams()
  const friends = useFriends()
  const [removing, setRemoving] = useState(false)
  const friend = friends.data?.find((f) => f.id === friendId && f.status === 'accepted')

  if (friends.isPending) return <PageLoader label="Loading friend" />
  if (!friend) return <Navigate to="/friends" replace />

  const today = toISODate(new Date())
  const streak = liveStreak(friend.streakWeeks, friend.streakWeek, today)
  const earned = BADGES.filter((b) => friend.badgeIds.includes(b.id))

  return (
    <div className="animate-fade-up pt-2">
      <Link to="/friends" className="-ml-1 inline-flex min-h-11 items-center gap-1 font-semibold text-muted">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m15 6-6 6 6 6" />
        </svg>
        Friends
      </Link>

      <div className="mt-2 flex flex-col items-center text-center">
        <Avatar avatarKey={friend.avatarKey} photoUrl={avatarPhotoUrl(friend.avatarPath)} className="size-28 ring-4 ring-line" />
        <h1 className="mt-4 text-2xl font-black tracking-tight">{friend.name}</h1>
        <p className="text-muted">{lastWorkoutLabel(friend.lastDate, friend.lastDay, today)}</p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Stat label="week streak">
          <span className="flex items-center justify-center gap-1">
            <Flame level={streak >= 4 ? 3 : streak >= 1 ? 2 : friend.weekDays > 0 ? 1 : 0} className="h-6" />
            {streak}
          </span>
        </Stat>
        <Stat label="sets this week">{friend.weekSets}</Stat>
        <Stat label="records">{friend.prCount}</Stat>
      </div>

      <section className="mt-3 rounded-3xl border border-line bg-surface p-4">
        <h2 className="font-bold">Last four weeks</h2>
        <ActivityGrid dates={friend.recentDates} today={today} />
      </section>

      <section className="mt-3 rounded-3xl border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">Badges</h2>
          <span className="text-sm text-muted">
            {earned.length} of {BADGES.length}
          </span>
        </div>
        {earned.length > 0 ? (
          <ul className="mt-3 grid grid-cols-4 gap-x-2 gap-y-3">
            {earned.map((badge) => (
              <li key={badge.id} className="flex flex-col items-center gap-1 text-center">
                <Medal badge={badge} size={56} />
                <span className="text-[11px] leading-tight font-semibold text-muted">{badge.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No badges yet. Give it time.</p>
        )}
      </section>

      <div className="mt-5">
        <NudgeButton friend={friend} />
      </div>
      <button onClick={() => setRemoving(true)} className="mx-auto mt-6 block min-h-11 px-4 text-sm font-semibold text-danger/80">
        Remove friend
      </button>

      {removing && <RemoveSheet friend={friend} onClose={() => setRemoving(false)} />}
    </div>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-line bg-surface px-2 py-3 text-center">
      <p className="text-2xl font-black tabular-nums">{children}</p>
      <p className="mt-0.5 text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</p>
    </div>
  )
}

/** Four weeks of days, Monday to Sunday, lit where the friend trained. */
function ActivityGrid({ dates, today }: { dates: readonly string[]; today: string }) {
  const trained = new Set(dates)
  const first = addDays(startOfWeek(today), -21)
  const count = dates.filter((d) => d >= first).length
  return (
    <>
      <div className="mt-3 grid grid-cols-7 gap-1.5" role="img" aria-label={`${count} workouts in the last four weeks`}>
        {WEEKDAY_SHORT.map((d) => (
          <span key={d} className="text-center text-[10px] font-semibold text-muted">
            {d[0]}
          </span>
        ))}
        {Array.from({ length: 28 }, (_, i) => addDays(first, i)).map((date) => (
          <span
            key={date}
            className={`h-6 rounded-lg ${trained.has(date) ? 'bg-accent' : date > today ? 'border border-dashed border-line' : 'bg-surface-2'} ${date === today ? 'ring-2 ring-accent/50' : ''}`}
          />
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">
        {count} {count === 1 ? 'workout' : 'workouts'}
      </p>
    </>
  )
}

function RemoveSheet({ friend, onClose }: { friend: Friend; onClose: () => void }) {
  const remove = useRemoveFriendship()
  const navigate = useNavigate()
  return (
    <Sheet title={`Remove ${friend.name}?`} onClose={remove.isPending ? () => {} : onClose}>
      <p className="text-muted">You will no longer see each other&apos;s streak, badges or weekly sets. You can add each other again any time.</p>
      {remove.isError && (
        <p role="alert" className="mt-4 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          Could not remove this friend. Try again.
        </p>
      )}
      <div className="mt-5 flex flex-col gap-2 pb-2">
        <Button
          variant="danger"
          className="w-full"
          loading={remove.isPending}
          onClick={() => remove.mutate(friend.friendshipId, { onSuccess: () => navigate('/friends', { replace: true }) })}
        >
          Remove friend
        </Button>
        <Button variant="ghost" className="w-full" disabled={remove.isPending} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Sheet>
  )
}

import { useState } from 'react'
import { Flame } from '../components/Flame'
import { BadgeShelf } from '../features/badges/BadgeShelf'
import { UnlockOverlay, type MedalRect } from '../features/badges/BadgeUnlock'
import { Medal } from '../features/badges/Medal'
import { BADGES, type BadgeState } from '../lib/badges'
import { GorillaBubble } from '../features/gorilla/GorillaCard'
import { StreakCard } from '../features/streak/StreakCard'
import { WorkoutSummaryScreen } from '../features/workout/WorkoutSummaryScreen'
import type { Streak } from '../lib/streak'
import type { WorkoutSummary } from '../lib/summary'

// Dev-only playground (/dev/celebration, not in the production build) for the
// post-workout celebration and the streak flame. ?prs=2 opens the summary
// straight away (handy for headless screenshots), ?badge=1|2 the badge unlock screen,
// ?shelf=1 the badge shelf with two medals flying in.

const prs: WorkoutSummary['prs'] = [
  { exerciseId: 'a', name: 'Back Squat', metric: 'weight', top: { weight: 105, reps: 3 }, previous: { weight: 102.5, reps: 2 } },
  { exerciseId: 'b', name: 'Pull-up', metric: 'reps', top: { weight: 0, reps: 12 }, previous: { weight: 0, reps: 10 } },
]

const summary = (count: number): WorkoutSummary => ({
  dayName: 'Legs',
  durationSeconds: 3125,
  exercises: 5,
  sets: 16,
  reps: 142,
  volumeKg: 8450,
  prs: prs.slice(0, count),
})

const UNLOCKED = [BADGES[13], BADGES[1]]
const shelfStates: BadgeState[] = BADGES.map((badge, i) => {
  const earned = i % 4 !== 3 || UNLOCKED.includes(badge)
  return { badge, progress: earned ? badge.goal : Math.floor(badge.goal * 0.6), earnedOn: earned ? '2026-11-15' : null }
})

const streak = (weeks: number, thisWeek: number, level: Streak['level']): Streak => ({
  weeks,
  thisWeek,
  target: 5,
  weekDone: thisWeek >= 5,
  frozen: false,
  level,
})

export function CelebrationPreview() {
  const [show, setShow] = useState<{ prs: number; run: number } | null>(() => {
    const auto = new URLSearchParams(window.location.search).get('prs')
    return auto === null ? null : { prs: Number(auto), run: 0 }
  })
  const [unlock, setUnlock] = useState(() => Number(new URLSearchParams(window.location.search).get('badge') ?? 0))
  const [shelf, setShelf] = useState<{ from?: MedalRect } | null>(() =>
    new URLSearchParams(window.location.search).has('shelf') ? {} : null,
  )
  if (shelf) {
    return (
      <div className="mx-auto max-w-md px-5 pt-4 pb-10">
        <BadgeShelf states={shelfStates} fresh={UNLOCKED.map((b) => b.id)} from={shelf.from} onSeen={() => {}} />
      </div>
    )
  }
  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 px-5 pt-4 pb-10">
      <h1 className="text-2xl font-black">Celebration preview</h1>
      {[2, 1, 0].map((n) => (
        <button
          key={n}
          className="min-h-12 rounded-2xl bg-surface-2 font-bold"
          onClick={() => setShow({ prs: n, run: (show?.run ?? 0) + 1 })}
        >
          Finish with {n} PR{n === 1 ? '' : 's'}
        </button>
      ))}
      <button className="min-h-12 rounded-2xl bg-surface-2 font-bold" onClick={() => setUnlock(2)}>
        Unlock 2 badges
      </button>
      <div className="grid grid-cols-5 gap-2 rounded-3xl bg-surface p-4">
        {BADGES.map((b, i) => (
          <Medal key={b.id} badge={b} size={56} locked={i % 4 === 3} shine />
        ))}
      </div>
      <div className="flex items-end justify-around rounded-3xl bg-surface p-4">
        {([0, 1, 2, 3] as const).map((level) => (
          <Flame key={level} level={level} className="h-24" />
        ))}
      </div>
      <GorillaBubble says={{ mood: 'coach', line: "Push is waiting. I don't wait long." }} />
      <GorillaBubble says={{ mood: 'proud', line: "Bench Press: 100 kg × 5. Who's the king of the jungle?" }} />
      <GorillaBubble says={{ mood: 'sad', line: 'Skipped legs again? 🦵🐔' }} />
      <GorillaBubble says={{ mood: 'sleepy', line: 'Rest day. Recovery is part of the plan. Zzz.' }} />
      <StreakCard streak={{ ...streak(3, 1, 2), frozen: true }} action={<span className="grid size-12 place-items-center rounded-2xl border border-sky-300/60 bg-sky-400/20 text-2xl">🧊</span>} />
      <StreakCard streak={streak(0, 0, 0)} />
      <StreakCard streak={streak(0, 1, 1)} />
      <StreakCard streak={streak(3, 2, 2)} />
      <StreakCard streak={streak(7, 5, 3)} />
      {unlock > 0 && (
        <UnlockOverlay
          badges={UNLOCKED.slice(0, unlock)}
          onShelf={(from) => {
            setUnlock(0)
            setShelf({ from })
          }}
          onLater={() => setUnlock(0)}
        />
      )}
      {show && (
        <WorkoutSummaryScreen
          key={show.run}
          summary={summary(show.prs)}
          streak={{ before: streak(2, 4, 2), after: streak(3, 5, 2) }}
          onDone={() => setShow(null)}
        />
      )}
    </div>
  )
}

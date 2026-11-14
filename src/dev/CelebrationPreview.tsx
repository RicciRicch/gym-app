import { useState } from 'react'
import { Flame } from '../components/Flame'
import { StreakCard } from '../features/streak/StreakCard'
import { WorkoutSummaryScreen } from '../features/workout/WorkoutSummaryScreen'
import type { Streak } from '../lib/streak'
import type { WorkoutSummary } from '../lib/summary'

// Dev-only playground (/dev/celebration, not in the production build) for the
// post-workout celebration and the streak flame. ?prs=2 opens the summary
// straight away (handy for headless screenshots).

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

const streak = (weeks: number, thisWeek: number, level: Streak['level']): Streak => ({
  weeks,
  thisWeek,
  target: 5,
  weekDone: thisWeek >= 5,
  level,
})

export function CelebrationPreview() {
  const [show, setShow] = useState<{ prs: number; run: number } | null>(() => {
    const auto = new URLSearchParams(window.location.search).get('prs')
    return auto === null ? null : { prs: Number(auto), run: 0 }
  })
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
      <div className="flex items-end justify-around rounded-3xl bg-surface p-4">
        {([0, 1, 2, 3] as const).map((level) => (
          <Flame key={level} level={level} className="h-24" />
        ))}
      </div>
      <StreakCard streak={streak(0, 0, 0)} />
      <StreakCard streak={streak(0, 1, 1)} />
      <StreakCard streak={streak(3, 2, 2)} />
      <StreakCard streak={streak(7, 5, 3)} />
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

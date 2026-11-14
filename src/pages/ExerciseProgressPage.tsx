import { Link, useParams } from 'react-router-dom'
import { Mascot } from '../components/ExerciseImage'
import { PrBadge } from '../components/PrBadge'
import { PageLoader } from '../components/ui'
import { useLoggedSets } from '../features/progress/api'
import { ProgressChart } from '../features/progress/ProgressChart'
import { useExercises } from '../features/split/api'
import { exerciseProgress, formatTopSet } from '../lib/progress'
import { fromISODate } from '../lib/schedule'

/** One exercise: top-set chart, best set, and every session (the chart's table view). */
export default function ExerciseProgressPage() {
  const { exerciseId } = useParams()
  const exercises = useExercises()
  const sets = useLoggedSets()
  const exercise = exercises.data?.find((e) => e.id === exerciseId)

  if (exercises.isPending || sets.isPending) {
    return (
      <PageLoader label="Loading your progress" />
    )
  }

  const progress = exerciseProgress(sets.data?.filter((s) => s.exerciseId === exerciseId) ?? [])
  const sessions = [...progress.points].reverse()
  const prCount = progress.points.filter((p) => p.isPR).length

  return (
    <div className="animate-fade-up pt-2">
      <Link to="/progress" className="-ml-1 inline-flex min-h-11 items-center gap-1 font-semibold text-muted">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 6-6 6 6 6" />
        </svg>
        Progress
      </Link>
      <h1 className="text-3xl font-black tracking-tight">{exercise?.name ?? 'Exercise'}</h1>

      {progress.points.length === 0 ? (
        <div className="mt-8 text-center">
          <Mascot />
          <p className="mt-4 font-bold">No sessions yet</p>
          <p className="mt-1 text-muted">Log this exercise in a workout and your progress shows up here.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="Best" value={progress.best ? formatTopSet(progress.best) : '–'} />
            <Stat label="Sessions" value={String(progress.points.length)} />
            <Stat label="PRs" value={String(prCount)} />
          </div>

          <div className="mt-4">
            {progress.points.length > 1 ? (
              <ProgressChart progress={progress} />
            ) : (
              <p className="rounded-3xl border border-line bg-surface p-5 text-muted">
                One session logged. The chart appears after your next one.
              </p>
            )}
          </div>

          <section className="mt-6">
            <h2 className="text-lg font-bold">Sessions</h2>
            <ul className="mt-2 divide-y divide-line rounded-3xl border border-line bg-surface px-5">
              {sessions.map((p) => (
                <li key={p.workoutId} className="flex min-h-14 items-center justify-between gap-3 py-2">
                  <span className="text-muted">
                    {fromISODate(p.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                  <span className="flex items-center gap-2 font-bold tabular-nums">
                    {p.isPR && <PrBadge />}
                    {formatTopSet(p)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {exercise && (
        <Link to={`/library/${exercise.id}`} className="mt-4 inline-flex min-h-11 items-center font-semibold text-accent">
          Form cues →
        </Link>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-3">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-0.5 truncate text-base font-black tabular-nums">{value}</p>
    </div>
  )
}

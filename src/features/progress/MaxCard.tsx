import { Link } from 'react-router-dom'
import { MAX_ESTIMATE_REPS, displayMax, maxProgress, maxSummary, percentTable } from '../../lib/one-rep-max'
import { formatTopSet, type ExerciseProgress, type LoggedSet } from '../../lib/progress'
import { fromISODate, toISODate } from '../../lib/schedule'

const kg = (n: number) => `${Number(n.toFixed(2))}`

/**
 * Exercise page: the estimated one-rep max, where it came from, its growth over
 * 30 days and a percentage table, with the link to the progress page underneath.
 */
export function MaxCard({
  exerciseId,
  sets,
  progress,
  className = '',
}: {
  exerciseId: string
  sets: readonly LoggedSet[]
  progress: ExerciseProgress
  className?: string
}) {
  const summary = maxSummary(maxProgress(sets), toISODate(new Date()))
  const max = summary ? displayMax(summary.best.estimate) : null

  return (
    <section className={`rounded-3xl border border-line bg-surface ${className}`} aria-label="Estimated one-rep max">
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold tracking-widest text-muted uppercase">Estimated 1RM</p>
            <p className="text-xs text-muted">What you could likely lift once</p>
          </div>
          {summary?.change != null && summary.change > 0 && (
            <p className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-sm font-bold text-accent tabular-nums">
              ▲ +{kg(summary.change)} kg<span className="font-semibold text-muted"> · 30 d</span>
            </p>
          )}
        </div>

        {summary && max !== null ? (
          <>
            <p className="mt-2 text-4xl font-black tracking-tight tabular-nums">
              {kg(max)} <span className="text-2xl text-muted">kg</span>
            </p>
            <p className="mt-1 text-sm text-muted">
              from {kg(summary.best.weight)} kg × {summary.best.reps} ·{' '}
              {fromISODate(summary.best.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </p>
            <ul className="mt-4 grid grid-cols-4 gap-1.5" aria-label="Training weights by percentage">
              {percentTable(summary.best.estimate).map(({ percent, weight }) => (
                <li key={percent} className="rounded-xl bg-bg/60 px-1 py-2 text-center">
                  <span className="block text-[11px] font-semibold text-muted">{percent}%</span>
                  <span className="block font-bold tabular-nums">{kg(weight)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-muted">
            Do a heavier set ({MAX_ESTIMATE_REPS} reps or fewer) to estimate your max.
          </p>
        )}
      </div>

      <Link
        to={`/progress/${exerciseId}`}
        className="flex min-h-14 items-center justify-between gap-3 border-t border-line px-5 transition active:bg-surface-2"
      >
        <span className="min-w-0">
          <span className="block font-bold">Your progress</span>
          <span className="block truncate text-sm text-muted">
            {progress.best && `Best: ${formatTopSet(progress.best)} · `}
            {progress.points.length} {progress.points.length === 1 ? 'session' : 'sessions'}
          </span>
        </span>
        <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </Link>
    </section>
  )
}

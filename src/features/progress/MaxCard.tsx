import { Link } from 'react-router-dom'
import { MAX_ESTIMATE_REPS, displayMax, maxProgress, maxSummary, percentTable } from '../../lib/one-rep-max'
import { formatTopSet, type ExerciseProgress, type LoggedSet } from '../../lib/progress'
import { formatRatio, LEVELS, strengthLevel, type Lift } from '../../lib/strength'
import { useBodyStats } from '../strength/api'
import { StrengthBar } from '../strength/StrengthBar'
import { BodyStatsButton } from '../strength/StrengthCard'
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
  lift = null,
  className = '',
}: {
  exerciseId: string
  sets: readonly LoggedSet[]
  progress: ExerciseProgress
  /** One of the four main lifts: adds the strength level. */
  lift?: Lift | null
  className?: string
}) {
  const summary = maxSummary(maxProgress(sets), toISODate(new Date()))
  const max = summary ? displayMax(summary.best.estimate) : null

  return (
    <section className={`rounded-3xl bg-surface ${className}`} aria-label="Estimated one-rep max">
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
            {lift && <StrengthSection lift={lift} estimate={summary.best.estimate} />}
          </>
        ) : (
          <p className="mt-2 text-muted">
            Do a heavier set ({MAX_ESTIMATE_REPS} reps or fewer) to estimate your max.
          </p>
        )}
      </div>

      <Link
        to={`/progress/${exerciseId}`}
        className="flex min-h-14 items-center justify-between gap-3 rounded-b-3xl bg-surface-2/50 px-5 transition active:bg-surface-2"
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

/** Where this max stands for the lifter's body weight. */
function StrengthSection({ lift, estimate }: { lift: Lift; estimate: number }) {
  const stats = useBodyStats()
  if (!stats) {
    return (
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Add your body weight to see your strength level.</p>
        <BodyStatsButton />
      </div>
    )
  }
  const s = strengthLevel(lift, estimate, stats.bodyweight, stats.sex)
  return (
    <div className="mt-6" aria-label="Strength level">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold tracking-widest text-muted uppercase">Strength level</p>
        <p className="text-xs text-muted">{formatRatio(s.ratio)}</p>
      </div>
      <p className="mt-1 text-2xl font-black tracking-tight text-accent">{LEVELS[s.level]}</p>
      <StrengthBar position={s.position} labels className="mt-3" />
      <p className="mt-3 text-sm text-muted">
        {s.next ? (
          <>
            <span className="font-bold text-text">{kg(s.next.needKg)} kg</span> to {LEVELS[s.next.level]} ({kg(s.next.targetKg)} kg at{' '}
            {kg(stats.bodyweight)} kg body weight)
          </>
        ) : (
          'Top of the scale. Respect.'
        )}
      </p>
    </div>
  )
}

import { useMemo } from 'react'
import { formatInsight, fuelInsight, fuelTip, INSIGHT_MIN_SESSIONS, isFuel } from '../../lib/fuel'
import { toISODate } from '../../lib/schedule'
import { useWorkoutHistory } from '../progress/api'
import { GorillaHead } from '../workout/CoachTip'

/**
 * Under today's workout: what to eat and drink before it (by time of day, leg
 * day, how much is planned), plus what the user's own logs say works.
 */
export function PreWorkoutCard({
  dayName,
  plannedSets,
  now = new Date(),
  className = '',
}: {
  dayName: string
  plannedSets: number
  /** Only for previews; the real card uses the current time. */
  now?: Date
  className?: string
}) {
  const today = toISODate(now)
  const hour = now.getHours()
  const history = useWorkoutHistory()

  // Recomputed when the hour changes, not on every render.
  const tip = useMemo(
    () => fuelTip({ now: new Date(`${today}T${String(hour).padStart(2, '0')}:00:00`), today, dayName, plannedSets }),
    [today, hour, dayName, plannedSets],
  )
  const { insight, answered } = useMemo(() => {
    const sessions = (history.data ?? []).map((w) => ({
      dayName: w.day_name,
      fuel: w.fuel ? w.fuel.filter(isFuel) : null,
      volume: w.workout_sets.reduce((sum, s) => sum + s.reps * Number(s.weight_kg), 0),
    }))
    return { insight: fuelInsight(sessions), answered: sessions.filter((s) => s.fuel !== null).length }
  }, [history.data])

  return (
    <section aria-label="Pre-workout" className={`rounded-3xl border border-line bg-surface p-5 ${className}`}>
      <div className="flex items-center gap-3">
        <GorillaHead className="size-11" />
        <div className="min-w-0">
          <p className="text-xs font-black tracking-[0.2em] text-accent uppercase">Pre-workout</p>
          <p className="mt-0.5 leading-snug font-bold text-balance">{tip.headline}</p>
        </div>
      </div>

      <ol className="mt-4 flex flex-col gap-2.5">
        {tip.steps.map((step) => (
          <li key={step.when + step.emoji} className="flex items-start gap-3">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-2xl bg-surface-2 text-xl">
              {step.emoji}
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-xs font-bold tracking-wide text-muted uppercase">{step.when}</span>
              <span className="block text-sm leading-snug font-semibold">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>

      {history.data &&
        (insight ? (
          <p className="mt-4 rounded-2xl bg-accent/10 px-3.5 py-2.5 text-sm font-bold text-accent">📊 {formatInsight(insight)}</p>
        ) : (
          <p className="mt-4 rounded-2xl bg-surface-2 px-3.5 py-2.5 text-sm text-muted">
            📊 Tell me what you had after each workout.{' '}
            {answered < INSIGHT_MIN_SESSIONS
              ? `${INSIGHT_MIN_SESSIONS - answered} more and I'll tell you what actually works for you.`
              : 'No clear winner yet. Keep logging.'}
          </p>
        ))}
      <p className="mt-2.5 text-[11px] text-muted/80">General tips, not medical advice. Go easy on caffeine.</p>
    </section>
  )
}

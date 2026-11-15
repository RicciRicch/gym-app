import { useMemo } from 'react'
import { Mascot } from '../../components/ExerciseImage'
import { gorillaSays, liftedLessThanLastTime, missedDay, type GorillaMood, type GorillaSays } from '../../lib/gorilla'
import { formatTopSet, progressByExercise, prsByWorkout, topSet } from '../../lib/progress'
import { addDays, toISODate, type ISODate, type Override, type PlanDay } from '../../lib/schedule'
import type { Streak } from '../../lib/streak'
import { useLoggedSets, useWorkoutHistory } from '../progress/api'
import { useStreakFreezes, useWorkoutDates } from '../streak/api'

const POSE = { coach: 'coach', proud: 'proud', sad: 'sad', sleepy: 'coach' } as const satisfies Record<GorillaMood, string>

/**
 * The mascot on Today: reacts to how training is going (waiting, proud after a
 * PR, on the couch after a skipped day, dozing on rest days) and says a line.
 */
export function GorillaCard({
  days,
  overrides,
  planSince,
  plannedToday,
  doneToday,
  inProgress,
  streak,
  className = '',
}: {
  days: readonly PlanDay[]
  overrides: readonly Override[]
  /** Local date the split was created: nothing before it counts as skipped. */
  planSince: ISODate
  plannedToday: string | null
  doneToday: boolean
  inProgress: boolean
  streak: Streak | null
  className?: string
}) {
  const today = toISODate(new Date())
  const dates = useWorkoutDates()
  const freezes = useStreakFreezes()
  const history = useWorkoutHistory()
  const sets = useLoggedSets()

  const says = useMemo(() => {
    if (!dates.data) return null
    const latest = history.data?.[0]
    const latestIsRecent = !!latest && latest.date >= addDays(today, -1)

    let recentPr: { exercise: string; label: string } | null = null
    if (latest && latestIsRecent && sets.data) {
      const prExercise = [...(prsByWorkout(progressByExercise(sets.data)).get(latest.id) ?? [])][0]
      const rows = latest.workout_sets.filter((s) => s.exercise_id === prExercise)
      const top = topSet(rows)
      if (prExercise && top) recentPr = { exercise: rows[0].exercises.name, label: formatTopSet(top) }
    }

    const volumes = (history.data ?? []).map((w) => ({
      dayName: w.day_name,
      volume: w.workout_sets.reduce((sum, s) => sum + s.reps * Number(s.weight_kg), 0),
    }))

    return gorillaSays({
      today,
      hasPlan: days.some((d) => d.weekday !== null),
      plannedToday,
      inProgress,
      doneToday,
      missed: missedDay(today, days, overrides, new Set(dates.data), planSince, freezes.data ?? []),
      recentPr,
      liftedLess: latest?.date === today && liftedLessThanLastTime(volumes),
      weekFrozen: !!streak?.frozen,
      streakWeeks: streak?.weeks ?? 0,
    })
  }, [dates.data, freezes.data, history.data, sets.data, today, days, overrides, planSince, plannedToday, inProgress, doneToday, streak])

  return says && <GorillaBubble says={says} className={className} />
}

/** The mascot in its mood with a speech bubble. */
export function GorillaBubble({ says, className = '' }: { says: GorillaSays; className?: string }) {
  return (
    <section aria-label="Coach" className={`flex items-end gap-1 ${className}`}>
      <div className={`relative shrink-0 ${says.mood === 'sleepy' ? 'opacity-80' : ''}`}>
        <Mascot pose={POSE[says.mood]} className={says.mood === 'sad' ? 'h-24' : 'h-28'} />
        {says.mood === 'sleepy' && (
          <span aria-hidden="true" className="absolute top-0 right-0 text-lg font-black text-muted">
            <span className="gorilla-zzz absolute right-0">z</span>
            <span className="gorilla-zzz absolute right-0" style={{ animationDelay: '0.9s' }}>
              z
            </span>
            <span className="gorilla-zzz absolute right-0" style={{ animationDelay: '1.8s' }}>
              Z
            </span>
          </span>
        )}
      </div>
      <p
        key={says.line}
        className="relative mb-6 min-w-0 flex-1 animate-pop rounded-3xl rounded-bl-md border border-line bg-surface px-4 py-3 text-[0.95rem] leading-snug font-semibold text-balance"
      >
        {says.line}
      </p>
    </section>
  )
}

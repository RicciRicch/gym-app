import { useMemo } from 'react'
import { Mascot } from '../../components/Mascot'
import { gorillaSays, liftedLessThanLastTime, missedDay, type GorillaMood, type GorillaSays } from '../../lib/gorilla'
import { formatTopSet, progressByExercise, prsByWorkout, topSet } from '../../lib/progress'
import { cycleMissed } from '../../lib/cycle'
import { addDays, toISODate, type ISODate } from '../../lib/schedule'
import type { Streak } from '../../lib/streak'
import { useNudgeLine } from '../friends/api'
import type { Plan } from '../schedule/plan'
import { useLoggedSets, useWorkoutHistory } from '../progress/api'
import { useStreakFreezes, useWorkoutDates } from '../streak/api'
import { useExerciseUnits } from '../units/api'

const POSE = { coach: 'coach', proud: 'proud', sad: 'sad', sleepy: 'coach' } as const satisfies Record<GorillaMood, string>

/**
 * The mascot on Today: reacts to how training is going (waiting, proud after a
 * PR, on the couch after a skipped day, dozing on rest days) and says a line.
 */
export function GorillaCard({
  plan,
  planSince,
  plannedToday,
  doneToday,
  inProgress,
  streak,
  className = '',
}: {
  plan: Plan
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
  const nudge = useNudgeLine()
  const unitOf = useExerciseUnits()

  const says = useMemo(() => {
    if (!dates.data) return null
    const latest = history.data?.[0]
    const latestIsRecent = !!latest && latest.date >= addDays(today, -1)

    let recentPr: { exercise: string; label: string } | null = null
    if (latest && latestIsRecent && sets.data) {
      const prExercise = [...(prsByWorkout(progressByExercise(sets.data)).get(latest.id) ?? [])][0]
      const rows = latest.workout_sets.filter((s) => s.exercise_id === prExercise)
      const top = topSet(rows)
      if (prExercise && top) recentPr = { exercise: rows[0].exercises.name, label: formatTopSet(top, unitOf(prExercise)) }
    }

    const volumes = (history.data ?? []).map((w) => ({
      dayName: w.day_name,
      volume: w.workout_sets.reduce((sum, s) => sum + s.reps * Number(s.weight_kg), 0),
    }))

    const trained = new Set(dates.data)
    const missed =
      plan.mode === 'rotating'
        ? cycleMissed(plan.next, today, trained, planSince, freezes.data ?? [])
        : missedDay(today, plan.days, plan.overrides, trained, planSince, freezes.data ?? [])

    return gorillaSays({
      today,
      hasPlan: plan.mode === 'rotating' ? plan.days.length > 0 : plan.days.some((d) => d.weekday !== null),
      plannedToday,
      inProgress,
      doneToday,
      missed,
      recentPr,
      liftedLess: latest?.date === today && liftedLessThanLastTime(volumes),
      weekFrozen: !!streak?.frozen,
      streakWeeks: streak?.weeks ?? 0,
    })
  }, [dates.data, freezes.data, history.data, sets.data, today, plan, planSince, plannedToday, inProgress, doneToday, streak, unitOf])

  // A friend's nudge wins until today's workout is started.
  if (says && nudge && !doneToday && !inProgress) return <GorillaBubble says={{ mood: 'sad', line: nudge }} className={className} />
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

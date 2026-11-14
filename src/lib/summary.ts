// Pure logic for the screen shown after finishing a workout: totals and the
// personal records the workout just set.

import { exerciseProgress, type ExerciseProgress, type LoggedSet, type TopSet } from './progress'
import { toSetRows, type WorkoutDraft } from './workout'

export interface PrHit {
  exerciseId: string
  name: string
  metric: ExerciseProgress['metric']
  top: TopSet
  /** The best before this workout. */
  previous: TopSet
}

export interface WorkoutSummary {
  dayName: string
  durationSeconds: number
  exercises: number
  sets: number
  reps: number
  /** Sum of reps x weight over completed sets, kg. */
  volumeKg: number
  prs: PrHit[]
}

const NEW_WORKOUT = '__new__'

/**
 * Summarises a finished draft. `history` is every set logged before it;
 * without it (not loaded) no PRs are reported.
 */
export function summarizeWorkout(
  draft: WorkoutDraft,
  finishedAt: string,
  history: readonly LoggedSet[] | undefined,
): WorkoutSummary {
  const rows = toSetRows(draft)
  const names = new Map(draft.exercises.map((e) => [e.exerciseId, e.name]))
  const exerciseIds = [...new Set(rows.map((r) => r.exercise_id))]

  const prs: PrHit[] = []
  if (history) {
    for (const exerciseId of exerciseIds) {
      const earlier = history.filter((s) => s.exerciseId === exerciseId)
      if (earlier.length === 0) continue // first session is the baseline, not a PR
      const fresh: LoggedSet[] = rows
        .filter((r) => r.exercise_id === exerciseId)
        .map((r) => ({
          workoutId: NEW_WORKOUT,
          date: '9999-12-31', // always the latest session
          startedAt: draft.startedAt,
          exerciseId,
          reps: r.reps,
          weight_kg: r.weight_kg,
        }))
      const progress = exerciseProgress([...earlier, ...fresh])
      const point = progress.points.at(-1)
      if (!point?.isPR) continue
      const before = progress.points.slice(0, -1)
      const previous = before.reduce<TopSet>(
        (best, p) => ((progress.metric === 'weight' ? p.weight > best.weight : p.reps > best.reps) ? p : best),
        before[0],
      )
      prs.push({
        exerciseId,
        name: names.get(exerciseId) ?? 'Exercise',
        metric: progress.metric,
        top: { weight: point.weight, reps: point.reps },
        previous: { weight: previous.weight, reps: previous.reps },
      })
    }
  }

  return {
    dayName: draft.dayName,
    durationSeconds: Math.max(0, (new Date(finishedAt).getTime() - new Date(draft.startedAt).getTime()) / 1000),
    exercises: exerciseIds.length,
    sets: rows.length,
    reps: rows.reduce((n, r) => n + r.reps, 0),
    volumeKg: Math.round(rows.reduce((n, r) => n + r.reps * r.weight_kg, 0) * 100) / 100,
    prs,
  }
}

/** "+2.5 kg" or "+3 reps": how much a PR beat the previous best by. */
export function formatPrGain(pr: PrHit): string {
  if (pr.metric === 'weight') return `+${Number((pr.top.weight - pr.previous.weight).toFixed(2))} kg`
  const gain = pr.top.reps - pr.previous.reps
  return `+${gain} ${gain === 1 ? 'rep' : 'reps'}`
}

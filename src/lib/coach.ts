// Pure logic for the in-workout coach tip and the "ghost" of your last session.

import type { LoggedSet } from './progress'
import { fromKg, weightStep, type WeightUnit } from './units'

export interface PastSet {
  /** In the exercise's unit (kg unless it is set to lb); 0 = bodyweight */
  weight: number
  reps: number
}

const num = (n: number) => String(Number(n.toFixed(2)))

/** The sets of the most recent workout that included the exercise, in the order they were done, in `unit`. */
export function lastSessionSets(history: readonly LoggedSet[], exerciseId: string, unit: WeightUnit = 'kg'): PastSet[] {
  let latest: LoggedSet | null = null
  for (const s of history) {
    if (s.exerciseId !== exerciseId) continue
    if (!latest || s.date > latest.date || (s.date === latest.date && s.startedAt > latest.startedAt)) latest = s
  }
  if (!latest) return []
  const workoutId = latest.workoutId
  return history
    .filter((s) => s.exerciseId === exerciseId && s.workoutId === workoutId)
    .sort((a, b) => (a.setNumber ?? 0) - (b.setNumber ?? 0))
    .map((s) => ({ weight: fromKg(s.weight_kg, unit), reps: s.reps }))
}

export type GhostVerdict = 'ahead' | 'even' | 'behind'

/** You against the same set last time: heavier wins, on equal weight more reps wins. */
export function ghostVerdict(now: PastSet, ghost: PastSet): GhostVerdict {
  if (now.weight !== ghost.weight) return now.weight > ghost.weight ? 'ahead' : 'behind'
  if (now.reps !== ghost.reps) return now.reps > ghost.reps ? 'ahead' : 'behind'
  return 'even'
}

/** Sets won by you and by the ghost. `done[i]` is your completed set i, or null if not done yet. */
export function ghostScore(done: readonly (PastSet | null)[], ghost: readonly PastSet[]): { you: number; ghost: number } {
  const score = { you: 0, ghost: 0 }
  done.forEach((set, i) => {
    const past = ghost[i]
    if (!set || !past) return
    const verdict = ghostVerdict(set, past)
    if (verdict === 'ahead') score.you++
    else if (verdict === 'behind') score.ghost++
  })
  return score
}

export function formatPastSet(set: PastSet): string {
  return set.weight > 0 ? `${num(set.weight)} × ${set.reps}` : `BW × ${set.reps}`
}

export interface CoachTip {
  text: string
  /** What "Apply" writes into the sets that are not done yet. null = nothing to apply. */
  apply: PastSet | null
}

/**
 * What to aim for today, from the last session of the exercise:
 * every set at the top weight held its reps -> add weight;
 * reps dropped off -> same weight, get every set up to the first set's reps;
 * bodyweight -> one more rep.
 * `last` is in `unit`; the jump is a plate's worth in that unit (2.5 kg or 5 lb).
 */
export function coachTip(last: readonly PastSet[], unit: WeightUnit = 'kg'): CoachTip {
  if (last.length === 0) {
    return { text: 'First time on this one. Pick a weight you can move cleanly and I will take it from there.', apply: null }
  }
  const top = Math.max(...last.map((s) => s.weight))
  if (top === 0) {
    const best = Math.max(...last.map((s) => s.reps))
    return { text: `Last time: ${best} reps at bodyweight. Go for ${best + 1}.`, apply: { weight: 0, reps: best + 1 } }
  }
  const working = last.filter((s) => s.weight === top)
  const first = working[0].reps
  const lowest = Math.min(...working.map((s) => s.reps))
  if (lowest >= first) {
    const next = top + weightStep(top, unit)
    const sets = working.length > 1 ? ' on every set' : ''
    return { text: `Last time ${num(top)} ${unit} × ${first}${sets}. Too easy. Try ${num(next)} ${unit}.`, apply: { weight: next, reps: first } }
  }
  return {
    text: `Last time your reps dropped to ${lowest} at ${num(top)} ${unit}. Stay there and get every set to ${first}.`,
    apply: { weight: top, reps: first },
  }
}

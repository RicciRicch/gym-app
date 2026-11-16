// Estimated one-rep max (Epley), per workout, and a percentage table for planning.

import type { LoggedSet } from './progress'
import { addDays, type ISODate } from './schedule'

/** Above this many reps the formula guesses too much, so those sets are ignored. */
export const MAX_ESTIMATE_REPS = 10

/** Epley: weight × (1 + reps / 30); a single is the weight itself. Null when the set can't tell. */
export function estimateOneRepMax(weight: number, reps: number): number | null {
  if (!(weight > 0) || !(reps >= 1) || reps > MAX_ESTIMATE_REPS) return null
  return reps === 1 ? weight : weight * (1 + reps / 30)
}

export interface MaxPoint {
  workoutId: string
  date: ISODate
  /** Unrounded estimate. */
  estimate: number
  /** The set it came from. */
  weight: number
  reps: number
  /** Higher than every earlier workout's estimate. The first one is the baseline, not a PR. */
  isPR: boolean
}

/** One point per workout that has a usable set (oldest first): its best estimate. */
export function maxProgress(sets: readonly LoggedSet[]): MaxPoint[] {
  const byWorkout = new Map<string, LoggedSet[]>()
  for (const s of sets) {
    const list = byWorkout.get(s.workoutId)
    if (list) list.push(s)
    else byWorkout.set(s.workoutId, [s])
  }

  const sessions = [...byWorkout.values()].sort(
    (a, b) => a[0].date.localeCompare(b[0].date) || a[0].startedAt.localeCompare(b[0].startedAt),
  )
  const points: MaxPoint[] = []
  let best = -Infinity
  for (const list of sessions) {
    let top: Omit<MaxPoint, 'isPR'> | null = null
    for (const s of list) {
      const weight = Number(s.weight_kg)
      const estimate = estimateOneRepMax(weight, s.reps)
      if (estimate !== null && (!top || estimate > top.estimate)) {
        top = { workoutId: s.workoutId, date: s.date, estimate, weight, reps: s.reps }
      }
    }
    if (!top) continue
    points.push({ ...top, isPR: points.length > 0 && top.estimate > best + 1e-9 })
    best = Math.max(best, top.estimate)
  }
  return points
}

/** Rounds to a multiple of `step` (0.5 kg for display, 2.5 kg for plates). */
export function roundTo(value: number, step: number): number {
  return Number((Math.round(value / step) * step).toFixed(2))
}

/** The headline number: half-kilo precision is already more than the formula knows. */
export const displayMax = (estimate: number) => roundTo(estimate, 0.5)

export interface MaxSummary {
  /** Best estimate so far (the earliest one on a tie). */
  best: MaxPoint
  /** kg the displayed best grew in the last 30 days; null without anything older to compare. */
  change: number | null
}

export function maxSummary(points: readonly MaxPoint[], today: ISODate): MaxSummary | null {
  if (points.length === 0) return null
  const bestOf = (list: readonly MaxPoint[]) => list.reduce((a, b) => (b.estimate > a.estimate + 1e-9 ? b : a))
  const best = bestOf(points)
  const older = points.filter((p) => p.date <= addDays(today, -30))
  const change = older.length ? Number((displayMax(best.estimate) - displayMax(bestOf(older).estimate)).toFixed(2)) : null
  return { best, change }
}

export const PERCENTS = [95, 90, 85, 80, 75, 70, 65, 60] as const

/** Training weights at each percentage, rounded to what you can load: 2.5 kg, or 1 kg for light lifts. */
export function percentTable(oneRepMax: number): { percent: number; weight: number }[] {
  const step = oneRepMax < 30 ? 1 : 2.5
  return PERCENTS.map((percent) => ({ percent, weight: roundTo((oneRepMax * percent) / 100, step) }))
}

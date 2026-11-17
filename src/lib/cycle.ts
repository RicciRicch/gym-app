// Rotating cycle: the split's days follow each other in order (position), each
// followed by `restAfter` rest days, round and round, not tied to weekdays.
// The plan waits for you: the next day is always the one after the last day you
// trained, so a skipped day moves everything one day later instead of being lost.

import { addDays, startOfWeek, type ISODate } from './schedule'

export type SplitMode = 'weekly' | 'rotating'

export interface CycleDay {
  id: string
  name: string
  /** Rest days after this day, 0..6. */
  rest_after: number
}

/** The last workout done on one of the cycle's days. */
export interface CycleAnchor {
  date: ISODate
  dayId: string
}

export interface CycleNext<D extends CycleDay> {
  day: D
  /** When it is planned: today at the earliest. */
  date: ISODate
  /** When it was due after the last workout; before today = it has been waiting. */
  due: ISODate
  /** 1-based place in the cycle, rest days included ("day 2 of 4"). */
  slot: number
}

/** Days in one turn of the cycle, rest days included. */
export function cycleLength(days: readonly CycleDay[]): number {
  return days.reduce((n, d) => n + 1 + d.rest_after, 0)
}

/** 1-based slot of each training day in the cycle. */
export function cycleSlot(days: readonly CycleDay[], index: number): number {
  return days.slice(0, index).reduce((n, d) => n + 1 + d.rest_after, 0) + 1
}

/** Workouts a week at the cycle's pace, rounded down (PPL + 1 rest: 3 x 7 / 4 = 5). */
export function cycleWeeklyTarget(days: readonly CycleDay[]): number {
  const length = cycleLength(days)
  if (length === 0) return 1
  return Math.min(7, Math.max(1, Math.floor((days.length * 7) / length)))
}

/**
 * The plan from today until `to`: each date maps to a day or null (rest).
 * Without an anchor (nothing trained on this split yet) the cycle starts today.
 */
export function projectCycle<D extends CycleDay>(
  days: readonly D[],
  anchor: CycleAnchor | null,
  today: ISODate,
  to: ISODate,
): { next: CycleNext<D> | null; plan: Map<ISODate, D | null> } {
  const plan = new Map<ISODate, D | null>()
  if (days.length === 0) return { next: null, plan }

  const anchorIndex = anchor ? days.findIndex((d) => d.id === anchor.dayId) : -1
  let index = anchorIndex >= 0 ? (anchorIndex + 1) % days.length : 0
  const due = anchorIndex >= 0 ? addDays(anchor!.date, 1 + days[anchorIndex].rest_after) : today
  let training = due < today ? today : due
  const next: CycleNext<D> = { day: days[index], date: training, due, slot: cycleSlot(days, index) }

  for (let date = today; date <= to; date = addDays(date, 1)) {
    if (date < training) {
      plan.set(date, null)
      continue
    }
    const day = days[index]
    plan.set(date, day)
    training = addDays(date, 1 + day.rest_after)
    index = (index + 1) % days.length
  }
  return { next, plan }
}

/**
 * The next day when it has been waiting for 1..lookback days with no workout
 * since it was due (the gorilla notices). Never before `since`, never in a frozen week.
 */
export function cycleMissed<D extends CycleDay>(
  next: CycleNext<D> | null,
  today: ISODate,
  workoutDates: ReadonlySet<ISODate>,
  since: ISODate,
  frozenWeeks: readonly ISODate[] = [],
  lookback = 3,
): { dayName: string; daysAgo: number } | null {
  if (!next || next.due >= today || next.due < since) return null
  const daysAgo = Math.round((Date.parse(today) - Date.parse(next.due)) / 86_400_000)
  if (daysAgo > lookback) return null
  for (let date = next.due; date < today; date = addDays(date, 1)) {
    if (workoutDates.has(date)) return null
  }
  if (frozenWeeks.includes(startOfWeek(next.due))) return null
  return { dayName: next.day.name, daysAgo }
}

/**
 * Turns a weekly layout into a cycle with the same rhythm: days in weekday order,
 * each resting until the next one (Mon / Wed / Fri -> 1, 1 and 2 rest days).
 * Days without a weekday go last with no rest.
 */
export function cycleFromWeek<D extends CycleDay & { weekday: number | null }>(days: readonly D[]): D[] {
  const placed = days.filter((d) => d.weekday !== null).sort((a, b) => a.weekday! - b.weekday!)
  const rest = days.filter((d) => d.weekday === null)
  const withRest = placed.map((d, i) => {
    const nextWeekday = i + 1 < placed.length ? placed[i + 1].weekday! : placed[0].weekday! + 7
    return { ...d, rest_after: Math.min(6, Math.max(0, nextWeekday - d.weekday! - 1)) }
  })
  return [...withRest, ...rest.map((d) => ({ ...d, rest_after: 0 }))]
}

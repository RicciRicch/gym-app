// Pure streak logic. A week (Monday to Sunday) counts when the user trained on
// at least as many days as their split plans per week. Rest days never break
// the streak, and the running week only counts once its target is met.

import { addDays, startOfWeek, type ISODate, type PlanDay } from './schedule'

export interface Streak {
  /** Consecutive completed weeks, including this week once its target is met. */
  weeks: number
  /** Days trained this week. */
  thisWeek: number
  /** Training days needed per week. */
  target: number
  weekDone: boolean
  /** How hard the flame burns: 0 = cold, 1 = spark (training this week, no streak yet), 2 = fire, 3 = blaze (4+ weeks). */
  level: 0 | 1 | 2 | 3
}

/** How many weekdays the split trains on (at least 1). */
export function trainingDaysPerWeek(days: readonly Pick<PlanDay, 'weekday'>[]): number {
  return Math.max(1, new Set(days.filter((d) => d.weekday !== null).map((d) => d.weekday)).size)
}

export function weeklyStreak(workoutDates: readonly ISODate[], target: number, today: ISODate): Streak {
  const goal = Math.max(1, target)
  const perWeek = new Map<ISODate, Set<ISODate>>()
  for (const date of workoutDates) {
    const week = startOfWeek(date)
    const days = perWeek.get(week)
    if (days) days.add(date)
    else perWeek.set(week, new Set([date]))
  }
  const trained = (week: ISODate) => perWeek.get(week)?.size ?? 0

  const currentWeek = startOfWeek(today)
  const thisWeek = trained(currentWeek)
  const weekDone = thisWeek >= goal
  let weeks = weekDone ? 1 : 0
  for (let week = addDays(currentWeek, -7); trained(week) >= goal; week = addDays(week, -7)) weeks++

  const level = weeks >= 4 ? 3 : weeks >= 1 ? 2 : thisWeek > 0 ? 1 : 0
  return { weeks, thisWeek, target: goal, weekDone, level }
}

/** One line that says where the streak stands. */
export function streakHeadline(streak: Streak): string {
  if (streak.weeks > 0) return `${streak.weeks} week streak`
  return streak.thisWeek > 0 ? 'Streak warming up' : 'Light your streak'
}

export function streakDetail(streak: Streak): string {
  if (streak.weekDone) return `Week complete · ${streak.thisWeek} of ${streak.target} workouts`
  return `${streak.thisWeek} of ${streak.target} workouts this week · ${streak.target - streak.thisWeek} to go`
}

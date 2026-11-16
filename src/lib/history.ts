// Training log on the Progress page: sessions grouped by week, each marked with a plate.
import { addDays, fromISODate, startOfWeek, type ISODate } from './schedule'

export interface WeekGroup<T> {
  weekStart: ISODate
  label: string
  items: T[]
}

const dayMonth = (iso: ISODate) => fromISODate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

/** "This week", "Last week", "3–9 Nov", "27 Oct – 2 Nov", with the year when it is not the current one. */
export function weekLabel(weekStart: ISODate, today: ISODate): string {
  const thisWeek = startOfWeek(today)
  if (weekStart === thisWeek) return 'This week'
  if (weekStart === addDays(thisWeek, -7)) return 'Last week'
  const end = addDays(weekStart, 6)
  const [startDay, startMonth] = dayMonth(weekStart).split(' ')
  const range = weekStart.slice(0, 7) === end.slice(0, 7) ? `${startDay}–${dayMonth(end)}` : `${startDay} ${startMonth} – ${dayMonth(end)}`
  return end.slice(0, 4) === today.slice(0, 4) ? range : `${range} ${end.slice(0, 4)}`
}

/** Groups items (already sorted newest first) by their Monday-based week, keeping the order. */
export function groupByWeek<T extends { date: ISODate }>(items: readonly T[], today: ISODate): WeekGroup<T>[] {
  const groups: WeekGroup<T>[] = []
  for (const item of items) {
    const weekStart = startOfWeek(item.date)
    const last = groups.at(-1)
    if (last?.weekStart === weekStart) last.items.push(item)
    else groups.push({ weekStart, label: weekLabel(weekStart, today), items: [item] })
  }
  return groups
}

/** Total weight x reps of one session's sets (weights may come back from the API as strings). */
export function sessionVolume(sets: readonly { reps: number; weight_kg: number | string }[]): number {
  return sets.reduce((sum, s) => sum + Number(s.weight_kg) * s.reps, 0)
}

export type Trend = 'up' | 'down' | 'same' | 'first'

export interface SessionTrend {
  volumeKg: number
  /** Volume of the previous session with the same day name; null when there is none. */
  previousKg: number | null
  /** (volume - previous) / previous; null without a comparable previous session. */
  change: number | null
  trend: Trend
}

/** Changes smaller than this (either way) count as the same. */
export const SAME_BAND = 0.02

interface TrendWorkout {
  id: string
  day_name: string
  date: ISODate
  started_at: string
  workout_sets: readonly { reps: number; weight_kg: number | string }[]
}

const dayKey = (name: string) => name.trim().toLowerCase()

/**
 * Each session against the previous one with the same day name ("Chest" vs the last
 * "Chest"). Bodyweight-only pairs (no volume on either side) have no change.
 */
export function sessionTrends(workouts: readonly TrendWorkout[]): Map<string, SessionTrend> {
  const oldestFirst = [...workouts].sort((a, b) => a.date.localeCompare(b.date) || a.started_at.localeCompare(b.started_at))
  const last = new Map<string, number>()
  const result = new Map<string, SessionTrend>()
  for (const w of oldestFirst) {
    const key = dayKey(w.day_name)
    const volumeKg = sessionVolume(w.workout_sets)
    const previousKg = last.get(key) ?? null
    const change = previousKg !== null && previousKg > 0 ? (volumeKg - previousKg) / previousKg : null
    const trend: Trend =
      previousKg === null ? 'first' : change === null || Math.abs(change) < SAME_BAND ? 'same' : change > 0 ? 'up' : 'down'
    result.set(w.id, { volumeKg, previousKg, change, trend })
    last.set(key, volumeKg)
  }
  return result
}

/** "▲ 12%", "▼ 4%", "≈ same". */
export function formatTrend(t: SessionTrend): string {
  if (t.trend === 'first' || t.change === null) return t.trend === 'first' ? 'First' : '≈ same'
  if (t.trend === 'same') return '≈ same'
  return `${t.trend === 'up' ? '▲' : '▼'} ${Math.round(Math.abs(t.change) * 100)}%`
}

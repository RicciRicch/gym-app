// Pure schedule logic: weekday mapping, per-date overrides and swaps.
// Dates are local 'YYYY-MM-DD' strings; weekdays are 0 = Monday … 6 = Sunday.

export type ISODate = string

export interface PlanDay {
  id: string
  name: string
  weekday: number | null
}

export interface Override {
  date: ISODate
  split_day_id: string | null
}

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
export const WEEKDAY_LONG = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parses 'YYYY-MM-DD' as a local date (noon, so DST shifts never change the day). */
export function fromISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export function addDays(iso: ISODate, n: number): ISODate {
  const d = fromISODate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayOf(iso: ISODate): number {
  return (fromISODate(iso).getDay() + 6) % 7
}

export function startOfWeek(iso: ISODate): ISODate {
  return addDays(iso, -weekdayOf(iso))
}

/** The 7 dates (Mon–Sun) of the week containing `iso`. */
export function weekDates(iso: ISODate): ISODate[] {
  const start = startOfWeek(iso)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function isSameWeek(a: ISODate, b: ISODate): boolean {
  return startOfWeek(a) === startOfWeek(b)
}

/**
 * Calendar grid for a month: whole weeks (Mon–Sun) covering every day of the
 * month, padded with days from the neighbouring months.
 */
export function monthGrid(year: number, monthIndex: number): ISODate[][] {
  const first = toISODate(new Date(year, monthIndex, 1, 12))
  const last = toISODate(new Date(year, monthIndex + 1, 0, 12))
  const weeks: ISODate[][] = []
  for (let start = startOfWeek(first); start <= last; start = addDays(start, 7)) {
    weeks.push(weekDates(start))
  }
  return weeks
}

/** The planned day for a date: an override wins, otherwise the weekly layout. null = rest. */
export function resolveDay<D extends PlanDay>(
  date: ISODate,
  days: readonly D[],
  overrides: readonly Override[],
): D | null {
  const override = overrides.find((o) => o.date === date)
  if (override) {
    return override.split_day_id === null
      ? null
      : (days.find((d) => d.id === override.split_day_id) ?? null)
  }
  const weekday = weekdayOf(date)
  return days.find((d) => d.weekday === weekday) ?? null
}

/**
 * Overrides that swap what is planned on two dates. Works on top of existing
 * overrides, so swapping twice (or chaining swaps) behaves as expected.
 * Throws if the dates are not in the same week.
 */
export function buildSwap(
  a: ISODate,
  b: ISODate,
  days: readonly PlanDay[],
  overrides: readonly Override[],
): [Override, Override] {
  if (a === b) throw new Error('Pick two different days to swap')
  if (!isSameWeek(a, b)) throw new Error('Days can only be swapped within the same week')
  const dayA = resolveDay(a, days, overrides)
  const dayB = resolveDay(b, days, overrides)
  return [
    { date: a, split_day_id: dayB?.id ?? null },
    { date: b, split_day_id: dayA?.id ?? null },
  ]
}

/** Moves a training day to a weekday; whatever was there takes the day's old slot. */
export function assignWeekday<D extends PlanDay>(
  days: readonly D[],
  dayId: string,
  weekday: number | null,
): D[] {
  const moving = days.find((d) => d.id === dayId)
  if (!moving) return [...days]
  return days.map((d) => {
    if (d.id === dayId) return { ...d, weekday }
    if (weekday !== null && d.weekday === weekday) return { ...d, weekday: moving.weekday }
    return d
  })
}

// Pure helpers for workout reminders. The server decides when to send them (see
// the `push_reminders` migration); the app tells it what is planned, because the
// plan (weekly layout, swaps, rotating cycle) is only worked out here.

import { addDays, type ISODate } from './schedule'

/** How far ahead the app publishes its plan; reminders stop if the app is not opened for that long. */
export const PLAN_DAYS = 14

export const DEFAULT_REMIND_TIME = '17:00'

export interface PlannedDay {
  date: ISODate
  name: string
}

/** The training days from `today` on, oldest first. */
export function planAhead(planned: (date: ISODate) => { name: string } | null, today: ISODate, days = PLAN_DAYS): PlannedDay[] {
  const out: PlannedDay[] = []
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i)
    const day = planned(date)
    if (day) out.push({ date, name: day.name.slice(0, 60) })
  }
  return out
}

/** 'HH:MM' from what Postgres returns ('17:00:00'); null stays null. */
export function toTimeInput(value: string | null): string | null {
  const match = value?.match(/^(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : null
}

/** A time input's value as a clean 'HH:MM', or null when it is not a valid time. */
export function parseTimeInput(value: string): string | null {
  const match = value.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return `${String(hours).padStart(2, '0')}:${match[2]}`
}

/** The browser's IANA time zone, e.g. "Europe/Belgrade"; null when it cannot tell. */
export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

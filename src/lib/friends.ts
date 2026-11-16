// Pure logic for friends: codes and invite links, what a friend's row says,
// the weekly table and the gorilla's lines.

import { pick } from './gorilla'
import { addDays, fromISODate, startOfWeek, type ISODate } from './schedule'

const CODE = /^GORILA-[A-HJ-NP-Z2-9]{4}$/

/**
 * Reads a friend code from whatever the user typed or pasted: the code itself in
 * any case ("gorila-4x2p", "GORILA 4X2P"), just its last four characters, or a
 * whole invite link. null when there is no valid code in it.
 */
export function parseFriendCode(input: string): string | null {
  const fromLink = /[?&]add=([^&#\s]+)/i.exec(input)?.[1]
  const raw = (fromLink ?? input)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  const tail = raw.startsWith('GORILA') ? raw.slice(6) : raw
  const code = `GORILA-${tail}`
  return CODE.test(code) ? code : null
}

/** The link a user shares; `appUrl` is where the app lives (origin + base path). */
export function inviteLink(appUrl: string, code: string): string {
  return `${appUrl.replace(/\/+$/, '')}/?add=${code}`
}

/**
 * A friend's streak as their phone last published it. It still stands if that was
 * this week or last week (a streak survives the running week); older is stale.
 */
export function liveStreak(weeks: number | null, publishedWeek: ISODate | null, today: ISODate): number {
  if (!weeks || !publishedWeek) return 0
  return publishedWeek >= addDays(startOfWeek(today), -7) ? weeks : 0
}

const DAY_MS = 86_400_000
const daysBetween = (from: ISODate, to: ISODate) => Math.round((fromISODate(to).getTime() - fromISODate(from).getTime()) / DAY_MS)

/** "Push · yesterday": what a friend last trained and when. */
export function lastWorkoutLabel(date: ISODate | null, dayName: string | null, today: ISODate): string {
  if (!date) return 'No workouts yet'
  const days = daysBetween(date, today)
  const when =
    days <= 0
      ? 'today'
      : days === 1
        ? 'yesterday'
        : days < 7
          ? `${days} days ago`
          : fromISODate(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return dayName ? `${dayName} · ${when}` : when
}

export interface TableEntry {
  id: string
  name: string
  /** Days trained this week. */
  days: number
  /** Sets logged this week. */
  sets: number
  me?: boolean
}

export interface TableRow extends TableEntry {
  /** 1 = the crown. Equal sets and days share a place. */
  place: number
}

/** This week's ranking: most sets first, then most days; on a tie the user, then by name. */
export function weeklyTable(entries: readonly TableEntry[]): TableRow[] {
  const sorted = [...entries].sort(
    (a, b) => b.sets - a.sets || b.days - a.days || Number(!!b.me) - Number(!!a.me) || a.name.localeCompare(b.name),
  )
  let place = 0
  return sorted.map((entry, i) => {
    const prev = sorted[i - 1]
    if (!prev || prev.sets !== entry.sets || prev.days !== entry.days) place = i + 1
    return { ...entry, place }
  })
}

/** What the gorilla says about the weekly table, from the user's point of view. */
export function tableLine(table: readonly TableRow[], today: ISODate): string {
  const me = table.find((r) => r.me)
  if (!me || table.length < 2) return ''
  if (table.every((r) => r.sets === 0)) {
    return pick(['Nobody has lifted a thing this week. A table of couches.', 'Zero sets all round. Somebody go first.'], today)
  }
  const leader = table[0]
  const last = table[table.length - 1]
  if (me.place === 1) {
    return pick(
      [
        `You're on top with ${me.sets} sets. Heavy is the head that wears the crown.`,
        'First place. Stay there, the others are watching.',
      ],
      today,
    )
  }
  if (me.id === last.id) {
    return pick(
      [
        `Last place. ${leader.name} is ${leader.sets - me.sets} sets ahead and not slowing down.`,
        `${leader.name} leads. You are holding the table up from below.`,
      ],
      today,
    )
  }
  return pick(
    [
      `${leader.name} leads by ${leader.sets - me.sets} sets. That is one good workout.`,
      `Place ${me.place}. The crown is ${leader.sets - me.sets} sets away.`,
    ],
    today,
  )
}

const listNames = (names: readonly string[]) =>
  names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} and ${names[1]}` : `${names[0]} and ${names.length - 1} others`

/** The gorilla passing on a nudge from friends. */
export function nudgeLine(names: readonly string[], today: ISODate): string {
  if (names.length === 0) return ''
  const who = listNames(names)
  const one = names.length === 1
  return pick(
    [
      `${who} ${one ? 'says' : 'say'} get off the couch.`,
      `${who} poked you. I'd move if I were you.`,
      `${who} ${one ? 'is' : 'are'} asking where you are. So am I.`,
    ],
    today,
  )
}

/** A friend can be nudged once a day, and only while they have not trained today. */
export function canNudge(lastWorkoutDate: ISODate | null, nudgedToday: boolean, today: ISODate): boolean {
  return !nudgedToday && lastWorkoutDate !== today
}

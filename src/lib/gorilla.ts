// Pure logic for the mascot on Today: which mood it is in and what it says.

import { addDays, resolveDay, startOfWeek, type ISODate, type Override, type PlanDay } from './schedule'

/** coach = default pose, proud = beating its chest, sad = on the couch with chips, sleepy = default pose dozing. */
export type GorillaMood = 'coach' | 'proud' | 'sad' | 'sleepy'

export interface GorillaInput {
  today: ISODate
  /** The split has at least one day on the week. */
  hasPlan: boolean
  /** Name of today's planned day; null = rest day. */
  plannedToday: string | null
  inProgress: boolean
  doneToday: boolean
  /** The most recent planned day that was skipped (see missedDay). */
  missed: { dayName: string; daysAgo: number } | null
  /** A record set in the latest workout, when that workout is recent. */
  recentPr: { exercise: string; label: string } | null
  /** The latest workout moved clearly less than the previous one of the same day. */
  liftedLess: boolean
  weekFrozen: boolean
  streakWeeks: number
}

export interface GorillaSays {
  mood: GorillaMood
  line: string
}

/** A stable pick from `lines` for a seed (e.g. the date), so a line does not change on every render. */
export function pick(lines: readonly string[], seed: string): string {
  let hash = 0
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return lines[hash % lines.length]
}

const ago = (days: number) => (days === 1 ? 'yesterday' : `${days} days ago`)
const isLegs = (name: string) => /leg|lower|noge|squat/i.test(name)

export function gorillaSays(input: GorillaInput): GorillaSays {
  const { today, plannedToday, missed, recentPr } = input
  const say = (mood: GorillaMood, lines: string[]): GorillaSays => ({ mood, line: pick(lines, today) })

  if (input.inProgress) {
    return say('coach', ["Mid-workout and you're looking at me? Back to the bar.", "The set won't lift itself. Go."])
  }

  if (input.doneToday) {
    if (recentPr) {
      return say('proud', [
        `${recentPr.exercise}: ${recentPr.label}. Who's the king of the jungle?`,
        `New record on ${recentPr.exercise}. I felt that from here.`,
      ])
    }
    if (input.liftedLess) {
      return say('coach', ['Last time you lifted more. Just saying.', 'Lighter than last time. I noticed. I always notice.'])
    }
    return say('coach', ["That's the stuff. See you next session.", "Work done. Now go eat something that isn't chips."])
  }

  if (!input.hasPlan) return say('coach', ['No plan, no gains. Put a training day on your week.'])

  if (input.weekFrozen) return say('sleepy', ['Week on ice 🧊. Rest up, the streak is safe with me.'])

  if (plannedToday) {
    if (missed) {
      return say('sad', [
        `You skipped ${missed.dayName} ${ago(missed.daysAgo)}. I ate chips about it. Fix it with ${plannedToday} today.`,
        `${missed.dayName} never happened. ${plannedToday} is your comeback. Don't leave me on this couch.`,
      ])
    }
    if (input.streakWeeks >= 2) {
      return say('coach', [`${input.streakWeeks} weeks strong. ${plannedToday} keeps the fire alive.`, `${plannedToday} is waiting. I don't wait long.`])
    }
    return say('coach', [`${plannedToday} is waiting. I don't wait long.`, `${plannedToday} today. No excuses, only reps.`])
  }

  if (missed) {
    if (isLegs(missed.dayName)) return say('sad', ['Skipped legs again? 🦵🐔', `${missed.dayName} was ${ago(missed.daysAgo)}. Your legs sent me a complaint.`])
    return say('sad', [
      `${missed.dayName} was ${ago(missed.daysAgo)}. I was on the couch too. Not proud.`,
      `You skipped ${missed.dayName}. The chips were good. The guilt, less so.`,
    ])
  }

  if (recentPr) return say('proud', [`Still thinking about that ${recentPr.exercise} PR. ${recentPr.label}!`])

  return say('sleepy', ['Rest day. Recovery is part of the plan. Zzz.', "Muscles grow while you rest. So I'm growing right now."])
}

/**
 * The most recent planned training day in the last `lookback` days that has no
 * workout. Stops at the latest workout (training since then makes up for it),
 * never looks before `since` (when the split was made), and skips frozen weeks.
 */
export function missedDay(
  today: ISODate,
  days: readonly PlanDay[],
  overrides: readonly Override[],
  workoutDates: ReadonlySet<ISODate>,
  since: ISODate,
  frozenWeeks: readonly ISODate[] = [],
  lookback = 3,
): { dayName: string; daysAgo: number } | null {
  for (let daysAgo = 1; daysAgo <= lookback; daysAgo++) {
    const date = addDays(today, -daysAgo)
    if (date < since) return null
    if (workoutDates.has(date)) return null
    if (frozenWeeks.includes(startOfWeek(date))) continue
    const planned = resolveDay(date, days, overrides)
    if (planned) return { dayName: planned.name, daysAgo }
  }
  return null
}

/** True when the newest workout's volume is clearly (10%+) below the previous workout of the same day. */
export function liftedLessThanLastTime(workouts: readonly { dayName: string; volume: number }[]): boolean {
  const [latest, ...older] = workouts
  if (!latest) return false
  const previous = older.find((w) => w.dayName === latest.dayName)
  return !!previous && previous.volume > 0 && latest.volume < previous.volume * 0.9
}

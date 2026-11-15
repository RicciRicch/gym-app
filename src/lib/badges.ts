// Pure badge logic: which badges exist, how far along each one is and the date
// it was earned. Everything is derived from the workout history, so deleting a
// workout can take a badge away again.

import { progressByExercise, prsByWorkout, type LoggedSet } from './progress'
import { addDays, startOfWeek, weekdayOf, type ISODate } from './schedule'

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'legendary'

export const TIER_LABEL: Record<BadgeTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  legendary: 'Legendary',
}

type Metric = 'workouts' | 'volume' | 'prs' | 'streak' | 'legs' | 'early' | 'night' | 'marathon' | 'weekend'

export interface Badge {
  id: string
  name: string
  description: string
  emoji: string
  tier: BadgeTier
  metric: Metric
  /** Target for the metric (kg for volume, weeks for streak, 1 for one-off feats). */
  goal: number
}

export const BADGES: readonly Badge[] = [
  { id: 'workouts-1', name: 'First Rep', description: 'Finish your first workout', emoji: '🐣', tier: 'bronze', metric: 'workouts', goal: 1 },
  { id: 'workouts-10', name: 'Regular', description: 'Finish 10 workouts', emoji: '💪', tier: 'silver', metric: 'workouts', goal: 10 },
  { id: 'workouts-50', name: 'Gym Rat', description: 'Finish 50 workouts', emoji: '🐀', tier: 'gold', metric: 'workouts', goal: 50 },
  { id: 'workouts-100', name: 'Centurion', description: 'Finish 100 workouts', emoji: '🛡️', tier: 'legendary', metric: 'workouts', goal: 100 },
  { id: 'volume-10t', name: 'Rhino Mover', description: 'Lift 10 tonnes in total', emoji: '🦏', tier: 'bronze', metric: 'volume', goal: 10_000 },
  { id: 'volume-100t', name: 'Whale Hauler', description: 'Lift 100 tonnes in total', emoji: '🐋', tier: 'gold', metric: 'volume', goal: 100_000 },
  { id: 'volume-1000t', name: 'Tower Lifter', description: 'Lift 1,000 tonnes in total', emoji: '🗼', tier: 'legendary', metric: 'volume', goal: 1_000_000 },
  { id: 'prs-1', name: 'Record Breaker', description: 'Set your first personal record', emoji: '🏆', tier: 'bronze', metric: 'prs', goal: 1 },
  { id: 'prs-10', name: 'On Fire', description: 'Set 10 personal records', emoji: '⚡', tier: 'silver', metric: 'prs', goal: 10 },
  { id: 'prs-50', name: 'Untouchable', description: 'Set 50 personal records', emoji: '👑', tier: 'legendary', metric: 'prs', goal: 50 },
  { id: 'streak-4', name: 'Month Strong', description: 'Keep a 4 week streak', emoji: '🔥', tier: 'silver', metric: 'streak', goal: 4 },
  { id: 'streak-12', name: 'Unstoppable', description: 'Keep a 12 week streak', emoji: '🌋', tier: 'gold', metric: 'streak', goal: 12 },
  { id: 'legs-10', name: 'Never Skip Leg Day', description: 'Finish 10 leg days', emoji: '🦵', tier: 'silver', metric: 'legs', goal: 10 },
  { id: 'early-bird', name: 'Early Bird', description: 'Start a workout before 7 AM', emoji: '🌅', tier: 'bronze', metric: 'early', goal: 1 },
  { id: 'night-owl', name: 'Night Owl', description: 'Start a workout after 10 PM', emoji: '🦉', tier: 'bronze', metric: 'night', goal: 1 },
  { id: 'marathon', name: 'Marathon', description: 'Train for 90 minutes or more in one go', emoji: '⏱️', tier: 'silver', metric: 'marathon', goal: 1 },
  { id: 'weekend', name: 'Weekend Warrior', description: 'Train on a Saturday and the Sunday after', emoji: '🎉', tier: 'bronze', metric: 'weekend', goal: 1 },
]

export interface BadgeWorkout {
  id: string
  date: ISODate
  dayName: string
  /** ISO timestamps. */
  startedAt: string
  finishedAt: string
}

export interface BadgeState {
  badge: Badge
  /** Current value of the badge's metric, capped at its goal. */
  progress: number
  /** Local date the badge was earned, null while locked. */
  earnedOn: ISODate | null
}

export interface BadgeInput {
  workouts: readonly BadgeWorkout[]
  sets: readonly LoggedSet[]
  /** Training days per week the streak asks for. */
  streakTarget: number
  /** Mondays of frozen weeks. */
  frozenWeeks?: readonly ISODate[]
}

const LEG_DAY = /\b(legs?|lower|quads?|glutes?|noge|nog[ae]|donji)\b/i

/** True when a split day's name says it trains legs ("Legs", "Lower B", "Noge"). */
export const isLegDay = (dayName: string) => LEG_DAY.test(dayName)

/** Started between 4:00 and 6:59 local time. */
export const isEarlyStart = (startedAt: string) => {
  const hour = new Date(startedAt).getHours()
  return hour >= 4 && hour < 7
}

/** Started at 22:00 or later (up to 3:59 the next morning). */
export const isLateStart = (startedAt: string) => {
  const hour = new Date(startedAt).getHours()
  return hour >= 22 || hour < 4
}

const MARATHON_MS = 90 * 60_000

export function computeBadges({ workouts, sets, streakTarget, frozenWeeks = [] }: BadgeInput): BadgeState[] {
  const value = new Map<Metric, number>()
  const earned = new Map<string, ISODate>()

  /** Sets the metric and records the date for every badge it now reaches. */
  const reach = (metric: Metric, v: number, date: ISODate) => {
    value.set(metric, Math.max(value.get(metric) ?? 0, v))
    for (const b of BADGES) if (b.metric === metric && v >= b.goal && !earned.has(b.id)) earned.set(b.id, date)
  }

  const volume = new Map<string, number>()
  for (const s of sets) volume.set(s.workoutId, (volume.get(s.workoutId) ?? 0) + s.reps * s.weight_kg)
  const prs = prsByWorkout(progressByExercise(sets))

  const ordered = [...workouts].sort((a, b) => a.date.localeCompare(b.date) || a.startedAt.localeCompare(b.startedAt))
  const trainedOn = new Set<ISODate>()
  let count = 0
  let lifted = 0
  let records = 0
  let legs = 0
  for (const w of ordered) {
    reach('workouts', ++count, w.date)
    lifted += volume.get(w.id) ?? 0
    reach('volume', lifted, w.date)
    records += prs.get(w.id)?.size ?? 0
    reach('prs', records, w.date)
    if (isLegDay(w.dayName)) reach('legs', ++legs, w.date)
    if (isEarlyStart(w.startedAt)) reach('early', 1, w.date)
    if (isLateStart(w.startedAt)) reach('night', 1, w.date)
    if (Date.parse(w.finishedAt) - Date.parse(w.startedAt) >= MARATHON_MS) reach('marathon', 1, w.date)
    if (weekdayOf(w.date) === 6 && trainedOn.has(addDays(w.date, -1))) reach('weekend', 1, w.date)
    trainedOn.add(w.date)
  }

  // Streak: walk the weeks oldest first. A week counts on the day its target is
  // met; a week that falls short breaks the run unless it was frozen.
  const goal = Math.max(1, streakTarget)
  const perWeek = new Map<ISODate, ISODate[]>()
  for (const date of [...trainedOn].sort()) {
    const week = startOfWeek(date)
    perWeek.set(week, [...(perWeek.get(week) ?? []), date])
  }
  const frozen = new Set(frozenWeeks)
  const weeks = [...perWeek.keys()].sort()
  let run = 0
  if (weeks.length > 0) {
    const last = weeks[weeks.length - 1]
    for (let week = weeks[0]; week <= last; week = addDays(week, 7)) {
      const days = perWeek.get(week) ?? []
      if (days.length >= goal) reach('streak', ++run, days[goal - 1])
      else if (!frozen.has(week)) run = 0
    }
  }

  return BADGES.map((badge) => ({
    badge,
    progress: Math.min(badge.goal, value.get(badge.metric) ?? 0),
    earnedOn: earned.get(badge.id) ?? null,
  }))
}

/** "7 / 10", "42.5 / 100 t", or "" for one-off feats. */
export function badgeProgressLabel({ badge, progress }: BadgeState): string {
  if (badge.goal === 1) return ''
  if (badge.metric === 'volume') {
    const t = (kg: number) => Number((kg / 1000).toFixed(kg < 10_000 ? 1 : 0)).toLocaleString('en-US')
    return `${t(progress)} / ${t(badge.goal)} t`
  }
  return `${progress} / ${badge.goal}`
}

/** Earned badge ids that are not in `seen`, in shelf order. */
export function unseenBadges(states: readonly BadgeState[], seen: ReadonlySet<string>): string[] {
  return states.filter((s) => s.earnedOn && !seen.has(s.badge.id)).map((s) => s.badge.id)
}

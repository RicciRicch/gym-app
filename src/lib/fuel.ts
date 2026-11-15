// Pure pre-workout logic: what the gorilla suggests eating or drinking before
// today's session (time of day, leg day, how much work is planned), how it
// reacts to what you logged, and what your own history says works for you.
// Tone: half-ironic hard-core coach. The advice underneath stays sane:
// at most a coffee or two, no caffeine late in the day, carbs a few hours before.

import { isLegDay } from './badges'
import { pick } from './gorilla'

export type Fuel = 'coffee' | 'energy' | 'carbs' | 'preworkout'

export const FUELS: readonly { id: Fuel; label: string; emoji: string }[] = [
  { id: 'coffee', label: 'Coffee', emoji: '☕' },
  { id: 'energy', label: 'Energy drink', emoji: '⚡' },
  { id: 'carbs', label: 'Carbs', emoji: '🍌' },
  { id: 'preworkout', label: 'Pre-workout', emoji: '🧪' },
]

export const isFuel = (value: string): value is Fuel => FUELS.some((f) => f.id === value)

export interface FuelStep {
  emoji: string
  /** When, relative to the session: "2 h before". */
  when: string
  text: string
}

export interface FuelTip {
  headline: string
  steps: FuelStep[]
}

export interface FuelTipInput {
  /** Local time now; the session is assumed to be soon. */
  now: Date
  /** Local YYYY-MM-DD, seeds the line pick. */
  today: string
  dayName: string
  /** Planned sets for the session. */
  plannedSets: number
}

/** After this hour caffeine is a bad idea (sleep). */
const CAFFEINE_CUTOFF = 16

const HEAVY = [
  "Leg day. Eat like the squat rack owes you money. (Rice. Not the whole bag.)",
  'Big session ahead. Carb load like a marathoner, lift like an angry gorilla.',
  'Today we fuel the furnace. Oats, rice, bananas. Salad is for rest days.',
]
const LIGHT = [
  "Light day. You don't need a carb load to lift a coffee cup.",
  'Short session. Water, maybe a banana. No need to eat a bakery.',
  'Easy one today. Fuel accordingly: not like a bear before hibernation.',
]
const NORMAL = [
  "Fuel up. Nobody ever PR'd on an empty tank and good intentions.",
  'Pre-workout ritual time. The gains start in the kitchen.',
  "Eat something real. 'Air and motivation' is not a meal plan.",
]
const LATE = [
  'Caffeine now is a loan against tonight\'s sleep. The interest is brutal.',
  'Too late for coffee. Sleep is the real pre-workout, and you want it tonight.',
  "Evening session: skip the caffeine, or you'll be counting sheep at 3 AM. Sheep don't lift.",
]
const MORNING = [
  'Morning lift. Coffee first, personality later.',
  'Early session. A coffee and a banana: the breakfast of gorillas.',
  "Up early to train? Respect. Now drink your coffee before you talk to anyone.",
]

export function fuelTip({ now, today, dayName, plannedSets }: FuelTipInput): FuelTip {
  const hour = now.getHours()
  const late = hour >= CAFFEINE_CUTOFF
  const morning = hour < 10
  const heavy = isLegDay(dayName) || plannedSets >= 18
  const light = !heavy && plannedSets > 0 && plannedSets <= 8

  const headline = pick(
    late && !light ? LATE : morning && !heavy ? MORNING : heavy ? HEAVY : light ? LIGHT : NORMAL,
    `${today}:${dayName}`,
  )

  const steps: FuelStep[] = []
  if (morning) {
    steps.push({ emoji: '🍌', when: '30–60 min before', text: heavy ? 'Banana and oats. Fast carbs, no regrets.' : 'A banana or toast with honey.' })
  } else if (light) {
    steps.push({ emoji: '🍌', when: '1 h before', text: 'A piece of fruit is plenty.' })
  } else {
    steps.push({
      emoji: '🍚',
      when: '2–3 h before',
      text: heavy ? 'A proper plate: rice or pasta, some protein. Carb load, gorilla edition.' : 'A normal meal with carbs and some protein.',
    })
  }
  if (late) {
    steps.push({ emoji: '🚫', when: 'Now', text: 'No coffee, no energy drinks. Your 3 AM self says thanks.' })
  } else {
    steps.push({ emoji: '☕', when: '30 min before', text: 'One coffee. Maybe two. Not a bathtub.' })
  }
  steps.push({ emoji: '💧', when: 'During', text: heavy ? 'Water. Lots. Sweat is weakness leaving; water is the refill.' : 'Water between sets.' })
  return { headline, steps }
}

/** The gorilla's comment on what you had before a workout. */
export function fuelReaction(fuel: readonly Fuel[]): string {
  const has = (f: Fuel) => fuel.includes(f)
  const stims = ['coffee', 'energy', 'preworkout'].filter((f) => has(f as Fuel)).length
  if (fuel.length === 0) return 'Natty and fasted. Respect. Also, eat something.'
  if (stims >= 3) return 'Coffee, an energy drink AND pre-workout? Your heart rate just texted me. Ease up.'
  if (stims === 2) return 'Double stim. Bold. Your heart would like a word.'
  if (has('carbs') && stims === 0) return 'Pure carb power. Old school. The gorilla approves.'
  if (has('energy')) return 'One can is a boost. A six-pack is a cry for help. Noted.'
  if (has('preworkout')) return 'Pre-workout logged. Tingly face, heavy weights. Noted.'
  if (has('coffee') && has('carbs')) return 'Coffee and carbs: the textbook combo. Noted.'
  return 'Noted. I am building a file on you.'
}

export interface FuelSession {
  dayName: string
  /** null = not answered. */
  fuel: readonly Fuel[] | null
  volume: number
}

export interface FuelInsight {
  fuel: Fuel
  /** Average volume difference against sessions without it, in percent (rounded). */
  percent: number
  sessions: number
}

/** Answered sessions needed before any insight, and per side of a comparison. */
export const INSIGHT_MIN_SESSIONS = 6
const MIN_PER_SIDE = 3

/**
 * Which fuel goes with lifting more. Each answered session's volume is compared
 * with the average for the same day (so legs are not compared with arms); then,
 * per fuel, sessions with it against sessions without it. Returns the clearest
 * difference of at least 3%, or null while there is not enough data.
 */
export function fuelInsight(sessions: readonly FuelSession[]): FuelInsight | null {
  const answered = sessions.filter((s) => s.fuel !== null && s.volume > 0)
  if (answered.length < INSIGHT_MIN_SESSIONS) return null

  const byDay = new Map<string, number[]>()
  for (const s of answered) byDay.set(s.dayName, [...(byDay.get(s.dayName) ?? []), s.volume])
  const relative = answered
    .filter((s) => byDay.get(s.dayName)!.length >= 2)
    .map((s) => {
      const vols = byDay.get(s.dayName)!
      return { fuel: s.fuel!, rel: s.volume / (vols.reduce((a, b) => a + b, 0) / vols.length) }
    })

  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  let best: FuelInsight | null = null
  for (const { id } of FUELS) {
    const withIt = relative.filter((s) => s.fuel.includes(id)).map((s) => s.rel)
    const without = relative.filter((s) => !s.fuel.includes(id)).map((s) => s.rel)
    if (withIt.length < MIN_PER_SIDE || without.length < MIN_PER_SIDE) continue
    const diff = mean(withIt) / mean(without) - 1
    if (Math.abs(diff) < 0.03) continue
    if (!best || Math.abs(diff) > Math.abs(best.percent) / 100) {
      best = { fuel: id, percent: Math.round(diff * 100), sessions: withIt.length }
    }
  }
  return best
}

/** One line about the insight, e.g. "With coffee you lift 8% more (6 sessions)." */
export function formatInsight({ fuel, percent, sessions }: FuelInsight): string {
  const name = { coffee: 'coffee', energy: 'an energy drink', carbs: 'carbs', preworkout: 'pre-workout' }[fuel]
  return percent > 0
    ? `With ${name} you lift ${percent}% more on average (${sessions} sessions). Science.`
    : `With ${name} you lift ${-percent}% less on average (${sessions} sessions). Awkward.`
}

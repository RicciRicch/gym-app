// Strength levels: the estimated one-rep max as a multiple of body weight, placed
// on common (approximate) strength standards for the four main barbell lifts.

import { searchKey } from './muscles'

export type Lift = 'bench' | 'squat' | 'deadlift' | 'ohp'
export type Sex = 'male' | 'female'

export const LIFTS: readonly Lift[] = ['bench', 'squat', 'deadlift', 'ohp']
export const LIFT_LABEL: Record<Lift, string> = {
  bench: 'Bench Press',
  squat: 'Back Squat',
  deadlift: 'Deadlift',
  ohp: 'Overhead Press',
}

export const LEVELS = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'] as const

/**
 * Body-weight multiples where Novice, Intermediate, Advanced and Elite start.
 * Below the first one is Beginner. Rounded versions of widely used standards.
 */
const STANDARDS: Record<Sex, Record<Lift, readonly [number, number, number, number]>> = {
  male: {
    bench: [0.75, 1, 1.5, 2],
    squat: [1, 1.5, 2, 2.75],
    deadlift: [1.25, 1.75, 2.25, 3],
    ohp: [0.5, 0.7, 1, 1.3],
  },
  female: {
    bench: [0.5, 0.75, 1, 1.5],
    squat: [0.75, 1.25, 1.5, 2],
    deadlift: [1, 1.25, 1.75, 2.5],
    ohp: [0.35, 0.5, 0.75, 1],
  },
}

/** The core exercise a lift is measured on (exact name, so variants like front squat don't count). */
export function liftOf(name: string): Lift | null {
  const key = searchKey(name).trim()
  for (const lift of LIFTS) if (searchKey(LIFT_LABEL[lift]) === key) return lift
  return null
}

export interface StrengthLevel {
  /** 0 = Beginner ... 4 = Elite. */
  level: number
  /** One-rep max / body weight. */
  ratio: number
  /** Position on the 5-segment bar, 0..5 (level + how far into it). */
  position: number
  /** The next level and the kg still missing (rounded up to 0.5 kg); null at Elite. */
  next: { level: number; needKg: number; targetKg: number } | null
}

const roundUpHalf = (kg: number) => Math.ceil(kg * 2 - 1e-9) / 2

export function strengthLevel(lift: Lift, oneRepMax: number, bodyweight: number, sex: Sex): StrengthLevel {
  const starts = STANDARDS[sex][lift]
  const ratio = oneRepMax / bodyweight
  let level = 0
  while (level < starts.length && ratio >= starts[level] - 1e-9) level++
  const from = level === 0 ? 0 : starts[level - 1]
  const to = starts[level]
  const position = to === undefined ? LEVELS.length : level + Math.min(1, Math.max(0, (ratio - from) / (to - from)))
  if (to === undefined) return { level, ratio, position, next: null }
  const targetKg = roundUpHalf(to * bodyweight)
  return { level, ratio, position, next: { level: level + 1, needKg: Math.max(0.5, roundUpHalf(targetKg - oneRepMax)), targetKg } }
}

/** The lift furthest behind on the bar, for "Squat is your weakest lift". */
export function weakestLift(levels: ReadonlyMap<Lift, StrengthLevel>): Lift | null {
  let weakest: Lift | null = null
  for (const [lift, s] of levels) if (weakest === null || s.position < levels.get(weakest)!.position) weakest = lift
  return weakest
}

/** "1.37× body weight". */
export const formatRatio = (ratio: number) => `${ratio.toFixed(2).replace(/0$/, '')}× body weight`

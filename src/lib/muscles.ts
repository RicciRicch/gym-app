// Pure muscle-map logic: which body regions an exercise's muscle names hit,
// how much each region was trained in a period, and the gorilla's remark
// about the ones that were left out.

import { pick } from './gorilla'
import type { ISODate } from './schedule'

export const REGIONS = [
  'chest',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'core',
  'upperBack',
  'lats',
  'lowerBack',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
] as const

export type Region = (typeof REGIONS)[number]

export const REGION_LABEL: Record<Region, string> = {
  chest: 'Chest',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  core: 'Core',
  upperBack: 'Upper back',
  lats: 'Lats',
  lowerBack: 'Lower back',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
}

// Muscle names are free text (core exercises in English, custom ones typed by
// the user, possibly in Serbian), so they are matched by keyword. Order matters:
// "lower back" must win over the generic "back".
const KEYWORDS: readonly [RegExp, readonly Region[]][] = [
  [/chest|pec|grud/, ['chest']],
  [/delt|shoulder|rame/, ['shoulders']],
  [/bicep/, ['biceps']],
  [/tricep/, ['triceps']],
  [/forearm|grip|podlakt/, ['forearms']],
  [/core|\babs?\b|abdom|oblique|trbu|stomak/, ['core']],
  [/lower back|erector|donja le[dđ]a|lumb/, ['lowerBack']],
  [/upper back|trap|rhomboid|gornja le[dđ]a/, ['upperBack']],
  [/\blats?\b|latissimus/, ['lats']],
  [/back|le[dđ]a/, ['lats', 'upperBack']],
  [/quad|kvadri/, ['quads']],
  [/hamstring|zadnja lo[zž]a/, ['hamstrings']],
  [/glute|gluteus|guz/, ['glutes']],
  [/calf|calves|list/, ['calves']],
  [/\blegs?\b|nog[ae]/, ['quads', 'hamstrings', 'glutes']],
  [/\barms?\b|ruke/, ['biceps', 'triceps']],
]

/** The body regions a muscle name refers to ("Front delts" -> shoulders). Empty when unknown. */
export function regionsOf(muscle: string): readonly Region[] {
  const name = muscle.toLowerCase()
  return KEYWORDS.find(([pattern]) => pattern.test(name))?.[1] ?? []
}

export type MuscleLoad = Record<Region, number>

/** How much a secondary muscle counts per set; the first muscle listed is the main one. */
const SECONDARY = 0.5

/**
 * Sets per region between `from` and `to` (inclusive). A set counts 1 for the
 * exercise's first listed muscle and 0.5 for the others.
 */
export function muscleLoad(
  sets: readonly { exerciseId: string; date: ISODate }[],
  musclesByExercise: ReadonlyMap<string, readonly string[]>,
  from: ISODate,
  to: ISODate,
): MuscleLoad {
  const load = Object.fromEntries(REGIONS.map((r) => [r, 0])) as MuscleLoad
  for (const s of sets) {
    if (s.date < from || s.date > to) continue
    const credit = new Map<Region, number>()
    ;(musclesByExercise.get(s.exerciseId) ?? []).forEach((muscle, i) => {
      for (const region of regionsOf(muscle)) credit.set(region, Math.max(credit.get(region) ?? 0, i === 0 ? 1 : SECONDARY))
    })
    for (const [region, value] of credit) load[region] += value
  }
  return load
}

export type Heat = 0 | 1 | 2 | 3

export const HEAT_LABEL: Record<Heat, string> = { 0: 'Cold', 1: 'Warm', 2: 'Hot', 3: 'On fire' }

/** Fill per heat level: one hue, brighter = more work. */
export const HEAT_FILL: Record<Heat, string> = { 0: '#2f3741', 1: '#8a4b14', 2: '#e07a1a', 3: '#ffb02e' }

/** 0 = untouched, 1 = some work, 2 = 5+ sets a week, 3 = 10+ sets a week. */
export function heat(setsDone: number, days = 7): Heat {
  const perWeek = (setsDone * 7) / days
  return perWeek >= 10 ? 3 : perWeek >= 5 ? 2 : perWeek > 0 ? 1 : 0
}

const TEASE: Record<Region, string> = {
  hamstrings: 'Your hamstrings filed a missing person report.',
  quads: "Your quads are sending 'we miss you' postcards.",
  glutes: 'Your glutes think you retired.',
  calves: 'Calves: still waiting for their invitation.',
  chest: 'Chest day called. It went to voicemail.',
  lats: 'Your lats forgot what a pull feels like.',
  upperBack: 'Your upper back is slouching in protest.',
  lowerBack: 'Lower back untouched. Bold, for someone who sits all day.',
  shoulders: "Shoulders are cold. Boulders don't build themselves.",
  biceps: 'No curls? Who are you and what have you done with you?',
  triceps: 'Triceps are two thirds of your arm. Just saying.',
  forearms: 'Forearms neglected. Jar lids everywhere are celebrating.',
  core: 'Your abs are in witness protection.',
}

// The big movers get called out before the small stuff.
const TEASE_ORDER: readonly Region[] = [
  'hamstrings',
  'quads',
  'chest',
  'lats',
  'glutes',
  'shoulders',
  'upperBack',
  'core',
  'biceps',
  'triceps',
  'lowerBack',
  'calves',
  'forearms',
]

export interface MuscleVerdict {
  line: string
  /** The region being teased, if any. */
  region: Region | null
}

/** The gorilla's remark: teases one cold region (it changes from day to day), or praises a full map. */
export function muscleVerdict(load: MuscleLoad, today: ISODate): MuscleVerdict {
  const cold = TEASE_ORDER.filter((r) => load[r] === 0)
  if (cold.length === REGIONS.length) return { line: 'Nothing lit up yet. The couch is getting a great workout, though.', region: null }
  if (cold.length === 0) return { line: 'Everything is lit. Suspiciously well-rounded. Who is your coach? Oh right.', region: null }
  // One of the three most important cold regions, so it is not the same joke every day.
  const region = pick(cold.slice(0, 3), today) as Region
  return { line: TEASE[region], region }
}

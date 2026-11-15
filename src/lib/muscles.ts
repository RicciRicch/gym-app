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

// Library filter: big muscle groups, by an exercise's main (first) muscle.

export const MUSCLE_GROUPS = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core'] as const
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export const GROUP_LABEL: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  legs: 'Legs',
  core: 'Core',
}

const GROUP_OF: Record<Region, MuscleGroup> = {
  chest: 'chest',
  lats: 'back',
  upperBack: 'back',
  lowerBack: 'back',
  shoulders: 'shoulders',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  quads: 'legs',
  hamstrings: 'legs',
  glutes: 'legs',
  calves: 'legs',
  core: 'core',
}

/** The group of an exercise's main muscle (the first one listed that is recognised), null when none is. */
export function exerciseGroup(muscles: readonly string[]): MuscleGroup | null {
  for (const muscle of muscles) {
    const region = regionsOf(muscle)[0]
    if (region) return GROUP_OF[region]
  }
  return null
}

/** Lower-case, accents stripped and đ as "dj", so "ledja" finds "Leđa" and "squat" finds "Squat". */
export const searchKey = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'dj')

/** True when every word of the query is found in the name, a muscle or the group name. */
export function matchesSearch(query: string, exercise: { name: string; muscles: readonly string[] }): boolean {
  const words = searchKey(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const group = exerciseGroup(exercise.muscles)
  const haystack = searchKey([exercise.name, ...exercise.muscles, group ? GROUP_LABEL[group] : ''].join(' '))
  return words.every((w) => haystack.includes(w))
}

// Exercise pictures without art: the body with the worked muscles lit.

export type MuscleRole = 'main' | 'assist'

/** Which regions an exercise works: the first recognised muscle is the main one, the rest assist. */
export function muscleRoles(muscles: readonly string[]): Map<Region, MuscleRole> {
  const roles = new Map<Region, MuscleRole>()
  let mainFound = false
  for (const muscle of muscles) {
    const regions = regionsOf(muscle)
    if (regions.length === 0) continue
    for (const r of regions) if (!roles.has(r)) roles.set(r, mainFound ? 'assist' : 'main')
    mainFound = true
  }
  return roles
}

/** Regions only visible from behind; anything else is drawn from the front. */
const BACK_SIDE = new Set<Region>(['upperBack', 'lats', 'lowerBack', 'triceps', 'glutes', 'hamstrings', 'calves'])

/** Which side of the body shows an exercise best: the side of its main muscle. */
export function bestSide(roles: ReadonlyMap<Region, MuscleRole>): 'front' | 'back' {
  const main = [...roles].find(([, role]) => role === 'main')?.[0]
  return main && BACK_SIDE.has(main) ? 'back' : 'front'
}

/** Vertical centre of each region in the 200 x 440 figure, to crop a thumbnail around it. */
export const REGION_Y: Record<Region, number> = {
  chest: 95,
  shoulders: 100,
  biceps: 120,
  triceps: 120,
  forearms: 150,
  core: 140,
  upperBack: 100,
  lats: 120,
  lowerBack: 160,
  glutes: 195,
  quads: 230,
  hamstrings: 240,
  calves: 300,
}

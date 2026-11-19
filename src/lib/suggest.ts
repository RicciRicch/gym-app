// A suggested split from a few answers: which weekdays you can train, your goal
// and how long a session may take. Pure: the layout is picked so the same muscles
// are never trained two days in a row, exercises come from the core library (by
// slug), and muscles the user has been skipping get first pick and an extra set.

import type { MuscleLoad, Region } from './muscles'

export type Goal = 'strength' | 'muscle' | 'fit'
export type SessionMinutes = 45 | 60 | 90

export interface SuggestInput {
  /** Weekdays you can train, 0 = Monday. One to six of them. */
  weekdays: readonly number[]
  goal: Goal
  minutes: SessionMinutes
  /** Regions the user has been skipping (see `neglectedRegions`). */
  neglected?: readonly Region[]
}

export interface SuggestedExercise {
  slug: string
  sets: number
  reps: number
  region: Region
}

export interface SuggestedDay {
  name: string
  weekday: number
  exercises: SuggestedExercise[]
}

export type Layout = 'full-body' | 'upper-lower' | 'ppl' | 'upper-lower-ppl'

export interface GroupVolume {
  group: VolumeGroup
  /** Sets per week. */
  sets: number
  /** Days per week the group is trained. */
  days: number
}

export interface Suggestion {
  layout: Layout
  name: string
  days: SuggestedDay[]
  /** Short, plain reasons for the choices, in order of importance. */
  reasons: string[]
  volume: GroupVolume[]
}

// ------------------------------------------------------------------- slots
// A slot is a movement; its candidates are core exercises in order of preference.
// Day templates ask for a slot and a variant, so "Upper B" picks other exercises than "Upper A".

interface Slot {
  region: Region
  compound: boolean
  candidates: readonly string[]
}

const SLOTS = {
  squat: { region: 'quads', compound: true, candidates: ['squat', 'front-squat', 'hack-squat'] },
  hinge: { region: 'hamstrings', compound: true, candidates: ['romanian-deadlift', 'deadlift'] },
  legPress: { region: 'quads', compound: true, candidates: ['leg-press', 'hack-squat'] },
  lunge: { region: 'quads', compound: false, candidates: ['bulgarian-split-squat', 'walking-lunge'] },
  hipThrust: { region: 'glutes', compound: false, candidates: ['hip-thrust', 'hip-thrust-machine'] },
  legCurl: { region: 'hamstrings', compound: false, candidates: ['seated-leg-curl', 'leg-curl'] },
  legExtension: { region: 'quads', compound: false, candidates: ['leg-extension'] },
  calves: { region: 'calves', compound: false, candidates: ['standing-calf-raise', 'seated-calf-raise'] },
  press: { region: 'chest', compound: true, candidates: ['bench-press', 'dumbbell-bench-press'] },
  inclinePress: { region: 'chest', compound: true, candidates: ['incline-dumbbell-press', 'incline-bench-press'] },
  fly: { region: 'chest', compound: false, candidates: ['cable-fly', 'pec-deck'] },
  overheadPress: { region: 'shoulders', compound: true, candidates: ['overhead-press', 'dumbbell-shoulder-press'] },
  lateralRaise: { region: 'shoulders', compound: false, candidates: ['lateral-raise', 'cable-lateral-raise'] },
  rearDelts: { region: 'upperBack', compound: false, candidates: ['face-pull', 'reverse-pec-deck'] },
  pullDown: { region: 'lats', compound: true, candidates: ['pull-up', 'lat-pulldown', 'chin-up'] },
  row: { region: 'upperBack', compound: true, candidates: ['barbell-row', 'seated-cable-row', 'dumbbell-row'] },
  cableRow: { region: 'upperBack', compound: false, candidates: ['seated-cable-row', 'machine-row'] },
  curl: { region: 'biceps', compound: false, candidates: ['dumbbell-curl', 'barbell-curl', 'hammer-curl'] },
  triceps: { region: 'triceps', compound: false, candidates: ['triceps-pushdown', 'overhead-triceps-extension', 'skull-crusher'] },
  core: { region: 'core', compound: false, candidates: ['hanging-leg-raise', 'cable-crunch', 'plank'] },
} as const satisfies Record<string, Slot>

type SlotKey = keyof typeof SLOTS
type Pick = readonly [SlotKey, number]

/** Every core exercise a suggestion can use (for checks against the library). */
export const SUGGESTED_SLUGS: readonly string[] = [...new Set(Object.values(SLOTS).flatMap((s) => s.candidates))]

// Day templates: slots in priority order. The time budget cuts from the end.
const TEMPLATES: Record<string, readonly Pick[]> = {
  'Full Body A': [['squat', 0], ['press', 0], ['row', 0], ['lateralRaise', 0], ['curl', 0], ['triceps', 0], ['core', 0]],
  'Full Body B': [['hinge', 1], ['overheadPress', 0], ['pullDown', 0], ['lunge', 0], ['fly', 0], ['calves', 0], ['core', 1]],
  'Full Body C': [['legPress', 0], ['inclinePress', 0], ['cableRow', 0], ['hipThrust', 0], ['rearDelts', 0], ['curl', 2], ['triceps', 1]],
  Upper: [['press', 0], ['row', 0], ['overheadPress', 0], ['pullDown', 1], ['lateralRaise', 0], ['triceps', 0], ['curl', 0]],
  Lower: [['squat', 0], ['hinge', 0], ['legPress', 0], ['legCurl', 0], ['calves', 0], ['core', 0]],
  'Upper A': [['press', 0], ['row', 0], ['overheadPress', 0], ['pullDown', 1], ['lateralRaise', 0], ['triceps', 0], ['curl', 0]],
  'Upper B': [['overheadPress', 1], ['pullDown', 0], ['inclinePress', 0], ['cableRow', 0], ['rearDelts', 0], ['curl', 2], ['triceps', 1]],
  'Lower A': [['squat', 0], ['hinge', 0], ['legPress', 0], ['legCurl', 0], ['calves', 0], ['core', 0]],
  'Lower B': [['hinge', 1], ['lunge', 0], ['hipThrust', 0], ['legExtension', 0], ['calves', 1], ['core', 1]],
  Push: [['press', 0], ['overheadPress', 0], ['inclinePress', 0], ['lateralRaise', 0], ['fly', 0], ['triceps', 0], ['triceps', 1]],
  Pull: [['pullDown', 0], ['row', 0], ['cableRow', 1], ['rearDelts', 0], ['curl', 0], ['curl', 2]],
  Legs: [['squat', 0], ['hinge', 0], ['legPress', 0], ['legCurl', 0], ['calves', 0], ['core', 0]],
  'Push B': [['overheadPress', 1], ['inclinePress', 1], ['press', 1], ['lateralRaise', 1], ['fly', 1], ['triceps', 2]],
  'Pull B': [['row', 1], ['pullDown', 1], ['cableRow', 0], ['rearDelts', 1], ['curl', 1], ['curl', 2]],
  'Legs B': [['hinge', 1], ['lunge', 0], ['hipThrust', 0], ['legExtension', 0], ['calves', 1], ['core', 1]],
}

const EXERCISES_PER_SESSION: Record<SessionMinutes, number> = { 45: 4, 60: 5, 90: 6 }

// ------------------------------------------------------------------ layout

/** Whether any two training days follow each other (Sunday is followed by Monday). */
export function hasBackToBack(weekdays: readonly number[]): boolean {
  const days = new Set(weekdays)
  if (days.size === 7) return true
  return [...days].some((d) => days.has((d + 1) % 7))
}

/** Which split fits the days: full body only when no two days touch. */
export function chooseLayout(weekdays: readonly number[]): { layout: Layout; dayNames: string[] } {
  const n = new Set(weekdays).size
  const touching = hasBackToBack(weekdays)
  if (n <= 1) return { layout: 'full-body', dayNames: ['Full Body A'] }
  if (n === 2) return touching ? { layout: 'upper-lower', dayNames: ['Upper', 'Lower'] } : { layout: 'full-body', dayNames: ['Full Body A', 'Full Body B'] }
  if (n === 3)
    return touching
      ? { layout: 'ppl', dayNames: ['Push', 'Pull', 'Legs'] }
      : { layout: 'full-body', dayNames: ['Full Body A', 'Full Body B', 'Full Body C'] }
  if (n === 4) return { layout: 'upper-lower', dayNames: ['Upper A', 'Lower A', 'Upper B', 'Lower B'] }
  if (n === 5) return { layout: 'upper-lower-ppl', dayNames: ['Upper', 'Lower', 'Push', 'Pull', 'Legs'] }
  return { layout: 'ppl', dayNames: ['Push', 'Pull', 'Legs', 'Push B', 'Pull B', 'Legs B'] }
}

const LAYOUT_NAME: Record<Layout, string> = {
  'full-body': 'Full Body',
  'upper-lower': 'Upper / Lower',
  ppl: 'Push / Pull / Legs',
  'upper-lower-ppl': 'Upper / Lower + PPL',
}

// --------------------------------------------------------------- sets, reps

function dose(goal: Goal, slot: Slot, first: boolean): { sets: number; reps: number } {
  if (slot.region === 'core') return { sets: 3, reps: goal === 'strength' ? 10 : 15 }
  if (slot.region === 'calves') return { sets: 3, reps: 12 }
  if (goal === 'strength') return slot.compound ? (first ? { sets: 5, reps: 5 } : { sets: 4, reps: 6 }) : { sets: 3, reps: 10 }
  if (goal === 'muscle') return slot.compound ? { sets: 4, reps: 8 } : { sets: 3, reps: 12 }
  return slot.compound ? { sets: 3, reps: 10 } : { sets: 3, reps: 12 }
}

/**
 * One day's exercises: the template's compounds first, then accessories with
 * skipped muscles moved forward, cut to the time budget. Skipped muscles get a set more.
 */
function buildDay(name: string, weekday: number, input: SuggestInput): SuggestedDay {
  const neglected = new Set(input.neglected ?? [])
  const template = TEMPLATES[name]
  const lead = template.slice(0, 2)
  const rest = template.slice(2)
  const ordered = [...lead, ...rest.filter(([k]) => neglected.has(SLOTS[k].region)), ...rest.filter(([k]) => !neglected.has(SLOTS[k].region))]

  const exercises: SuggestedExercise[] = []
  const used = new Set<string>()
  for (const [key, variant] of ordered) {
    if (exercises.length >= EXERCISES_PER_SESSION[input.minutes]) break
    const slot: Slot = SLOTS[key]
    // Next candidate when the variant is already on this day.
    const slug = [...slot.candidates.slice(variant % slot.candidates.length), ...slot.candidates].find((s) => !used.has(s))
    if (!slug) continue
    used.add(slug)
    const { sets, reps } = dose(input.goal, slot, exercises.length === 0)
    // The extra set goes to the accessory work, the main lifts keep their dose.
    const extra = neglected.has(slot.region) && exercises.length >= lead.length ? 1 : 0
    exercises.push({ slug, sets: sets + extra, reps, region: slot.region })
  }
  return { name, weekday, exercises }
}

// ------------------------------------------------------------------ volume

export type VolumeGroup = 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core'
const GROUP_OF: Record<Region, VolumeGroup> = {
  chest: 'Chest',
  lats: 'Back',
  upperBack: 'Back',
  lowerBack: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Arms',
  triceps: 'Arms',
  forearms: 'Arms',
  quads: 'Legs',
  hamstrings: 'Legs',
  glutes: 'Legs',
  calves: 'Legs',
  core: 'Core',
}
const GROUPS: readonly VolumeGroup[] = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core']

/** Sets per week and training days per muscle group (main muscle of each exercise only). */
export function weeklyVolume(days: readonly SuggestedDay[]): GroupVolume[] {
  return GROUPS.map((group) => {
    const hits = days.map((d) => d.exercises.filter((e) => GROUP_OF[e.region] === group).reduce((n, e) => n + e.sets, 0))
    return { group, sets: hits.reduce((a, b) => a + b, 0), days: hits.filter((s) => s > 0).length }
  }).filter((v) => v.sets > 0)
}

// ----------------------------------------------------------------- reasons

// Big muscles first: they lead when several were skipped.
const REGION_WORD: Partial<Record<Region, string>> = {
  quads: 'quads',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  lats: 'lats',
  upperBack: 'upper back',
  chest: 'chest',
  shoulders: 'shoulders',
  calves: 'calves',
  biceps: 'biceps',
  triceps: 'triceps',
  core: 'core',
}

function listWords(words: readonly string[]): string {
  return words.length <= 1 ? (words[0] ?? '') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`
}

function reasonsFor(layout: Layout, input: SuggestInput, days: readonly SuggestedDay[]): string[] {
  const n = days.length
  const reasons: string[] = []
  if (layout === 'full-body') {
    reasons.push(
      n === 1
        ? 'One day a week: a full body workout hits everything at once.'
        : 'Your days are spread out, so every workout can train the whole body and each muscle still gets a day off.',
    )
  } else if (layout === 'upper-lower') {
    reasons.push('Upper and lower body take turns, so no muscle is trained two days in a row.')
  } else if (layout === 'ppl') {
    reasons.push(
      n === 3
        ? 'Some of your days are back to back, so each day trains different muscles: push, pull, legs.'
        : 'Six days: push, pull and legs twice, so every muscle gets two workouts and two days off.',
    )
  } else {
    reasons.push('Upper / lower, then push / pull / legs: every muscle twice a week, never two days in a row.')
  }
  reasons.push(
    input.goal === 'strength'
      ? 'Strength: heavy sets of 5 on the big lifts first, lighter work after.'
      : input.goal === 'muscle'
        ? 'Muscle: 8 to 12 reps with enough sets to grow, compound lifts first.'
        : 'Fitness: moderate weights, 10 to 15 reps, and core work in the week.',
  )
  const perDay = EXERCISES_PER_SESSION[input.minutes]
  reasons.push(`${perDay} exercises per workout fit in about ${input.minutes} minutes with rest.`)
  const skipped = (input.neglected ?? []).filter((r) => days.some((d) => d.exercises.some((e) => e.region === r)))
  const words = skipped.map((r) => REGION_WORD[r]).filter((w): w is string => !!w)
  if (words.length > 0) reasons.push(`Extra sets for your ${listWords(words.slice(0, 3))}: they got almost nothing in the last 30 days.`)
  return reasons
}

// -------------------------------------------------------------------- main

/** The split for these answers. Weekdays are sorted; days get templates in order. */
export function suggestSplit(input: SuggestInput): Suggestion {
  const weekdays = [...new Set(input.weekdays)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b).slice(0, 6)
  if (weekdays.length === 0) throw new Error('Pick at least one day')
  const { layout, dayNames } = chooseLayout(weekdays)
  const days = dayNames.map((name, i) => buildDay(name, weekdays[i], input))
  return { layout, name: LAYOUT_NAME[layout], days, reasons: reasonsFor(layout, input, days), volume: weeklyVolume(days) }
}

/**
 * Up to three regions with close to no work in the period (fewest sets first, big
 * muscles first on a tie), once there is enough history to tell (3+ workouts).
 */
export function neglectedRegions(load: MuscleLoad, workouts: number): Region[] {
  if (workouts < 3) return []
  const order = Object.keys(REGION_WORD) as Region[]
  return order
    .filter((r) => load[r] < 2)
    .sort((a, b) => load[a] - load[b] || order.indexOf(a) - order.indexOf(b))
    .slice(0, 3)
}

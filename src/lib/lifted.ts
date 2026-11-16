// "You lifted 3.5 rhinos": total volume turned into real-world things.

export interface LiftThing {
  emoji: string
  one: string
  many: string
  kg: number
}

/** Rough real-world weights, lightest first. */
export const LIFT_THINGS: readonly LiftThing[] = [
  { emoji: '🍉', one: 'watermelon', many: 'watermelons', kg: 8 },
  { emoji: '🐕', one: 'golden retriever', many: 'golden retrievers', kg: 30 },
  { emoji: '🐼', one: 'giant panda', many: 'giant pandas', kg: 100 },
  { emoji: '🦁', one: 'lion', many: 'lions', kg: 190 },
  { emoji: '🐻', one: 'grizzly bear', many: 'grizzly bears', kg: 300 },
  { emoji: '🎹', one: 'grand piano', many: 'grand pianos', kg: 450 },
  { emoji: '🐄', one: 'cow', many: 'cows', kg: 700 },
  { emoji: '🦒', one: 'giraffe', many: 'giraffes', kg: 1200 },
  { emoji: '🦛', one: 'hippo', many: 'hippos', kg: 2000 },
  { emoji: '🦏', one: 'rhino', many: 'rhinos', kg: 3000 },
  { emoji: '🐘', one: 'elephant', many: 'elephants', kg: 6000 },
  { emoji: '🦖', one: 'T. rex', many: 'T. rexes', kg: 8000 },
  { emoji: '🚌', one: 'city bus', many: 'city buses', kg: 12000 },
  { emoji: '🚒', one: 'fire truck', many: 'fire trucks', kg: 20000 },
  { emoji: '✈️', one: 'Boeing 737', many: 'Boeing 737s', kg: 41000 },
  { emoji: '🐋', one: 'blue whale', many: 'blue whales', kg: 150000 },
  { emoji: '🗽', one: 'Statue of Liberty', many: 'Statues of Liberty', kg: 225000 },
  { emoji: '🛰️', one: 'space station', many: 'space stations', kg: 420000 },
  { emoji: '🚀', one: 'Saturn V rocket', many: 'Saturn V rockets', kg: 2900000 },
  { emoji: '🗼', one: 'Eiffel Tower', many: 'Eiffel Towers', kg: 10100000 },
  { emoji: '🚢', one: 'Titanic', many: 'Titanics', kg: 52000000 },
]

export interface LiftedComparison {
  thing: LiftThing
  /** Rounded for display: to 0.5 below 10, whole numbers above. */
  count: number
  /** "3.5 rhinos" */
  label: string
}

const roundCount = (n: number) => (n < 10 ? Math.round(n * 2) / 2 : Math.round(n))

/**
 * The biggest thing the volume covers at least twice ("2.5 elephants" beats
 * "1 T. rex"); falls back to one of something, then to a fraction of a watermelon.
 */
export function liftedComparison(kg: number): LiftedComparison | null {
  if (!(kg > 0)) return null
  const byWeight = [...LIFT_THINGS].reverse()
  const thing = byWeight.find((t) => kg / t.kg >= 2) ?? byWeight.find((t) => kg / t.kg >= 1) ?? LIFT_THINGS[0]
  const count = roundCount(kg / thing.kg)
  if (count < 0.5) return null
  const label = `${count.toLocaleString('en-GB')} ${count === 1 ? thing.one : thing.many}`
  return { thing, count, label }
}

export interface LiftMilestone {
  /** The next, heavier thing; the comparison switches to it at two of them. */
  thing: LiftThing
  targetKg: number
  remainingKg: number
  /** 0..1 from the point the current comparison kicked in to the target. */
  progress: number
  /** "2 hippos" */
  label: string
}

/** How far the volume is from the comparison moving up to the next thing (null past the Titanic). */
export function nextMilestone(kg: number): LiftMilestone | null {
  if (!(kg > 0)) return null
  const current = liftedComparison(kg)?.thing ?? LIFT_THINGS[0]
  const index = LIFT_THINGS.indexOf(current)
  const thing = LIFT_THINGS[index + 1]
  if (!thing) return null
  const targetKg = thing.kg * 2
  const startKg = index === 0 ? 0 : current.kg * 2
  const progress = Math.min(1, Math.max(0, (kg - startKg) / (targetKg - startKg)))
  return { thing, targetKg, remainingKg: Math.max(0, targetKg - kg), progress, label: `2 ${thing.many}` }
}

/** "8,450 kg" below ten tonnes, "12.4 t" above. */
export function formatMass(kg: number): string {
  if (kg < 10000) return `${Math.round(kg).toLocaleString('en-GB')} kg`
  const tonnes = kg / 1000
  return `${(tonnes < 100 ? Math.round(tonnes * 10) / 10 : Math.round(tonnes)).toLocaleString('en-GB')} t`
}

/** Total volume (weight x reps) of the sets, optionally only those dated in `year`. */
export function totalVolume(sets: readonly { date: string; reps: number; weight_kg: number }[], year?: number): number {
  const prefix = year === undefined ? '' : `${year}-`
  return sets.reduce((sum, s) => (s.date.startsWith(prefix) ? sum + s.weight_kg * s.reps : sum), 0)
}

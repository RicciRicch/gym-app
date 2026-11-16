import { searchKey } from './muscles'

export const EQUIPMENT = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'] as const
export type Equipment = (typeof EQUIPMENT)[number]

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbells',
  cable: 'Cable',
  machine: 'Machine',
  bodyweight: 'Bodyweight',
}

// Checked in order: an explicit word wins, then the typical gear for the movement.
// Keys are matched against searchKey(name) (lower case, no accents, đ = dj).
const RULES: [Equipment, string[]][] = [
  ['dumbbell', ['dumbbell', 'bucic', 'kettlebell']],
  ['cable', ['cable', 'sajl', 'pulldown', 'pushdown', 'face pull', 'krosover', 'crossover']],
  ['machine', ['machine', 'masin', 'sprav', 'smith', 'leg press', 'leg curl', 'leg extension', 'hack squat', 'calf raise', 'pec deck', 'pendulum', 'belt squat']],
  ['barbell', ['barbell', 'sipk', 'ez bar']],
  ['dumbbell', ['goblet', 'hammer curl', 'lateral raise', 'front raise', 'rear delt', 'arnold', 'lunge', 'bulgarian', 'triceps extension', 'wrist curl', 'concentration']],
  ['bodyweight', ['pull-up', 'pull up', 'chin-up', 'chin up', 'push-up', 'push up', 'dips', 'plank', 'crunch', 'leg raise', 'back extension', 'ab wheel', 'russian twist', 'zgib', 'sklek', 'propadanj', 'trbusnjac']],
  ['barbell', ['squat', 'deadlift', 'bench press', 'row', 'overhead press', 'curl', 'skull crusher', 'hip thrust', 'shrug', 'good morning', 'cucanj', 'mrtvo dizanje', 'benc']],
]

/** The gear an exercise needs, guessed from its name; null when the name gives no clue. */
export function equipmentOf(name: string): Equipment | null {
  const key = searchKey(name)
  for (const [equipment, words] of RULES) if (words.some((w) => key.includes(w))) return equipment
  return null
}

/**
 * The exercises the user actually does, for the top of the library: the most recently
 * logged first, then the rest of their split in split order, without duplicates.
 */
export function yourExerciseIds(
  sets: readonly { exerciseId: string; date: string }[],
  splitIds: readonly string[],
  limit = 4,
): string[] {
  const last = new Map<string, string>()
  for (const s of sets) if ((last.get(s.exerciseId) ?? '') < s.date) last.set(s.exerciseId, s.date)
  const recent = [...last].sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0)).map(([id]) => id)
  return [...new Set([...recent, ...splitIds])].slice(0, limit)
}

// Pure workout-logging logic: building the in-progress draft, validating sets,
// and turning a finished draft into rows.

export interface DraftSet {
  /** Raw input text so partial values like "62." survive typing. */
  weight: string
  reps: string
  done: boolean
}

export interface DraftExercise {
  exerciseId: string
  name: string
  sets: DraftSet[]
}

export interface WorkoutDraft {
  version: 1
  splitDayId: string | null
  dayName: string
  /** Local YYYY-MM-DD the workout counts for. */
  date: string
  startedAt: string
  exercises: DraftExercise[]
  /** Default rest between sets, seconds. */
  restSeconds: number
  /** Epoch ms when the running rest timer ends; null = no timer. */
  restEndsAt: number | null
}

export interface LastSet {
  reps: number
  weight_kg: number
}

export const DEFAULT_REST_SECONDS = 90
export const REST_OPTIONS = [45, 60, 90, 120, 180] as const

const formatWeight = (kg: number) => String(Number(kg.toFixed(2)))

/**
 * Sets for an exercise at the start of a workout, prefilled from the last
 * session. Extra target sets repeat the last logged set; with no history the
 * reps come from the target and the weight is left empty.
 */
export function prefillSets(targetSets: number, targetReps: number, last: readonly LastSet[]): DraftSet[] {
  return Array.from({ length: Math.max(1, targetSets) }, (_, i) => {
    const source = last[i] ?? last.at(-1)
    return source
      ? { weight: formatWeight(source.weight_kg), reps: String(source.reps), done: false }
      : { weight: '', reps: String(targetReps), done: false }
  })
}

/** Parses a weight input ("62,5", "62.5", "" = bodyweight). null = not a valid weight. */
export function parseWeight(input: string): number | null {
  const text = input.trim().replace(',', '.')
  if (text === '') return 0
  if (!/^\d+(\.\d*)?$/.test(text)) return null
  const value = Number(text)
  return value <= 9999 ? Math.round(value * 100) / 100 : null
}

/** Parses a reps input. null = not a whole number between 1 and 1000. */
export function parseReps(input: string): number | null {
  const text = input.trim()
  if (!/^\d+$/.test(text)) return null
  const value = Number(text)
  return value >= 1 && value <= 1000 ? value : null
}

export const isLoggable = (set: DraftSet) => parseReps(set.reps) !== null && parseWeight(set.weight) !== null

export interface SetRow {
  exercise_id: string
  exercise_position: number
  set_number: number
  reps: number
  weight_kg: number
}

/** Completed sets as rows. Set numbers count completed sets only; exercises with none are skipped. */
export function toSetRows(draft: WorkoutDraft): SetRow[] {
  const rows: SetRow[] = []
  let position = 0
  for (const exercise of draft.exercises) {
    const done = exercise.sets.filter((s) => s.done && isLoggable(s))
    if (done.length === 0) continue
    done.forEach((set, i) =>
      rows.push({
        exercise_id: exercise.exerciseId,
        exercise_position: position,
        set_number: i + 1,
        reps: parseReps(set.reps)!,
        weight_kg: parseWeight(set.weight)!,
      }),
    )
    position++
  }
  return rows
}

/** True when the workout's exercise list (order included) differs from the day's default. */
export function exercisesDiffer(draft: WorkoutDraft, defaultExerciseIds: readonly string[]): boolean {
  const ids = draft.exercises.map((e) => e.exerciseId)
  return ids.length !== defaultExerciseIds.length || ids.some((id, i) => id !== defaultExerciseIds[i])
}

/** m:ss, or h:mm:ss from one hour up. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** Validates data read back from localStorage. */
export function isWorkoutDraft(value: unknown): value is WorkoutDraft {
  if (typeof value !== 'object' || value === null) return false
  const d = value as Partial<WorkoutDraft>
  return (
    d.version === 1 &&
    typeof d.dayName === 'string' &&
    typeof d.date === 'string' &&
    typeof d.startedAt === 'string' &&
    typeof d.restSeconds === 'number' &&
    Array.isArray(d.exercises) &&
    d.exercises.every(
      (e) =>
        typeof e?.exerciseId === 'string' &&
        typeof e.name === 'string' &&
        Array.isArray(e.sets) &&
        e.sets.every((s) => typeof s?.weight === 'string' && typeof s.reps === 'string' && typeof s.done === 'boolean'),
    )
  )
}

// Pure progress logic: top set per workout, progress series and personal records.

export interface LoggedSet {
  workoutId: string
  /** Local YYYY-MM-DD of the workout. */
  date: string
  /** ISO timestamp, orders workouts on the same date. */
  startedAt: string
  exerciseId: string
  reps: number
  weight_kg: number
}

export interface TopSet {
  weight: number
  reps: number
}

export interface ProgressPoint extends TopSet {
  workoutId: string
  date: string
  /** True when this workout beat every earlier workout. The first session is the baseline, not a PR. */
  isPR: boolean
}

export interface ExerciseProgress {
  /** 'reps' when the exercise was only ever done at bodyweight. */
  metric: 'weight' | 'reps'
  points: ProgressPoint[]
  best: TopSet | null
}

/** Heaviest set; on equal weight the one with more reps. */
export function topSet(sets: readonly Pick<LoggedSet, 'reps' | 'weight_kg'>[]): TopSet | null {
  let best: TopSet | null = null
  for (const s of sets) {
    const weight = Number(s.weight_kg)
    if (!best || weight > best.weight || (weight === best.weight && s.reps > best.reps)) {
      best = { weight, reps: s.reps }
    }
  }
  return best
}

const beats = (candidate: TopSet, best: TopSet, metric: ExerciseProgress['metric']) =>
  metric === 'weight' ? candidate.weight > best.weight : candidate.reps > best.reps

const byTime = (a: { date: string; startedAt: string }, b: { date: string; startedAt: string }) =>
  a.date.localeCompare(b.date) || a.startedAt.localeCompare(b.startedAt)

/** One point per workout (oldest first) for a single exercise's sets. */
export function exerciseProgress(sets: readonly LoggedSet[]): ExerciseProgress {
  const byWorkout = new Map<string, LoggedSet[]>()
  for (const s of sets) {
    const list = byWorkout.get(s.workoutId)
    if (list) list.push(s)
    else byWorkout.set(s.workoutId, [s])
  }

  const sessions = [...byWorkout.values()]
    .map((list) => ({ workoutId: list[0].workoutId, date: list[0].date, startedAt: list[0].startedAt, top: topSet(list)! }))
    .sort(byTime)

  const metric = sessions.some((s) => s.top.weight > 0) ? 'weight' : 'reps'
  let best: TopSet | null = null
  const points: ProgressPoint[] = sessions.map((s) => {
    const isPR = best !== null && beats(s.top, best, metric)
    if (best === null || beats(s.top, best, metric)) best = s.top
    return { workoutId: s.workoutId, date: s.date, ...s.top, isPR }
  })

  return { metric, points, best }
}

/** Progress for every exercise in a list of sets. */
export function progressByExercise(sets: readonly LoggedSet[]): Map<string, ExerciseProgress> {
  const grouped = new Map<string, LoggedSet[]>()
  for (const s of sets) {
    const list = grouped.get(s.exerciseId)
    if (list) list.push(s)
    else grouped.set(s.exerciseId, [s])
  }
  return new Map([...grouped].map(([id, list]) => [id, exerciseProgress(list)]))
}

/** For each workout, the exercises in which it set a PR. */
export function prsByWorkout(progress: ReadonlyMap<string, ExerciseProgress>): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>()
  for (const [exerciseId, { points }] of progress) {
    for (const p of points) {
      if (!p.isPR) continue
      const set = result.get(p.workoutId) ?? new Set<string>()
      set.add(exerciseId)
      result.set(p.workoutId, set)
    }
  }
  return result
}

/** "62.5 kg × 8", or "12 reps" at bodyweight. */
export function formatTopSet(top: TopSet): string {
  return top.weight > 0 ? `${Number(top.weight.toFixed(2))} kg × ${top.reps}` : `BW × ${top.reps}`
}

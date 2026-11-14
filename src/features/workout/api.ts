import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { toISODate } from '../../lib/schedule'
import { prefillSets, toSetRows, type DraftExercise, type LastSet, type WorkoutDraft } from '../../lib/workout'
import { useAuth } from '../auth/auth-context'
import type { SplitDay } from '../split/api'
import { loadRestSeconds, useWorkoutDraft } from './draft-store'

/** For each exercise, the sets of the most recent workout that included it. */
export async function fetchLastSets(exerciseIds: string[]): Promise<Map<string, LastSet[]>> {
  const result = new Map<string, LastSet[]>()
  if (exerciseIds.length === 0) return result
  const { data, error } = await supabase
    .from('workout_sets')
    .select('exercise_id, workout_id, set_number, reps, weight_kg, created_at')
    .in('exercise_id', exerciseIds)
    .order('created_at', { ascending: false })
    .limit(400)
  if (error) throw error

  const latestWorkout = new Map<string, string>()
  for (const row of data) {
    if (!latestWorkout.has(row.exercise_id)) latestWorkout.set(row.exercise_id, row.workout_id)
  }
  for (const [exerciseId, workoutId] of latestWorkout) {
    result.set(
      exerciseId,
      data
        .filter((r) => r.exercise_id === exerciseId && r.workout_id === workoutId)
        .sort((a, b) => a.set_number - b.set_number)
        .map((r) => ({ reps: r.reps, weight_kg: Number(r.weight_kg) })),
    )
  }
  return result
}

/** Starts a workout for a split day: default exercises, sets prefilled from the last session. */
export function useStartWorkout() {
  const { setDraft } = useWorkoutDraft()
  return useMutation({
    mutationFn: async (day: SplitDay) => {
      const last = await fetchLastSets(day.split_day_exercises.map((e) => e.exercise_id))
      const draft: WorkoutDraft = {
        version: 1,
        splitDayId: day.id,
        dayName: day.name,
        date: toISODate(new Date()),
        startedAt: new Date().toISOString(),
        exercises: day.split_day_exercises.map((e) => ({
          exerciseId: e.exercise_id,
          name: e.exercises.name,
          sets: prefillSets(e.target_sets, e.target_reps, last.get(e.exercise_id) ?? []),
        })),
        restSeconds: loadRestSeconds(),
        restEndsAt: null,
      }
      setDraft(draft)
    },
  })
}

/** A new exercise block for the running workout, prefilled from its last session. */
export async function buildDraftExercise(exercise: { id: string; name: string }): Promise<DraftExercise> {
  let last: LastSet[] = []
  try {
    last = (await fetchLastSets([exercise.id])).get(exercise.id) ?? []
  } catch {
    // offline: start the exercise empty rather than blocking the workout
  }
  return { exerciseId: exercise.id, name: exercise.name, sets: prefillSets(Math.max(3, last.length), 10, last) }
}

/** Saves the finished workout and its completed sets. */
export function useFinishWorkout() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (draft: WorkoutDraft) => {
      const rows = toSetRows(draft)
      if (rows.length === 0) throw new Error('Complete at least one set first')

      const workout = await supabase
        .from('workouts')
        .insert({
          split_day_id: draft.splitDayId,
          day_name: draft.dayName,
          date: draft.date,
          started_at: draft.startedAt,
          finished_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (workout.error) throw workout.error

      const sets = await supabase.from('workout_sets').insert(rows.map((r) => ({ ...r, workout_id: workout.data.id })))
      if (sets.error) {
        // Never keep a workout without its sets.
        await supabase.from('workouts').delete().eq('id', workout.data.id)
        throw sets.error
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workouts', user?.id] }),
  })
}

/** Makes the day's default exercise list match what was just done. */
export function useUpdateDayDefault() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ day, exercises }: { day: SplitDay; exercises: DraftExercise[] }) => {
      const keepIds = new Set(exercises.map((e) => e.exerciseId))
      const removed = day.split_day_exercises.filter((row) => !keepIds.has(row.exercise_id))
      if (removed.length > 0) {
        const { error } = await supabase
          .from('split_day_exercises')
          .delete()
          .in(
            'id',
            removed.map((r) => r.id),
          )
        if (error) throw error
      }

      for (const [position, exercise] of exercises.entries()) {
        const existing = day.split_day_exercises.find((row) => row.exercise_id === exercise.exerciseId)
        if (existing) {
          if (existing.position !== position) {
            const { error } = await supabase.from('split_day_exercises').update({ position }).eq('id', existing.id)
            if (error) throw error
          }
        } else {
          const { error } = await supabase.from('split_day_exercises').insert({
            split_day_id: day.id,
            exercise_id: exercise.exerciseId,
            position,
            target_sets: Math.min(20, Math.max(1, exercise.sets.length)),
            target_reps: Math.min(100, Math.max(1, Number(exercise.sets[0]?.reps) || 10)),
          })
          if (error) throw error
        }
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['split', user?.id] }),
  })
}

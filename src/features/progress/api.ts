import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { LoggedSet } from '../../lib/progress'
import { useAuth } from '../auth/auth-context'

// Query keys start with ['workouts', userId] so finishing a workout refreshes them.

/** Every logged set of the user, flattened with its workout's date. */
export function useLoggedSets() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['workouts', user?.id, 'sets'],
    enabled: !!user,
    queryFn: async (): Promise<LoggedSet[]> => {
      const { data, error } = await supabase
        .from('workout_sets')
        .select('workout_id, exercise_id, reps, weight_kg, workouts!inner(date, started_at)')
        .limit(10000)
      if (error) throw error
      const rows = data as unknown as {
        workout_id: string
        exercise_id: string
        reps: number
        weight_kg: number
        workouts: { date: string; started_at: string }
      }[]
      return rows.map((r) => ({
        workoutId: r.workout_id,
        exerciseId: r.exercise_id,
        reps: r.reps,
        weight_kg: Number(r.weight_kg),
        date: r.workouts.date,
        startedAt: r.workouts.started_at,
      }))
    },
  })
}

export interface HistoryWorkout {
  id: string
  day_name: string
  date: string
  started_at: string
  finished_at: string
  workout_sets: {
    exercise_id: string
    exercise_position: number
    set_number: number
    reps: number
    weight_kg: number
    exercises: { name: string }
  }[]
}

/** Finished workouts, newest first, with their sets. */
export function useWorkoutHistory() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['workouts', user?.id, 'history'],
    enabled: !!user,
    queryFn: async (): Promise<HistoryWorkout[]> => {
      const { data, error } = await supabase
        .from('workouts')
        .select(
          'id, day_name, date, started_at, finished_at, workout_sets(exercise_id, exercise_position, set_number, reps, weight_kg, exercises(name))',
        )
        .order('date', { ascending: false })
        .order('started_at', { ascending: false })
        .limit(200)
      if (error) throw error
      const workouts = data as unknown as HistoryWorkout[]
      workouts.forEach((w) =>
        w.workout_sets.sort((a, b) => a.exercise_position - b.exercise_position || a.set_number - b.set_number),
      )
      return workouts
    },
  })
}

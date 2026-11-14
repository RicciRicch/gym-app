import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/auth-context'

export class ExerciseExistsError extends Error {
  constructor() {
    super('You already have an exercise with that name')
  }
}

/** Adds a text-only custom exercise owned by the user. */
export function useCreateExercise() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, muscles, existingNames }: { name: string; muscles: string[]; existingNames: string[] }) => {
      if (existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) throw new ExerciseExistsError()
      const { data, error } = await supabase
        .from('exercises')
        .insert({ user_id: user!.id, name, muscles })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercises', user?.id] }),
  })
}

/** "chest, triceps , front delts" -> ["Chest", "Triceps", "Front delts"] */
export function parseMuscles(input: string): string[] {
  return [
    ...new Set(
      input
        .split(',')
        .map((m) => m.trim().replace(/\s+/g, ' '))
        .filter(Boolean)
        .map((m) => m[0].toUpperCase() + m.slice(1).toLowerCase())
        .map((m) => m.slice(0, 30)),
    ),
  ].slice(0, 6)
}

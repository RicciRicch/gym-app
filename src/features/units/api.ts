import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { isWeightUnit, type WeightUnit } from '../../lib/units'
import { useAuth } from '../auth/auth-context'

// Which exercises this user types in pounds (table exercise_units; no row = kg).
// A plain object, not a Map: the query cache is persisted as JSON.
type Units = Record<string, WeightUnit>

const unitsKey = (userId: string | undefined) => ['exercise-units', userId] as const

async function fetchUnits(): Promise<Units> {
  const { data, error } = await supabase.from('exercise_units').select('exercise_id, unit')
  if (error) throw error
  const units: Units = {}
  for (const row of data) if (isWeightUnit(row.unit)) units[row.exercise_id] = row.unit
  return units
}

/** For starting a workout: the saved units, or none when they cannot be loaded (offline, first run). */
export async function loadExerciseUnits(queryClient: QueryClient, userId: string | undefined): Promise<Units> {
  if (!userId) return {}
  try {
    return await queryClient.ensureQueryData({ queryKey: unitsKey(userId), queryFn: fetchUnits })
  } catch {
    return {}
  }
}

/** `unitOf(exerciseId)`: kg unless that exercise is set to lb. */
export function useExerciseUnits() {
  const { user } = useAuth()
  const { data } = useQuery({ queryKey: unitsKey(user?.id), queryFn: fetchUnits, enabled: !!user })
  return useCallback((exerciseId: string): WeightUnit => data?.[exerciseId] ?? 'kg', [data])
}

/** Remembers the unit for an exercise (kg removes the row). */
export function useSetExerciseUnit() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    networkMode: 'always',
    mutationFn: async ({ exerciseId, unit }: { exerciseId: string; unit: WeightUnit }) => {
      const { error } =
        unit === 'kg'
          ? await supabase.from('exercise_units').delete().eq('user_id', user!.id).eq('exercise_id', exerciseId)
          : await supabase
              .from('exercise_units')
              .upsert({ user_id: user!.id, exercise_id: exerciseId, unit, updated_at: new Date().toISOString() })
      if (error) throw error
    },
    onMutate: ({ exerciseId, unit }) => {
      const key = unitsKey(user?.id)
      const before = queryClient.getQueryData<Units>(key)
      const next = { ...before }
      if (unit === 'kg') delete next[exerciseId]
      else next[exerciseId] = unit
      queryClient.setQueryData(key, next)
      return { before }
    },
    onError: (_error, _vars, context) => queryClient.setQueryData(unitsKey(user?.id), context?.before),
  })
}

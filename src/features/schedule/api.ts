import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { buildSwap, type ISODate, type Override, type PlanDay } from '../../lib/schedule'
import { useAuth } from '../auth/auth-context'

/** Per-date overrides of the weekly plan within [from, to]. */
export function useOverrides(from: ISODate, to: ISODate) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['overrides', user?.id, from, to],
    enabled: !!user,
    queryFn: async (): Promise<Override[]> => {
      const { data, error } = await supabase
        .from('schedule_overrides')
        .select('date, split_day_id')
        .gte('date', from)
        .lte('date', to)
      if (error) throw error
      return data
    },
  })
}

export interface CompletedWorkout {
  id: string
  date: ISODate
  day_name: string
  split_day_id: string | null
}

/** Finished workouts within [from, to]. */
export function useCompletedWorkouts(from: ISODate, to: ISODate) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['workouts', user?.id, 'range', from, to],
    enabled: !!user,
    queryFn: async (): Promise<CompletedWorkout[]> => {
      const { data, error } = await supabase
        .from('workouts')
        .select('id, date, day_name, split_day_id')
        .gte('date', from)
        .lte('date', to)
        .order('date')
      if (error) throw error
      return data
    },
  })
}

/** Swaps what is planned on two dates of the same week (stored as two overrides). */
export function useSwapDays() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { a: ISODate; b: ISODate; days: readonly PlanDay[]; overrides: readonly Override[] }) => {
      const rows = buildSwap(input.a, input.b, input.days, input.overrides)
      const { error } = await supabase
        .from('schedule_overrides')
        .upsert(rows, { onConflict: 'user_id,date' })
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['overrides', user?.id] }),
  })
}

/** Removes every override within [from, to], restoring the weekly plan. */
export function useResetOverrides() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ from, to }: { from: ISODate; to: ISODate }) => {
      const { error } = await supabase.from('schedule_overrides').delete().gte('date', from).lte('date', to)
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['overrides', user?.id] }),
  })
}

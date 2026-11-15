import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { toISODate, type ISODate } from '../../lib/schedule'
import { trainingDaysPerWeek, weeklyStreak, type Streak } from '../../lib/streak'
import { useAuth } from '../auth/auth-context'
import { useActiveSplit } from '../split/api'

/** The date of every finished workout. Key starts with ['workouts', userId] so finishing or deleting one refreshes it. */
export function useWorkoutDates() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['workouts', user?.id, 'dates'],
    enabled: !!user,
    queryFn: async (): Promise<ISODate[]> => {
      const { data, error } = await supabase.from('workouts').select('date').order('date', { ascending: false }).limit(3000)
      if (error) throw error
      return data.map((row) => row.date)
    },
  })
}

const freezesKey = (userId: string | undefined) => ['streak-freezes', userId] as const

/** Mondays of the weeks the user froze. */
export function useStreakFreezes() {
  const { user } = useAuth()
  return useQuery({
    queryKey: freezesKey(user?.id),
    enabled: !!user,
    queryFn: async (): Promise<ISODate[]> => {
      const { data, error } = await supabase.from('streak_freezes').select('week_start').order('week_start', { ascending: false })
      if (error) throw error
      return data.map((row) => row.week_start)
    },
  })
}

/** Freezes (or, with `undo`, unfreezes) the week starting on `weekStart`. */
export function useFreezeWeek() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ weekStart, undo = false }: { weekStart: ISODate; undo?: boolean }) => {
      const table = supabase.from('streak_freezes')
      const { error } = undo ? await table.delete().eq('week_start', weekStart) : await table.insert({ week_start: weekStart })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: freezesKey(user?.id) }),
  })
}

/** The weekly streak against the active split's training days. null while loading. */
export function useStreak(): Streak | null {
  const dates = useWorkoutDates()
  const freezes = useStreakFreezes()
  const split = useActiveSplit()
  const today = toISODate(new Date())
  return useMemo(
    () =>
      dates.data && !split.isPending
        ? weeklyStreak(dates.data, trainingDaysPerWeek(split.data?.split_days ?? []), today, freezes.data ?? [])
        : null,
    [dates.data, freezes.data, split.isPending, split.data, today],
  )
}

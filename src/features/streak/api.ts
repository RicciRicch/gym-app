import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
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

/** The weekly streak against the active split's training days. null while loading. */
export function useStreak(): Streak | null {
  const dates = useWorkoutDates()
  const split = useActiveSplit()
  const today = toISODate(new Date())
  return useMemo(
    () => (dates.data && !split.isPending ? weeklyStreak(dates.data, trainingDaysPerWeek(split.data?.split_days ?? []), today) : null),
    [dates.data, split.isPending, split.data, today],
  )
}

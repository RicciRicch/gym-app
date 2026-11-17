import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { maxProgress, maxSummary } from '../../lib/one-rep-max'
import { LIFTS, liftOf, strengthLevel, type Lift, type Sex, type StrengthLevel } from '../../lib/strength'
import { supabase } from '../../lib/supabase'
import { toISODate } from '../../lib/schedule'
import { useAuth } from '../auth/auth-context'
import { useProfile } from '../auth/useProfile'
import { useLoggedSets } from '../progress/api'
import { useExercises } from '../split/api'

export interface BodyStats {
  bodyweight: number
  sex: Sex
}

/** Body weight and standards table from the profile; null until both are set. */
export function useBodyStats(): BodyStats | null {
  const { data: profile } = useProfile()
  if (!profile?.bodyweight_kg || !profile.strength_sex) return null
  return { bodyweight: Number(profile.bodyweight_kg), sex: profile.strength_sex }
}

export function useUpdateBodyStats() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    networkMode: 'always',
    mutationFn: async ({ bodyweight, sex }: BodyStats) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ bodyweight_kg: bodyweight, strength_sex: sex })
        .eq('id', user!.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (profile) => queryClient.setQueryData(['profile', user?.id], profile),
  })
}

export interface LiftStrength {
  exerciseId: string
  /** Best estimated one-rep max so far. */
  estimate: number
  /** Null until the body stats are set. */
  level: StrengthLevel | null
}

/** Every main lift the user has an estimate for. */
export function useLiftStrength(): Map<Lift, LiftStrength> {
  const exercises = useExercises().data
  const sets = useLoggedSets().data
  const stats = useBodyStats()
  const bodyweight = stats?.bodyweight
  const sex = stats?.sex
  return useMemo(() => {
    const out = new Map<Lift, LiftStrength>()
    for (const exercise of exercises ?? []) {
      const lift = exercise.user_id ? null : liftOf(exercise.name)
      if (!lift) continue
      const summary = maxSummary(maxProgress((sets ?? []).filter((s) => s.exerciseId === exercise.id)), toISODate(new Date()))
      if (!summary) continue
      const estimate = summary.best.estimate
      out.set(lift, {
        exerciseId: exercise.id,
        estimate,
        level: bodyweight && sex ? strengthLevel(lift, estimate, bodyweight, sex) : null,
      })
    }
    return new Map(LIFTS.filter((l) => out.has(l)).map((l) => [l, out.get(l)!]))
  }, [exercises, sets, bodyweight, sex])
}

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { cycleWeeklyTarget, projectCycle, type CycleAnchor, type CycleNext, type SplitMode } from '../../lib/cycle'
import { addDays, resolveDay, toISODate, type ISODate, type Override } from '../../lib/schedule'
import { trainingDaysPerWeek } from '../../lib/streak'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/auth-context'
import { useActiveSplit, type Split, type SplitDay } from '../split/api'
import { useOverrides } from './api'

export interface Plan {
  mode: SplitMode
  days: SplitDay[]
  /** What is planned on a date (null = rest). Rotating: nothing before today, the cycle only looks ahead. */
  planned: (date: ISODate) => SplitDay | null
  /** Weekly mode: the overrides loaded for the range. */
  overrides: Override[]
  /** Rotating mode: the day that is up next. */
  next: CycleNext<SplitDay> | null
}

/** Workouts a week the streak asks for: weekdays in weekly mode, the cycle's pace when rotating. */
export function weeklyTarget(split: Pick<Split, 'mode' | 'split_days'> | null | undefined): number {
  const days = split?.split_days ?? []
  return split?.mode === 'rotating' ? cycleWeeklyTarget(days) : trainingDaysPerWeek(days)
}

/** The last workout done on one of the split's days. Keyed under ['workouts', userId] so finishing one refreshes it. */
function useCycleAnchor(split: Split | null | undefined) {
  const { user } = useAuth()
  const ids = split?.split_days.map((d) => d.id) ?? []
  return useQuery({
    queryKey: ['workouts', user?.id, 'cycle-anchor', ids.join(',')],
    enabled: !!user && split?.mode === 'rotating' && ids.length > 0,
    queryFn: async (): Promise<CycleAnchor | null> => {
      const { data, error } = await supabase
        .from('workouts')
        .select('date, split_day_id')
        .in('split_day_id', ids)
        .order('date', { ascending: false })
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data?.split_day_id ? { date: data.date, dayId: data.split_day_id } : null
    },
  })
}

/** The active split's plan for [from, to], in either mode. `plan` is null while loading. */
export function usePlan(from: ISODate, to: ISODate): { isPending: boolean; split: Split | null; plan: Plan | null } {
  const split = useActiveSplit()
  const rotating = split.data?.mode === 'rotating'
  const overrides = useOverrides(from, to, !split.isPending && !rotating)
  const anchor = useCycleAnchor(split.data)
  const today = toISODate(new Date())

  const anchorPending = rotating && (split.data?.split_days.length ?? 0) > 0 && anchor.isPending
  const isPending = split.isPending || (!rotating && overrides.isPending) || anchorPending

  const plan = useMemo((): Plan | null => {
    if (isPending || !split.data) return null
    const days = split.data.split_days
    if (split.data.mode !== 'rotating') {
      const list = overrides.data ?? []
      return { mode: 'weekly', days, overrides: list, next: null, planned: (date) => resolveDay(date, days, list) }
    }
    const end = to > addDays(today, 14) ? to : addDays(today, 14)
    const { next, plan: ahead } = projectCycle(days, anchor.data ?? null, today, end)
    return { mode: 'rotating', days, overrides: [], next, planned: (date) => ahead.get(date) ?? null }
  }, [isPending, split.data, overrides.data, anchor.data, today, to])

  return { isPending, split: split.data ?? null, plan }
}

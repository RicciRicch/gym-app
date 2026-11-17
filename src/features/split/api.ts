import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Tables } from '../../lib/database.types'
import { cycleFromWeek, type SplitMode } from '../../lib/cycle'
import { assignWeekday } from '../../lib/schedule'
import { useAuth } from '../auth/auth-context'
import type { SplitPreset } from './presets'

export type Exercise = Tables<'exercises'>
export type DayExercise = Tables<'split_day_exercises'> & { exercises: Exercise }
export type SplitDay = Tables<'split_days'> & { split_day_exercises: DayExercise[] }
export type Split = Tables<'splits'> & { split_days: SplitDay[] }

const byPosition = <T extends { position: number; created_at: string }>(a: T, b: T) =>
  a.position - b.position || a.created_at.localeCompare(b.created_at)

const splitKey = (userId: string | undefined) => ['split', userId] as const

// ------------------------------------------------------------------ queries

export function useExercises() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['exercises', user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('exercises').select('*').order('name')
      if (error) throw error
      return data
    },
  })
}

/** The user's active split with days and their default exercises, all sorted. null = none yet. */
export function useActiveSplit() {
  const { user } = useAuth()
  return useQuery({
    queryKey: splitKey(user?.id),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('splits')
        .select('*, split_days(*, split_day_exercises(*, exercises(*)))')
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error
      const split = data as unknown as Split | null
      if (!split) return null
      split.split_days.sort(byPosition)
      split.split_days.forEach((d) => d.split_day_exercises.sort(byPosition))
      return split
    },
  })
}

// ---------------------------------------------------------------- mutations

function useSplitCache() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = splitKey(user?.id)
  return {
    queryClient,
    key,
    /** Optimistically patch the cached split; returns the previous value for rollback. */
    patch: (fn: (split: Split) => Split) => patchSplit(queryClient, key, fn),
    refresh: () => queryClient.invalidateQueries({ queryKey: key }),
  }
}

function patchSplit(queryClient: QueryClient, key: readonly unknown[], fn: (split: Split) => Split) {
  const previous = queryClient.getQueryData<Split | null>(key)
  if (previous) queryClient.setQueryData(key, fn(previous))
  return previous
}

const patchDay = (split: Split, dayId: string, fn: (day: SplitDay) => SplitDay): Split => ({
  ...split,
  split_days: split.split_days.map((d) => (d.id === dayId ? fn(d) : d)),
})

/** Creates a split (from a preset or empty) and makes it the active one. */
export function useCreateSplit() {
  const cache = useSplitCache()
  return useMutation({
    mutationFn: async (input: { preset: SplitPreset } | { name: string }) => {
      const preset = 'preset' in input ? input.preset : null
      const name = 'preset' in input ? input.preset.name : input.name

      // Only one split can be active; older ones stay for workout history.
      const off = await supabase.from('splits').update({ is_active: false }).eq('is_active', true)
      if (off.error) throw off.error

      const created = await supabase
        .from('splits')
        .insert({ name, preset_key: preset?.key ?? null, mode: preset?.mode ?? 'weekly' })
        .select()
        .single()
      if (created.error) throw created.error
      const splitId = created.data.id

      try {
        const dayRows = preset
          ? preset.days.map((d, i) => ({
              split_id: splitId,
              name: d.name,
              weekday: d.weekday,
              position: i,
              rest_after: d.restAfter ?? 0,
            }))
          : [{ split_id: splitId, name: 'Day 1', weekday: 0, position: 0 }]
        const days = await supabase.from('split_days').insert(dayRows).select()
        if (days.error) throw days.error

        if (preset) {
          const slugs = [...new Set(preset.days.flatMap((d) => d.exercises.map((e) => e.slug)))]
          const core = await supabase.from('exercises').select('id, slug').is('user_id', null).in('slug', slugs)
          if (core.error) throw core.error
          const idBySlug = new Map(core.data.map((e) => [e.slug, e.id]))

          const exerciseRows = preset.days.flatMap((d, dayIndex) => {
            const day = days.data.find((row) => row.position === dayIndex)!
            return d.exercises.flatMap((e, i) => {
              const exerciseId = idBySlug.get(e.slug)
              return exerciseId
                ? [{ split_day_id: day.id, exercise_id: exerciseId, position: i, target_sets: e.sets, target_reps: e.reps }]
                : []
            })
          })
          const inserted = await supabase.from('split_day_exercises').insert(exerciseRows)
          if (inserted.error) throw inserted.error
        }
      } catch (err) {
        // Do not leave a half-built split behind.
        await supabase.from('splits').delete().eq('id', splitId)
        throw err
      }
    },
    onSettled: cache.refresh,
  })
}

export function useRenameSplit() {
  const cache = useSplitCache()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('splits').update({ name }).eq('id', id)
      if (error) throw error
    },
    onMutate: ({ name }) => ({ previous: cache.patch((s) => ({ ...s, name })) }),
    onError: (_e, _v, ctx) => cache.queryClient.setQueryData(cache.key, ctx?.previous),
    onSettled: cache.refresh,
  })
}

/** Puts a day on a weekday (or null = off the week). A day already there trades places. */
export function useAssignWeekday() {
  const cache = useSplitCache()
  return useMutation({
    mutationFn: async ({ split, dayId, weekday }: { split: Split; dayId: string; weekday: number | null }) => {
      const next = assignWeekday(split.split_days, dayId, weekday)
      const changed = next.filter((d) => split.split_days.find((o) => o.id === d.id)?.weekday !== d.weekday)
      if (changed.length === 0) return
      // One statement, so the deferred unique (split_id, weekday) constraint allows the trade.
      const { error } = await supabase.from('split_days').upsert(
        changed.map((d) => ({ id: d.id, split_id: d.split_id, name: d.name, position: d.position, weekday: d.weekday })),
        { onConflict: 'id' },
      )
      if (error) throw error
    },
    onMutate: ({ dayId, weekday }) => ({
      previous: cache.patch((s) => ({ ...s, split_days: assignWeekday(s.split_days, dayId, weekday) })),
    }),
    onError: (_e, _v, ctx) => cache.queryClient.setQueryData(cache.key, ctx?.previous),
    onSettled: cache.refresh,
  })
}

const dayRow = (d: SplitDay) => ({
  id: d.id,
  split_id: d.split_id,
  name: d.name,
  weekday: d.weekday,
  position: d.position,
  rest_after: d.rest_after,
})

/** Days renumbered 0..n-1 in the given order. */
const renumber = (days: SplitDay[]) => days.map((d, i) => ({ ...d, position: i }))

/**
 * Weekly or rotating. The first switch to rotating (no rest days set yet) turns
 * the weekly layout into a cycle with the same rhythm, so nothing jumps around.
 */
export function useSetSplitMode() {
  const cache = useSplitCache()
  const reshape = (split: Split, mode: SplitMode) =>
    mode === 'rotating' && split.split_days.every((d) => d.rest_after === 0)
      ? renumber(cycleFromWeek(split.split_days))
      : split.split_days
  return useMutation({
    mutationFn: async ({ split, mode }: { split: Split; mode: SplitMode }) => {
      const days = reshape(split, mode)
      if (days !== split.split_days && days.length > 0) {
        const { error } = await supabase.from('split_days').upsert(days.map(dayRow), { onConflict: 'id' })
        if (error) throw error
      }
      const { error } = await supabase.from('splits').update({ mode }).eq('id', split.id)
      if (error) throw error
    },
    onMutate: ({ split, mode }) => ({ previous: cache.patch((s) => ({ ...s, mode, split_days: reshape(split, mode) })) }),
    onError: (_e, _v, ctx) => cache.queryClient.setQueryData(cache.key, ctx?.previous),
    onSettled: cache.refresh,
  })
}

/** Moves a day one place earlier (-1) or later (+1) in the cycle. */
export function useMoveDay() {
  const cache = useSplitCache()
  const moved = (days: SplitDay[], dayId: string, direction: -1 | 1) => {
    const i = days.findIndex((d) => d.id === dayId)
    const j = i + direction
    if (i < 0 || j < 0 || j >= days.length) return null
    const next = [...days]
    ;[next[i], next[j]] = [next[j], next[i]]
    return renumber(next)
  }
  return useMutation({
    mutationFn: async ({ split, dayId, direction }: { split: Split; dayId: string; direction: -1 | 1 }) => {
      const days = moved(split.split_days, dayId, direction)
      if (!days) return
      const { error } = await supabase.from('split_days').upsert(days.map(dayRow), { onConflict: 'id' })
      if (error) throw error
    },
    onMutate: ({ split, dayId, direction }) => ({
      previous: cache.patch((s) => ({ ...s, split_days: moved(split.split_days, dayId, direction) ?? s.split_days })),
    }),
    onError: (_e, _v, ctx) => cache.queryClient.setQueryData(cache.key, ctx?.previous),
    onSettled: cache.refresh,
  })
}

/** Rest days after a day in the cycle (0..6). */
export function useSetRestAfter() {
  const cache = useSplitCache()
  return useMutation({
    mutationFn: async ({ dayId, restAfter }: { dayId: string; restAfter: number }) => {
      const { error } = await supabase.from('split_days').update({ rest_after: restAfter }).eq('id', dayId)
      if (error) throw error
    },
    onMutate: ({ dayId, restAfter }) => ({
      previous: cache.patch((s) => patchDay(s, dayId, (d) => ({ ...d, rest_after: restAfter }))),
    }),
    onError: (_e, _v, ctx) => cache.queryClient.setQueryData(cache.key, ctx?.previous),
    onSettled: cache.refresh,
  })
}

export function useAddDay() {
  const cache = useSplitCache()
  return useMutation({
    mutationFn: async ({ split, name }: { split: Split; name: string }) => {
      const position = Math.max(-1, ...split.split_days.map((d) => d.position)) + 1
      const taken = new Set(split.split_days.map((d) => d.weekday))
      const freeWeekday = [0, 1, 2, 3, 4, 5, 6].find((w) => !taken.has(w)) ?? null
      const { error } = await supabase
        .from('split_days')
        .insert({ split_id: split.id, name, position, weekday: freeWeekday })
      if (error) throw error
    },
    onSettled: cache.refresh,
  })
}

export function useRenameDay() {
  const cache = useSplitCache()
  return useMutation({
    mutationFn: async ({ dayId, name }: { dayId: string; name: string }) => {
      const { error } = await supabase.from('split_days').update({ name }).eq('id', dayId)
      if (error) throw error
    },
    onMutate: ({ dayId, name }) => ({ previous: cache.patch((s) => patchDay(s, dayId, (d) => ({ ...d, name }))) }),
    onError: (_e, _v, ctx) => cache.queryClient.setQueryData(cache.key, ctx?.previous),
    onSettled: cache.refresh,
  })
}

export function useDeleteDay() {
  const cache = useSplitCache()
  return useMutation({
    mutationFn: async ({ dayId }: { dayId: string }) => {
      const { error } = await supabase.from('split_days').delete().eq('id', dayId)
      if (error) throw error
    },
    onMutate: ({ dayId }) => ({
      previous: cache.patch((s) => ({ ...s, split_days: s.split_days.filter((d) => d.id !== dayId) })),
    }),
    onError: (_e, _v, ctx) => cache.queryClient.setQueryData(cache.key, ctx?.previous),
    onSettled: cache.refresh,
  })
}

export function useAddDayExercise() {
  const cache = useSplitCache()
  return useMutation({
    mutationFn: async ({ day, exerciseId }: { day: SplitDay; exerciseId: string }) => {
      const position = Math.max(-1, ...day.split_day_exercises.map((e) => e.position)) + 1
      const { error } = await supabase
        .from('split_day_exercises')
        .insert({ split_day_id: day.id, exercise_id: exerciseId, position })
      if (error) throw error
    },
    onSettled: cache.refresh,
  })
}

export function useUpdateDayExercise() {
  const cache = useSplitCache()
  return useMutation({
    mutationFn: async (input: { dayId: string; id: string; target_sets?: number; target_reps?: number }) => {
      const { id, target_sets, target_reps } = input
      const { error } = await supabase.from('split_day_exercises').update({ target_sets, target_reps }).eq('id', id)
      if (error) throw error
    },
    onMutate: ({ dayId, id, target_sets, target_reps }) => ({
      previous: cache.patch((s) =>
        patchDay(s, dayId, (d) => ({
          ...d,
          split_day_exercises: d.split_day_exercises.map((e) =>
            e.id === id
              ? { ...e, target_sets: target_sets ?? e.target_sets, target_reps: target_reps ?? e.target_reps }
              : e,
          ),
        })),
      ),
    }),
    onError: (_e, _v, ctx) => cache.queryClient.setQueryData(cache.key, ctx?.previous),
    onSettled: cache.refresh,
  })
}

export function useRemoveDayExercise() {
  const cache = useSplitCache()
  return useMutation({
    mutationFn: async ({ id }: { dayId: string; id: string }) => {
      const { error } = await supabase.from('split_day_exercises').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: ({ dayId, id }) => ({
      previous: cache.patch((s) =>
        patchDay(s, dayId, (d) => ({ ...d, split_day_exercises: d.split_day_exercises.filter((e) => e.id !== id) })),
      ),
    }),
    onError: (_e, _v, ctx) => cache.queryClient.setQueryData(cache.key, ctx?.previous),
    onSettled: cache.refresh,
  })
}

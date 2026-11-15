import { useMemo } from 'react'
import { exerciseGroup, matchesSearch, MUSCLE_GROUPS, type MuscleGroup } from '../../lib/muscles'

interface Filterable {
  name: string
  muscles: string[]
}

/** Exercises matching the search and the group, plus how many match per group (for the chips). */
export function useExerciseFilter<E extends Filterable>(exercises: readonly E[], query: string, group: MuscleGroup | null) {
  return useMemo(() => {
    const searched = exercises.filter((e) => matchesSearch(query, e))
    const counts = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0])) as Record<MuscleGroup, number>
    for (const e of searched) {
      const g = exerciseGroup(e.muscles)
      if (g) counts[g]++
    }
    const shown = group ? searched.filter((e) => exerciseGroup(e.muscles) === group) : searched
    return { shown, counts, total: searched.length }
  }, [exercises, query, group])
}

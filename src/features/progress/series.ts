// Series for ProgressChart, kept apart from the component for fast refresh.

import { formatTopSet, type ExerciseProgress } from '../../lib/progress'

/** One workout on the chart. */
export interface ChartPoint {
  workoutId: string
  date: string
  value: number
  isPR: boolean
  /** Tooltip's main line, e.g. "80 kg × 8". */
  title: string
  /** Optional second line, e.g. "from 100 kg × 4". */
  detail?: string
}

export interface ChartSeries {
  /** Shown above the plot, e.g. "Top set weight (kg) per workout". */
  caption: string
  /** For the screen reader label: "top set weight". */
  name: string
  /** Y tick step: 5 for kg, 2 for reps. */
  step: number
  points: ChartPoint[]
}

/** The classic series: the heaviest set of each workout (or reps at bodyweight). */
export function topSetSeries(progress: ExerciseProgress): ChartSeries {
  const weight = progress.metric === 'weight'
  return {
    caption: `Top set ${weight ? 'weight (kg)' : 'reps (bodyweight)'} per workout`,
    name: `top set ${progress.metric}`,
    step: weight ? 5 : 2,
    points: progress.points.map((p) => ({
      workoutId: p.workoutId,
      date: p.date,
      value: weight ? p.weight : p.reps,
      isPR: p.isPR,
      title: formatTopSet(p),
    })),
  }
}

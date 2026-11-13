// Split presets. Exercises reference the core library by slug; weekday 0 = Monday.
// Weekdays without a day are rest days.

export interface PresetExercise {
  slug: string
  sets: number
  reps: number
}

export interface PresetDay {
  name: string
  weekday: number
  exercises: PresetExercise[]
}

export interface SplitPreset {
  key: string
  name: string
  tagline: string
  days: PresetDay[]
}

const ex = (slug: string, sets: number, reps: number): PresetExercise => ({ slug, sets, reps })

export const SPLIT_PRESETS: SplitPreset[] = [
  {
    key: 'ppl',
    name: 'Push / Pull / Legs',
    tagline: '3 days · Mon, Wed, Fri',
    days: [
      {
        name: 'Push',
        weekday: 0,
        exercises: [ex('bench-press', 4, 8), ex('overhead-press', 3, 8), ex('lateral-raise', 3, 12), ex('triceps-pushdown', 3, 12)],
      },
      {
        name: 'Pull',
        weekday: 2,
        exercises: [ex('pull-up', 4, 8), ex('barbell-row', 4, 8), ex('lat-pulldown', 3, 10), ex('dumbbell-curl', 3, 12)],
      },
      {
        name: 'Legs',
        weekday: 4,
        exercises: [ex('squat', 4, 6), ex('romanian-deadlift', 3, 8), ex('leg-press', 3, 12)],
      },
    ],
  },
  {
    key: 'upper-lower',
    name: 'Upper / Lower',
    tagline: '4 days · Mon, Tue, Thu, Fri',
    days: [
      {
        name: 'Upper A',
        weekday: 0,
        exercises: [ex('bench-press', 4, 6), ex('barbell-row', 4, 8), ex('overhead-press', 3, 8), ex('lat-pulldown', 3, 10), ex('dumbbell-curl', 3, 12)],
      },
      {
        name: 'Lower A',
        weekday: 1,
        exercises: [ex('squat', 4, 6), ex('romanian-deadlift', 3, 8), ex('leg-press', 3, 12)],
      },
      {
        name: 'Upper B',
        weekday: 3,
        exercises: [ex('overhead-press', 4, 6), ex('pull-up', 4, 8), ex('bench-press', 3, 10), ex('lateral-raise', 3, 12), ex('triceps-pushdown', 3, 12)],
      },
      {
        name: 'Lower B',
        weekday: 4,
        exercises: [ex('deadlift', 3, 5), ex('leg-press', 4, 10), ex('squat', 3, 10)],
      },
    ],
  },
  {
    key: 'full-body',
    name: 'Full Body',
    tagline: '3 days · Mon, Wed, Fri',
    days: [
      { name: 'Full Body A', weekday: 0, exercises: [ex('squat', 3, 6), ex('bench-press', 3, 8), ex('barbell-row', 3, 8)] },
      { name: 'Full Body B', weekday: 2, exercises: [ex('deadlift', 3, 5), ex('overhead-press', 3, 8), ex('lat-pulldown', 3, 10)] },
      {
        name: 'Full Body C',
        weekday: 4,
        exercises: [ex('leg-press', 3, 12), ex('pull-up', 3, 8), ex('bench-press', 3, 10), ex('dumbbell-curl', 2, 12)],
      },
    ],
  },
  {
    key: 'bro',
    name: 'Bro Split',
    tagline: '5 days · Mon–Fri, weekend off',
    days: [
      { name: 'Chest', weekday: 0, exercises: [ex('bench-press', 5, 8), ex('triceps-pushdown', 3, 12)] },
      {
        name: 'Back',
        weekday: 1,
        exercises: [ex('deadlift', 3, 5), ex('barbell-row', 4, 8), ex('pull-up', 3, 8), ex('lat-pulldown', 3, 10)],
      },
      { name: 'Shoulders', weekday: 2, exercises: [ex('overhead-press', 4, 8), ex('lateral-raise', 4, 12)] },
      { name: 'Arms', weekday: 3, exercises: [ex('dumbbell-curl', 4, 12), ex('triceps-pushdown', 4, 12)] },
      { name: 'Legs', weekday: 4, exercises: [ex('squat', 4, 8), ex('leg-press', 3, 12), ex('romanian-deadlift', 3, 10)] },
    ],
  },
]

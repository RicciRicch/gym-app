import { describe, expect, it } from 'vitest'
import { exerciseProgress, formatTopSet, progressByExercise, prsByWorkout, topSet, type LoggedSet } from './progress'

const set = (workoutId: string, date: string, weight_kg: number, reps: number, exerciseId = 'bench'): LoggedSet => ({
  workoutId,
  date,
  startedAt: `${date}T10:00:00.000Z`,
  exerciseId,
  reps,
  weight_kg,
})

describe('topSet', () => {
  it('picks the heaviest set, then the most reps', () => {
    expect(topSet([{ weight_kg: 60, reps: 8 }, { weight_kg: 62.5, reps: 5 }, { weight_kg: 62.5, reps: 6 }])).toEqual({
      weight: 62.5,
      reps: 6,
    })
    expect(topSet([])).toBeNull()
  })
})

describe('exerciseProgress', () => {
  it('orders sessions by date and marks heavier top sets as PRs', () => {
    const p = exerciseProgress([
      set('w3', '2026-11-09', 65, 5),
      set('w1', '2026-11-02', 60, 8),
      set('w1', '2026-11-02', 62.5, 6),
      set('w2', '2026-11-05', 62.5, 8),
    ])
    expect(p.metric).toBe('weight')
    expect(p.points.map((x) => [x.workoutId, x.weight, x.reps, x.isPR])).toEqual([
      ['w1', 62.5, 6, false], // baseline
      ['w2', 62.5, 8, false], // same weight is not a weight PR
      ['w3', 65, 5, true],
    ])
    expect(p.best).toEqual({ weight: 65, reps: 5 })
  })

  it('does not mark a drop or a return to the old best as a PR', () => {
    const p = exerciseProgress([set('a', '2026-11-01', 100, 3), set('b', '2026-11-03', 90, 5), set('c', '2026-11-05', 100, 3)])
    expect(p.points.map((x) => x.isPR)).toEqual([false, false, false])
  })

  it('orders two workouts on the same date by start time', () => {
    const p = exerciseProgress([
      { ...set('late', '2026-11-01', 70, 5), startedAt: '2026-11-01T18:00:00.000Z' },
      { ...set('early', '2026-11-01', 60, 5), startedAt: '2026-11-01T08:00:00.000Z' },
    ])
    expect(p.points.map((x) => [x.workoutId, x.isPR])).toEqual([
      ['early', false],
      ['late', true],
    ])
  })

  it('tracks reps for bodyweight-only exercises', () => {
    const p = exerciseProgress([set('a', '2026-11-01', 0, 8, 'pullup'), set('b', '2026-11-04', 0, 10, 'pullup')])
    expect(p.metric).toBe('reps')
    expect(p.points.map((x) => x.isPR)).toEqual([false, true])
  })
})

describe('prsByWorkout', () => {
  it('groups PR exercises per workout', () => {
    const progress = progressByExercise([
      set('w1', '2026-11-01', 60, 5, 'bench'),
      set('w1', '2026-11-01', 100, 5, 'squat'),
      set('w2', '2026-11-04', 65, 5, 'bench'),
      set('w2', '2026-11-04', 110, 5, 'squat'),
      set('w3', '2026-11-07', 60, 5, 'bench'),
    ])
    const prs = prsByWorkout(progress)
    expect([...(prs.get('w2') ?? [])].sort()).toEqual(['bench', 'squat'])
    expect(prs.has('w1')).toBe(false)
    expect(prs.has('w3')).toBe(false)
  })
})

describe('formatTopSet', () => {
  it('formats weighted and bodyweight sets', () => {
    expect(formatTopSet({ weight: 62.5, reps: 8 })).toBe('62.5 kg × 8')
    expect(formatTopSet({ weight: 0, reps: 12 })).toBe('BW × 12')
  })
})

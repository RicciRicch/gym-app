import { describe, expect, it } from 'vitest'
import { displayMax, estimateOneRepMax, maxProgress, maxSummary, percentTable, roundTo } from './one-rep-max'
import type { LoggedSet } from './progress'

const set = (workoutId: string, date: string, weight_kg: number, reps: number): LoggedSet => ({
  workoutId,
  date,
  startedAt: `${date}T10:00:00.000Z`,
  exerciseId: 'squat',
  reps,
  weight_kg,
})

describe('estimateOneRepMax', () => {
  it('uses Epley, and a single is the weight itself', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100)
    expect(estimateOneRepMax(100, 4)).toBeCloseTo(113.33, 2)
    expect(estimateOneRepMax(60, 10)).toBeCloseTo(80, 5)
  })
  it('refuses bodyweight, empty and high-rep sets', () => {
    expect(estimateOneRepMax(0, 5)).toBeNull()
    expect(estimateOneRepMax(100, 0)).toBeNull()
    expect(estimateOneRepMax(50, 11)).toBeNull()
  })
})

describe('maxProgress', () => {
  it('takes the best estimate per workout, oldest first, and marks higher ones as PRs', () => {
    const points = maxProgress([
      set('w2', '2026-11-05', 105, 3),
      set('w1', '2026-11-02', 100, 8),
      set('w1', '2026-11-02', 110, 1),
      set('w3', '2026-11-09', 100, 12),
      set('w4', '2026-11-12', 100, 6),
    ])
    expect(points.map((p) => p.workoutId)).toEqual(['w1', 'w2', 'w4'])
    // 100 × 8 = 126.7 beats the 110 single.
    expect(points[0]).toMatchObject({ weight: 100, reps: 8, isPR: false })
    expect(points[0].estimate).toBeCloseTo(126.67, 2)
    // 105 × 3 = 115.5: lower, no PR. 100 × 6 = 120: still lower.
    expect(points[1].isPR).toBe(false)
    expect(points[2].isPR).toBe(false)
  })
  it('flags a higher estimate even from a lighter set', () => {
    const points = maxProgress([set('w1', '2026-11-02', 105, 3), set('w2', '2026-11-05', 100, 8)])
    expect(points.map((p) => p.isPR)).toEqual([false, true])
  })
  it('is empty for bodyweight-only work', () => {
    expect(maxProgress([set('w1', '2026-11-02', 0, 12)])).toEqual([])
  })
})

describe('maxSummary', () => {
  it('reports the best and the growth over 30 days', () => {
    const points = maxProgress([set('w1', '2026-10-01', 100, 5), set('w2', '2026-11-10', 105, 5), set('w3', '2026-11-14', 100, 5)])
    const summary = maxSummary(points, '2026-11-16')!
    expect(summary.best.workoutId).toBe('w2')
    expect(displayMax(summary.best.estimate)).toBe(122.5)
    // 116.67 -> 116.5 a month ago, 122.5 now.
    expect(summary.change).toBe(6)
  })
  it('has no change without older sessions, and nothing without points', () => {
    expect(maxSummary(maxProgress([set('w1', '2026-11-10', 100, 5)]), '2026-11-16')!.change).toBeNull()
    expect(maxSummary([], '2026-11-16')).toBeNull()
  })
})

describe('percentTable', () => {
  it('rounds to loadable weights', () => {
    expect(roundTo(113.33, 0.5)).toBe(113.5)
    const table = percentTable(113.33)
    expect(table[0]).toEqual({ percent: 95, weight: 107.5 })
    expect(table.find((r) => r.percent === 80)).toEqual({ percent: 80, weight: 90 })
    expect(table.at(-1)).toEqual({ percent: 60, weight: 67.5 })
  })
  it('uses 1 kg steps for light lifts', () => {
    expect(percentTable(20).find((r) => r.percent === 85)!.weight).toBe(17)
  })
})

import { describe, expect, it } from 'vitest'
import { coachTip, formatPastSet, ghostScore, ghostVerdict, lastSessionSets } from './coach'
import type { LoggedSet } from './progress'

const logged = (workoutId: string, date: string, exerciseId: string, setNumber: number, weight_kg: number, reps: number): LoggedSet => ({
  workoutId,
  date,
  startedAt: `${date}T10:00:00Z`,
  exerciseId,
  setNumber,
  weight_kg,
  reps,
})

describe('lastSessionSets', () => {
  const history = [
    logged('w1', '2026-11-01', 'bench', 1, 70, 8),
    logged('w2', '2026-11-08', 'bench', 2, 80, 6),
    logged('w2', '2026-11-08', 'bench', 1, 80, 8),
    logged('w2', '2026-11-08', 'squat', 1, 100, 5),
    logged('w3', '2026-11-10', 'squat', 1, 105, 5),
  ]

  it('returns the latest workout that had the exercise, in set order', () => {
    expect(lastSessionSets(history, 'bench')).toEqual([
      { weight: 80, reps: 8 },
      { weight: 80, reps: 6 },
    ])
    expect(lastSessionSets(history, 'squat')).toEqual([{ weight: 105, reps: 5 }])
  })

  it('is empty for an exercise never done', () => {
    expect(lastSessionSets(history, 'curl')).toEqual([])
  })
})

describe('ghost', () => {
  it('heavier wins, then more reps', () => {
    expect(ghostVerdict({ weight: 82.5, reps: 5 }, { weight: 80, reps: 8 })).toBe('ahead')
    expect(ghostVerdict({ weight: 80, reps: 9 }, { weight: 80, reps: 8 })).toBe('ahead')
    expect(ghostVerdict({ weight: 80, reps: 8 }, { weight: 80, reps: 8 })).toBe('even')
    expect(ghostVerdict({ weight: 80, reps: 7 }, { weight: 80, reps: 8 })).toBe('behind')
    expect(ghostVerdict({ weight: 75, reps: 12 }, { weight: 80, reps: 8 })).toBe('behind')
  })

  it('scores only completed sets that have a ghost', () => {
    const ghost = [
      { weight: 80, reps: 8 },
      { weight: 80, reps: 8 },
      { weight: 80, reps: 6 },
    ]
    const done = [{ weight: 82.5, reps: 8 }, { weight: 80, reps: 7 }, null, { weight: 80, reps: 8 }]
    expect(ghostScore(done, ghost)).toEqual({ you: 1, ghost: 1 })
  })

  it('formats past sets', () => {
    expect(formatPastSet({ weight: 82.5, reps: 8 })).toBe('82.5 × 8')
    expect(formatPastSet({ weight: 0, reps: 12 })).toBe('BW × 12')
  })
})

describe('coachTip', () => {
  it('adds weight when every set held its reps', () => {
    const tip = coachTip([
      { weight: 80, reps: 8 },
      { weight: 80, reps: 8 },
      { weight: 80, reps: 8 },
    ])
    expect(tip.apply).toEqual({ weight: 82.5, reps: 8 })
    expect(tip.text).toContain('80 kg × 8 on every set')
    expect(tip.text).toContain('82.5 kg')
  })

  it('uses a 1 kg step for light weights', () => {
    expect(coachTip([{ weight: 12, reps: 10 }]).apply).toEqual({ weight: 13, reps: 10 })
  })

  it('holds the weight when reps dropped off', () => {
    const tip = coachTip([
      { weight: 80, reps: 8 },
      { weight: 80, reps: 7 },
      { weight: 80, reps: 5 },
    ])
    expect(tip.apply).toEqual({ weight: 80, reps: 8 })
    expect(tip.text).toContain('dropped to 5')
  })

  it('ignores lighter warm-up sets', () => {
    const tip = coachTip([
      { weight: 40, reps: 10 },
      { weight: 100, reps: 5 },
      { weight: 100, reps: 5 },
    ])
    expect(tip.apply).toEqual({ weight: 102.5, reps: 5 })
  })

  it('asks for one more rep at bodyweight', () => {
    expect(
      coachTip([
        { weight: 0, reps: 12 },
        { weight: 0, reps: 10 },
      ]).apply,
    ).toEqual({ weight: 0, reps: 13 })
  })

  it('has nothing to apply the first time', () => {
    expect(coachTip([]).apply).toBeNull()
  })
})

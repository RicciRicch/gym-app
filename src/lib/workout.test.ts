import { describe, expect, it } from 'vitest'
import {
  exercisesDiffer,
  formatClock,
  isWorkoutDraft,
  parseReps,
  parseWeight,
  prefillSets,
  toSetRows,
  type WorkoutDraft,
} from './workout'

const draft = (exercises: WorkoutDraft['exercises']): WorkoutDraft => ({
  version: 1,
  splitDayId: 'day',
  dayName: 'Push',
  date: '2026-11-13',
  startedAt: '2026-11-13T17:00:00.000Z',
  exercises,
  restSeconds: 90,
  restEndsAt: null,
})

describe('prefillSets', () => {
  it('uses the target when there is no history', () => {
    expect(prefillSets(3, 8, [])).toEqual([
      { weight: '', reps: '8', done: false },
      { weight: '', reps: '8', done: false },
      { weight: '', reps: '8', done: false },
    ])
  })

  it('copies the last session set by set and repeats the final set for extras', () => {
    const sets = prefillSets(3, 8, [
      { reps: 8, weight_kg: 60 },
      { reps: 6, weight_kg: 62.5 },
    ])
    expect(sets.map((s) => `${s.weight}x${s.reps}`)).toEqual(['60x8', '62.5x6', '62.5x6'])
    expect(sets.every((s) => !s.done)).toBe(true)
  })

  it('never returns zero sets', () => {
    expect(prefillSets(0, 10, [])).toHaveLength(1)
  })
})

describe('parsing', () => {
  it('parses weights with dot or comma and treats empty as bodyweight', () => {
    expect(parseWeight('62.5')).toBe(62.5)
    expect(parseWeight('62,5')).toBe(62.5)
    expect(parseWeight('100.')).toBe(100)
    expect(parseWeight('')).toBe(0)
    expect(parseWeight('abc')).toBeNull()
    expect(parseWeight('-5')).toBeNull()
  })

  it('accepts only whole reps from 1 to 1000', () => {
    expect(parseReps('8')).toBe(8)
    expect(parseReps('0')).toBeNull()
    expect(parseReps('')).toBeNull()
    expect(parseReps('8.5')).toBeNull()
    expect(parseReps('1001')).toBeNull()
  })
})

describe('toSetRows', () => {
  it('keeps only completed, valid sets and renumbers them', () => {
    const rows = toSetRows(
      draft([
        {
          exerciseId: 'bench',
          name: 'Bench',
          sets: [
            { weight: '60', reps: '8', done: true },
            { weight: '60', reps: '8', done: false },
            { weight: '62,5', reps: '6', done: true },
          ],
        },
        { exerciseId: 'skipped', name: 'Skipped', sets: [{ weight: '', reps: '10', done: false }] },
        { exerciseId: 'pullup', name: 'Pull-Up', sets: [{ weight: '', reps: '10', done: true }] },
      ]),
    )
    expect(rows).toEqual([
      { exercise_id: 'bench', exercise_position: 0, set_number: 1, reps: 8, weight_kg: 60 },
      { exercise_id: 'bench', exercise_position: 0, set_number: 2, reps: 6, weight_kg: 62.5 },
      { exercise_id: 'pullup', exercise_position: 1, set_number: 1, reps: 10, weight_kg: 0 },
    ])
  })

  it('returns nothing when no set was completed', () => {
    expect(toSetRows(draft([{ exerciseId: 'a', name: 'A', sets: [{ weight: '10', reps: '5', done: false }] }]))).toEqual([])
  })
})

describe('exercisesDiffer', () => {
  const d = draft([
    { exerciseId: 'a', name: 'A', sets: [] },
    { exerciseId: 'b', name: 'B', sets: [] },
  ])

  it('is false for the same list in the same order', () => {
    expect(exercisesDiffer(d, ['a', 'b'])).toBe(false)
  })

  it('detects added, removed and reordered exercises', () => {
    expect(exercisesDiffer(d, ['a'])).toBe(true)
    expect(exercisesDiffer(d, ['a', 'b', 'c'])).toBe(true)
    expect(exercisesDiffer(d, ['b', 'a'])).toBe(true)
  })
})

describe('formatClock', () => {
  it('formats seconds', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(89.9)).toBe('1:29')
    expect(formatClock(3725)).toBe('1:02:05')
    expect(formatClock(-4)).toBe('0:00')
  })
})

describe('isWorkoutDraft', () => {
  it('accepts a valid draft and rejects junk', () => {
    expect(isWorkoutDraft(draft([{ exerciseId: 'a', name: 'A', sets: [{ weight: '', reps: '5', done: false }] }]))).toBe(true)
    expect(isWorkoutDraft(null)).toBe(false)
    expect(isWorkoutDraft({ version: 2 })).toBe(false)
    expect(isWorkoutDraft({ ...draft([]), exercises: [{ exerciseId: 1 }] })).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { trainingDaysPerWeek, weeklyStreak } from './streak'

// 2026-11-09 is a Monday.
const week = (mondayOffsetWeeks: number, days: number[]) =>
  days.map((d) => {
    const date = new Date(2026, 10, 9 + mondayOffsetWeeks * 7 + d)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  })

describe('trainingDaysPerWeek', () => {
  it('counts distinct weekdays and never goes below 1', () => {
    expect(trainingDaysPerWeek([{ weekday: 0 }, { weekday: 2 }, { weekday: 2 }, { weekday: null }])).toBe(2)
    expect(trainingDaysPerWeek([])).toBe(1)
  })
})

describe('weeklyStreak', () => {
  const today = '2026-11-14' // Saturday

  it('is cold with no workouts', () => {
    expect(weeklyStreak([], 3, today)).toEqual({ weeks: 0, thisWeek: 0, target: 3, weekDone: false, level: 0 })
  })

  it('sparks when training this week without a streak yet', () => {
    expect(weeklyStreak(week(0, [5]), 3, today)).toMatchObject({ weeks: 0, thisWeek: 1, weekDone: false, level: 1 })
  })

  it('counts this week once the target is met', () => {
    expect(weeklyStreak(week(0, [0, 2, 4]), 3, today)).toMatchObject({ weeks: 1, weekDone: true, level: 2 })
  })

  it('keeps past weeks while the running week is still open', () => {
    const dates = [...week(-2, [0, 1, 2]), ...week(-1, [0, 2, 4]), ...week(0, [0])]
    expect(weeklyStreak(dates, 3, today)).toMatchObject({ weeks: 2, thisWeek: 1, weekDone: false, level: 2 })
  })

  it('breaks on a week that missed the target', () => {
    const dates = [...week(-3, [0, 1, 2]), ...week(-2, [0]), ...week(-1, [0, 2, 4]), ...week(0, [0, 1, 2])]
    expect(weeklyStreak(dates, 3, today).weeks).toBe(2)
  })

  it('counts two workouts on one day once', () => {
    const dates = [...week(0, [0]), ...week(0, [0]), ...week(0, [1])]
    expect(weeklyStreak(dates, 3, today)).toMatchObject({ thisWeek: 2, weekDone: false })
  })

  it('blazes from four weeks', () => {
    const dates = [-3, -2, -1, 0].flatMap((w) => week(w, [0, 1]))
    expect(weeklyStreak(dates, 2, today)).toMatchObject({ weeks: 4, level: 3 })
  })
})

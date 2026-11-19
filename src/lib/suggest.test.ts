import { describe, expect, it } from 'vitest'
import { REGIONS, type MuscleLoad } from './muscles'
import { chooseLayout, hasBackToBack, neglectedRegions, suggestSplit, weeklyVolume, type Goal } from './suggest'

const MON = 0
const TUE = 1
const WED = 2
const THU = 3
const FRI = 4
const SAT = 5
const SUN = 6

/** Every set of weekdays with 1 to 6 days. */
function allWeekdaySets(): number[][] {
  const sets: number[][] = []
  for (let mask = 1; mask < 127; mask++) sets.push([0, 1, 2, 3, 4, 5, 6].filter((d) => mask & (1 << d)))
  return sets
}

describe('layout', () => {
  it('knows when days touch, Sunday into Monday included', () => {
    expect(hasBackToBack([MON, WED, FRI])).toBe(false)
    expect(hasBackToBack([MON, TUE])).toBe(true)
    expect(hasBackToBack([MON, SUN])).toBe(true)
  })

  it('uses full body only on spread out days', () => {
    expect(chooseLayout([MON, WED, FRI]).layout).toBe('full-body')
    expect(chooseLayout([MON, TUE, WED]).dayNames).toEqual(['Push', 'Pull', 'Legs'])
    expect(chooseLayout([TUE, FRI]).layout).toBe('full-body')
    expect(chooseLayout([SAT, SUN]).dayNames).toEqual(['Upper', 'Lower'])
    expect(chooseLayout([MON, TUE, THU, FRI]).layout).toBe('upper-lower')
    expect(chooseLayout([MON, TUE, WED, THU, FRI]).layout).toBe('upper-lower-ppl')
    expect(chooseLayout([MON, TUE, WED, THU, FRI, SAT]).dayNames).toHaveLength(6)
  })
})

describe('suggestSplit', () => {
  it('never trains a muscle on two days in a row', () => {
    for (const weekdays of allWeekdaySets()) {
      const { days } = suggestSplit({ weekdays, goal: 'muscle', minutes: 90 })
      const byWeekday = new Map(days.map((d) => [d.weekday, new Set(d.exercises.map((e) => e.region).filter((r) => r !== 'core'))]))
      for (const [weekday, regions] of byWeekday) {
        const next = byWeekday.get((weekday + 1) % 7)
        if (!next || next === regions) continue
        const shared = [...regions].filter((r) => next.has(r))
        expect(shared, `${weekdays.join(',')}: day ${weekday} and the next share ${shared.join(', ')}`).toEqual([])
      }
    }
  })

  it('puts one workout on each chosen day, in order', () => {
    const { days } = suggestSplit({ weekdays: [FRI, MON, WED, MON], goal: 'fit', minutes: 60 })
    expect(days.map((d) => d.weekday)).toEqual([MON, WED, FRI])
  })

  it('fits the exercise count to the time and never repeats an exercise in a day', () => {
    for (const minutes of [45, 60, 90] as const) {
      const { days } = suggestSplit({ weekdays: [MON, TUE, THU, FRI], goal: 'muscle', minutes })
      for (const day of days) {
        expect(day.exercises).toHaveLength({ 45: 4, 60: 5, 90: 6 }[minutes])
        expect(new Set(day.exercises.map((e) => e.slug)).size).toBe(day.exercises.length)
      }
    }
  })

  it('doses by goal', () => {
    const first = (goal: Goal) => suggestSplit({ weekdays: [MON, WED, FRI], goal, minutes: 60 }).days[0].exercises[0]
    expect(first('strength')).toMatchObject({ slug: 'squat', sets: 5, reps: 5 })
    expect(first('muscle')).toMatchObject({ sets: 4, reps: 8 })
    expect(first('fit')).toMatchObject({ sets: 3, reps: 10 })
  })

  it('varies the B days', () => {
    const { days } = suggestSplit({ weekdays: [MON, TUE, THU, FRI], goal: 'muscle', minutes: 60 })
    expect(days[0].exercises[0].slug).not.toBe(days[2].exercises[0].slug)
  })

  it('moves skipped muscles forward and gives them a set more', () => {
    const plain = suggestSplit({ weekdays: [MON, TUE, THU, FRI], goal: 'muscle', minutes: 45 })
    const fixed = suggestSplit({ weekdays: [MON, TUE, THU, FRI], goal: 'muscle', minutes: 45, neglected: ['calves'] })
    const calves = (s: typeof plain) => s.days.flatMap((d) => d.exercises).filter((e) => e.region === 'calves')
    expect(calves(plain)).toEqual([])
    expect(calves(fixed).length).toBeGreaterThan(0)
    expect(calves(fixed)[0].sets).toBe(4)
    expect(fixed.reasons.at(-1)).toContain('calves')
  })

  it('explains the choice', () => {
    const s = suggestSplit({ weekdays: [MON, WED, FRI], goal: 'strength', minutes: 60 })
    expect(s.name).toBe('Full Body')
    expect(s.reasons[0]).toContain('spread out')
    expect(s.reasons[1]).toContain('Strength')
  })

  it('needs a day', () => {
    expect(() => suggestSplit({ weekdays: [], goal: 'fit', minutes: 60 })).toThrow()
  })
})

describe('weekly volume', () => {
  it('counts sets and days per group', () => {
    const volume = weeklyVolume([
      { name: 'A', weekday: 0, exercises: [{ slug: 'squat', sets: 4, reps: 8, region: 'quads' }, { slug: 'bench-press', sets: 3, reps: 8, region: 'chest' }] },
      { name: 'B', weekday: 2, exercises: [{ slug: 'leg-curl', sets: 3, reps: 12, region: 'hamstrings' }] },
    ])
    expect(volume).toEqual([
      { group: 'Chest', sets: 3, days: 1 },
      { group: 'Legs', sets: 7, days: 2 },
    ])
  })
})

describe('neglected regions', () => {
  const load = (overrides: Partial<MuscleLoad>) => ({ ...(Object.fromEntries(REGIONS.map((r) => [r, 10])) as MuscleLoad), ...overrides })

  it('lists regions with almost no sets, fewest first', () => {
    expect(neglectedRegions(load({ calves: 0, hamstrings: 1.5 }), 8)).toEqual(['calves', 'hamstrings'])
  })

  it('keeps it to three, big muscles first', () => {
    expect(neglectedRegions(load({ biceps: 0, core: 0, quads: 0, lats: 0, calves: 0 }), 8)).toEqual(['quads', 'lats', 'calves'])
  })

  it('says nothing without enough history', () => {
    expect(neglectedRegions(load({ calves: 0 }), 2)).toEqual([])
  })
})

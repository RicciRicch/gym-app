import { describe, expect, it } from 'vitest'
import { gorillaSays, liftedLessThanLastTime, missedDay, type GorillaInput } from './gorilla'
import type { PlanDay } from './schedule'

// 2026-11-09 is a Monday.
const days: PlanDay[] = [
  { id: 'push', name: 'Push', weekday: 0 },
  { id: 'legs', name: 'Legs', weekday: 2 },
  { id: 'pull', name: 'Pull', weekday: 4 },
]

const base: GorillaInput = {
  today: '2026-11-12',
  hasPlan: true,
  plannedToday: null,
  inProgress: false,
  doneToday: false,
  missed: null,
  recentPr: null,
  liftedLess: false,
  weekFrozen: false,
  streakWeeks: 0,
}

describe('missedDay', () => {
  const since = '2026-11-01'

  it('finds a skipped planned day', () => {
    // Thursday; Legs was planned on Wednesday and not done.
    expect(missedDay('2026-11-12', days, [], new Set(), since)).toEqual({ dayName: 'Legs', daysAgo: 1 })
  })

  it('looks past rest days', () => {
    // Sunday; Friday's Pull was skipped, Saturday was rest.
    expect(missedDay('2026-11-15', days, [], new Set(), since)).toEqual({ dayName: 'Pull', daysAgo: 2 })
  })

  it('is satisfied by the workout itself or by training since', () => {
    expect(missedDay('2026-11-12', days, [], new Set(['2026-11-11']), since)).toBeNull()
    expect(missedDay('2026-11-15', days, [], new Set(['2026-11-14']), since)).toBeNull()
  })

  it('respects overrides, the split start and frozen weeks', () => {
    expect(missedDay('2026-11-12', days, [{ date: '2026-11-11', split_day_id: null }], new Set(), since)).toEqual({
      dayName: 'Push',
      daysAgo: 3,
    })
    expect(missedDay('2026-11-12', days, [], new Set(), '2026-11-12')).toBeNull()
    expect(missedDay('2026-11-12', days, [], new Set(), since, ['2026-11-09'])).toBeNull()
  })
})

describe('liftedLessThanLastTime', () => {
  it('compares with the previous workout of the same day', () => {
    expect(
      liftedLessThanLastTime([
        { dayName: 'Push', volume: 4000 },
        { dayName: 'Legs', volume: 9000 },
        { dayName: 'Push', volume: 5000 },
      ]),
    ).toBe(true)
  })

  it('ignores small dips and first sessions', () => {
    expect(
      liftedLessThanLastTime([
        { dayName: 'Push', volume: 4800 },
        { dayName: 'Push', volume: 5000 },
      ]),
    ).toBe(false)
    expect(liftedLessThanLastTime([{ dayName: 'Push', volume: 100 }])).toBe(false)
    expect(liftedLessThanLastTime([])).toBe(false)
  })
})

describe('gorillaSays', () => {
  it('sends you back to the bar mid-workout', () => {
    expect(gorillaSays({ ...base, inProgress: true, doneToday: true }).mood).toBe('coach')
  })

  it('beats its chest after a PR today', () => {
    const says = gorillaSays({ ...base, doneToday: true, recentPr: { exercise: 'Bench Press', label: '100 kg × 5' } })
    expect(says.mood).toBe('proud')
    expect(says.line).toContain('Bench Press')
  })

  it('teases when you lifted less', () => {
    expect(gorillaSays({ ...base, doneToday: true, liftedLess: true }).line).toMatch(/more|Lighter/)
  })

  it('sits on the couch when a day was skipped', () => {
    const rest = gorillaSays({ ...base, missed: { dayName: 'Legs', daysAgo: 1 } })
    expect(rest.mood).toBe('sad')
    expect(rest.line).toMatch(/legs/i)
    const training = gorillaSays({ ...base, plannedToday: 'Pull', missed: { dayName: 'Push', daysAgo: 2 } })
    expect(training.mood).toBe('sad')
    expect(training.line).toContain('Pull')
  })

  it('waits for the planned workout', () => {
    const says = gorillaSays({ ...base, plannedToday: 'Push' })
    expect(says.mood).toBe('coach')
    expect(says.line).toContain('Push')
  })

  it('dozes on a rest day and on a frozen week', () => {
    expect(gorillaSays(base).mood).toBe('sleepy')
    expect(gorillaSays({ ...base, plannedToday: 'Push', weekFrozen: true }).line).toContain('ice')
  })

  it('asks for a plan when there is none', () => {
    expect(gorillaSays({ ...base, hasPlan: false }).line).toContain('plan')
  })

  it('says the same thing all day', () => {
    expect(gorillaSays({ ...base, plannedToday: 'Push' })).toEqual(gorillaSays({ ...base, plannedToday: 'Push' }))
  })
})

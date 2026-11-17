import { describe, expect, it } from 'vitest'
import { cycleFromWeek, cycleLength, cycleMissed, cycleSlot, cycleWeeklyTarget, projectCycle } from './cycle'

// 2026-11-16 is a Monday.
const ppl = [
  { id: 'push', name: 'Push', rest_after: 0 },
  { id: 'pull', name: 'Pull', rest_after: 0 },
  { id: 'legs', name: 'Legs', rest_after: 1 },
]

const names = (plan: Map<string, { name: string } | null>) => [...plan.values()].map((d) => d?.name ?? 'Rest')

describe('cycle shape', () => {
  it('counts the rest days into the length and slots', () => {
    expect(cycleLength(ppl)).toBe(4)
    expect(cycleSlot(ppl, 0)).toBe(1)
    expect(cycleSlot(ppl, 2)).toBe(3)
    expect(cycleLength([])).toBe(0)
  })

  it('sets the weekly target from the pace, rounded down', () => {
    expect(cycleWeeklyTarget(ppl)).toBe(5) // 3 x 7 / 4 = 5.25
    expect(cycleWeeklyTarget([{ id: 'u', name: 'Upper', rest_after: 0 }, { id: 'l', name: 'Lower', rest_after: 1 }])).toBe(4)
    expect(cycleWeeklyTarget([{ id: 'f', name: 'Full', rest_after: 6 }])).toBe(1)
    expect(cycleWeeklyTarget([])).toBe(1)
  })
})

describe('projectCycle', () => {
  it('starts with the first day today when nothing was trained yet', () => {
    const { next, plan } = projectCycle(ppl, null, '2026-11-16', '2026-11-23')
    expect(next).toMatchObject({ date: '2026-11-16', due: '2026-11-16', slot: 1 })
    expect(next?.day.id).toBe('push')
    expect(names(plan)).toEqual(['Push', 'Pull', 'Legs', 'Rest', 'Push', 'Pull', 'Legs', 'Rest'])
  })

  it('continues after the last workout and its rest days', () => {
    // Legs on Monday: Tuesday is rest, Push on Wednesday.
    const { next, plan } = projectCycle(ppl, { date: '2026-11-16', dayId: 'legs' }, '2026-11-17', '2026-11-20')
    expect(next).toMatchObject({ date: '2026-11-18', due: '2026-11-18', slot: 1 })
    expect(names(plan)).toEqual(['Rest', 'Push', 'Pull', 'Legs'])
  })

  it('waits for you after a skipped day', () => {
    // Push on Monday, Pull was due Tuesday, nothing done: on Thursday it is still Pull.
    const { next, plan } = projectCycle(ppl, { date: '2026-11-16', dayId: 'push' }, '2026-11-19', '2026-11-22')
    expect(next).toMatchObject({ date: '2026-11-19', due: '2026-11-17', slot: 2 })
    expect(next?.day.id).toBe('pull')
    expect(names(plan)).toEqual(['Pull', 'Legs', 'Rest', 'Push'])
  })

  it('treats today as done when today is the anchor', () => {
    const { next, plan } = projectCycle(ppl, { date: '2026-11-16', dayId: 'push' }, '2026-11-16', '2026-11-17')
    expect(next?.date).toBe('2026-11-17')
    expect(names(plan)).toEqual(['Rest', 'Pull'])
  })

  it('starts over when the anchor day is gone, and handles an empty split', () => {
    expect(projectCycle(ppl, { date: '2026-11-10', dayId: 'deleted' }, '2026-11-16', '2026-11-16').next?.day.id).toBe('push')
    expect(projectCycle([], null, '2026-11-16', '2026-11-20')).toEqual({ next: null, plan: new Map() })
  })
})

describe('cycleMissed', () => {
  const since = '2026-11-01'
  const waiting = projectCycle(ppl, { date: '2026-11-16', dayId: 'push' }, '2026-11-19', '2026-11-19').next

  it('notices a day that has been waiting', () => {
    expect(cycleMissed(waiting, '2026-11-19', new Set(), since)).toEqual({ dayName: 'Pull', daysAgo: 2 })
  })

  it('stays quiet when on time, after training, too long ago, before the split or in a frozen week', () => {
    const onTime = projectCycle(ppl, { date: '2026-11-16', dayId: 'push' }, '2026-11-17', '2026-11-17').next
    expect(cycleMissed(onTime, '2026-11-17', new Set(), since)).toBeNull()
    expect(cycleMissed(waiting, '2026-11-19', new Set(['2026-11-18']), since)).toBeNull()
    expect(cycleMissed(waiting, '2026-11-19', new Set(), since, [], 1)).toBeNull()
    expect(cycleMissed(waiting, '2026-11-19', new Set(), '2026-11-18')).toBeNull()
    expect(cycleMissed(waiting, '2026-11-19', new Set(), since, ['2026-11-16'])).toBeNull()
    expect(cycleMissed(null, '2026-11-19', new Set(), since)).toBeNull()
  })
})

describe('cycleFromWeek', () => {
  it('keeps the weekly rhythm as rest days', () => {
    const week = [
      { id: 'b', name: 'Pull', rest_after: 0, weekday: 2 },
      { id: 'a', name: 'Push', rest_after: 0, weekday: 0 },
      { id: 'c', name: 'Legs', rest_after: 0, weekday: 4 },
      { id: 'd', name: 'Extra', rest_after: 3, weekday: null },
    ]
    expect(cycleFromWeek(week).map((d) => [d.name, d.rest_after])).toEqual([
      ['Push', 1],
      ['Pull', 1],
      ['Legs', 2],
      ['Extra', 0],
    ])
    expect(cycleFromWeek([{ id: 'x', name: 'Full', rest_after: 0, weekday: 3 }])[0].rest_after).toBe(6)
  })
})

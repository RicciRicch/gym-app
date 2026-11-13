import { describe, expect, it } from 'vitest'
import {
  addDays,
  assignWeekday,
  buildSwap,
  isSameWeek,
  monthGrid,
  resolveDay,
  startOfWeek,
  weekDates,
  weekdayOf,
  type Override,
  type PlanDay,
} from './schedule'

// 2026-11-09 is a Monday.
const MON = '2026-11-09'
const TUE = '2026-11-10'
const WED = '2026-11-11'
const SUN = '2026-11-15'

const ppl: PlanDay[] = [
  { id: 'push', name: 'Push', weekday: 0 },
  { id: 'pull', name: 'Pull', weekday: 1 },
  { id: 'legs', name: 'Legs', weekday: 3 },
]

describe('weekday mapping', () => {
  it('maps Monday to 0 and Sunday to 6', () => {
    expect(weekdayOf(MON)).toBe(0)
    expect(weekdayOf(SUN)).toBe(6)
  })

  it('finds the Monday of any date in the week', () => {
    expect(startOfWeek(MON)).toBe(MON)
    expect(startOfWeek(SUN)).toBe(MON)
    expect(startOfWeek('2026-11-16')).toBe('2026-11-16')
  })

  it('lists the 7 dates of a week across a month boundary', () => {
    expect(weekDates('2026-12-01')).toEqual([
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
      '2026-12-03',
      '2026-12-04',
      '2026-12-05',
      '2026-12-06',
    ])
  })

  it('adds days across year and DST boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30') // EU DST start
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26') // EU DST end
    expect(addDays(MON, -1)).toBe('2026-11-08')
  })

  it('compares weeks', () => {
    expect(isSameWeek(MON, SUN)).toBe(true)
    expect(isSameWeek(SUN, '2026-11-16')).toBe(false)
  })

  it('builds a month grid of whole Mon–Sun weeks', () => {
    const grid = monthGrid(2026, 10) // November 2026 starts on a Sunday
    expect(grid[0][0]).toBe('2026-10-26')
    expect(grid[0][6]).toBe('2026-11-01')
    expect(grid.at(-1)![0]).toBe('2026-11-30')
    expect(grid).toHaveLength(6)
    expect(grid.every((w) => w.length === 7)).toBe(true)
  })
})

describe('resolveDay', () => {
  it('uses the weekly layout and treats unassigned weekdays as rest', () => {
    expect(resolveDay(MON, ppl, [])?.id).toBe('push')
    expect(resolveDay(TUE, ppl, [])?.id).toBe('pull')
    expect(resolveDay(WED, ppl, [])).toBeNull()
  })

  it('lets an override win over the weekly layout', () => {
    const overrides: Override[] = [
      { date: MON, split_day_id: null },
      { date: WED, split_day_id: 'push' },
    ]
    expect(resolveDay(MON, ppl, overrides)).toBeNull()
    expect(resolveDay(WED, ppl, overrides)?.id).toBe('push')
    // the same weekday next week is untouched
    expect(resolveDay(addDays(MON, 7), ppl, overrides)?.id).toBe('push')
  })

  it('falls back to rest when an override points at a deleted day', () => {
    expect(resolveDay(MON, ppl, [{ date: MON, split_day_id: 'gone' }])).toBeNull()
  })
})

describe('buildSwap', () => {
  it('swaps a training day with a rest day', () => {
    expect(buildSwap(MON, WED, ppl, [])).toEqual([
      { date: MON, split_day_id: null },
      { date: WED, split_day_id: 'push' },
    ])
  })

  it('swaps two training days', () => {
    expect(buildSwap(MON, TUE, ppl, [])).toEqual([
      { date: MON, split_day_id: 'pull' },
      { date: TUE, split_day_id: 'push' },
    ])
  })

  it('swapping twice restores the original plan', () => {
    const once = buildSwap(MON, TUE, ppl, [])
    const twice = buildSwap(MON, TUE, ppl, once)
    expect(resolveDay(MON, ppl, twice)?.id).toBe('push')
    expect(resolveDay(TUE, ppl, twice)?.id).toBe('pull')
  })

  it('chains on top of existing overrides', () => {
    const first = buildSwap(MON, WED, ppl, []) // push -> Wed
    const second = buildSwap(WED, SUN, ppl, first) // push -> Sun
    const all = [...first.filter((o) => !second.some((s) => s.date === o.date)), ...second]
    expect(resolveDay(MON, ppl, all)).toBeNull()
    expect(resolveDay(WED, ppl, all)).toBeNull()
    expect(resolveDay(SUN, ppl, all)?.id).toBe('push')
  })

  it('rejects swaps across weeks or with the same day', () => {
    expect(() => buildSwap(SUN, '2026-11-16', ppl, [])).toThrow()
    expect(() => buildSwap(MON, MON, ppl, [])).toThrow()
  })
})

describe('assignWeekday', () => {
  it('moves a day to a free weekday', () => {
    const next = assignWeekday(ppl, 'legs', 4)
    expect(next.find((d) => d.id === 'legs')?.weekday).toBe(4)
    expect(next.find((d) => d.id === 'push')?.weekday).toBe(0)
  })

  it('trades places when the weekday is taken', () => {
    const next = assignWeekday(ppl, 'legs', 0)
    expect(next.find((d) => d.id === 'legs')?.weekday).toBe(0)
    expect(next.find((d) => d.id === 'push')?.weekday).toBe(3)
  })

  it('can unschedule a day', () => {
    const next = assignWeekday(ppl, 'pull', null)
    expect(next.find((d) => d.id === 'pull')?.weekday).toBeNull()
    expect(new Set(next.map((d) => d.weekday)).size).toBe(3)
  })
})

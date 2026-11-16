import { describe, expect, it } from 'vitest'
import { formatTrend, groupByWeek, sessionTrends, sessionVolume, weekLabel } from './history'

// 2026-11-16 is a Monday.
const today = '2026-11-18'

describe('weekLabel', () => {
  it('names the running and the previous week', () => {
    expect(weekLabel('2026-11-16', today)).toBe('This week')
    expect(weekLabel('2026-11-09', today)).toBe('Last week')
  })

  it('shows a date range for older weeks', () => {
    expect(weekLabel('2026-11-02', today)).toBe('2–8 Nov')
    expect(weekLabel('2026-10-26', today)).toBe('26 Oct – 1 Nov')
  })

  it('adds the year for other years', () => {
    expect(weekLabel('2025-11-03', today)).toBe('3–9 Nov 2025')
    // Ends in the current year, so no year.
    expect(weekLabel('2025-12-29', today)).toBe('29 Dec – 4 Jan')
  })
})

describe('groupByWeek', () => {
  it('keeps the order and splits on Mondays', () => {
    const items = [{ date: '2026-11-17' }, { date: '2026-11-16' }, { date: '2026-11-15' }, { date: '2026-11-02' }]
    const groups = groupByWeek(items, today)
    expect(groups.map((g) => g.label)).toEqual(['This week', 'Last week', '2–8 Nov'])
    expect(groups[0].items).toEqual([{ date: '2026-11-17' }, { date: '2026-11-16' }])
  })

  it('is empty without items', () => {
    expect(groupByWeek([], today)).toEqual([])
  })
})

describe('sessionTrends', () => {
  const w = (id: string, day_name: string, date: string, kg: number, started_at = `${date}T10:00:00Z`) => ({
    id,
    day_name,
    date,
    started_at,
    workout_sets: kg ? [{ reps: 1, weight_kg: kg }] : [{ reps: 10, weight_kg: 0 }],
  })

  // Newest first, as the history query returns them.
  const trends = sessionTrends([
    w('chest3', 'Chest', '2026-11-16', 3175),
    w('legs2', 'Legs', '2026-11-12', 5400),
    w('chest2', ' chest ', '2026-11-09', 2830),
    w('legs1', 'Legs', '2026-11-05', 5620),
    w('chest1', 'Chest', '2026-11-02', 2800),
    w('core2', 'Core', '2026-11-10', 0),
    w('core1', 'Core', '2026-11-03', 0),
  ])

  it('compares with the previous session of the same day', () => {
    expect(trends.get('chest3')).toMatchObject({ volumeKg: 3175, previousKg: 2830, trend: 'up' })
    expect(trends.get('chest3')!.change).toBeCloseTo(0.1219, 3)
    expect(trends.get('legs2')).toMatchObject({ previousKg: 5620, trend: 'down' })
  })

  it('ignores case and spaces in day names and calls tiny changes the same', () => {
    expect(trends.get('chest2')).toMatchObject({ previousKg: 2800, trend: 'same' })
  })

  it('marks the first session of a day and bodyweight-only pairs', () => {
    expect(trends.get('chest1')).toMatchObject({ previousKg: null, change: null, trend: 'first' })
    expect(trends.get('core2')).toMatchObject({ change: null, trend: 'same' })
  })

  it('orders two sessions on one date by start time', () => {
    const t = sessionTrends([
      w('b', 'Arms', '2026-11-16', 1100, '2026-11-16T18:00:00Z'),
      w('a', 'Arms', '2026-11-16', 1000, '2026-11-16T08:00:00Z'),
    ])
    expect(t.get('b')).toMatchObject({ previousKg: 1000, trend: 'up' })
  })

  it('formats the change', () => {
    expect(formatTrend(trends.get('chest3')!)).toBe('▲ 12%')
    expect(formatTrend(trends.get('legs2')!)).toBe('▼ 4%')
    expect(formatTrend(trends.get('chest2')!)).toBe('≈ same')
    expect(formatTrend(trends.get('chest1')!)).toBe('First')
  })
})

describe('sessionVolume', () => {
  it('adds weight x reps, string weights included', () => {
    expect(sessionVolume([{ reps: 8, weight_kg: 80 }, { reps: 10, weight_kg: '22.5' }, { reps: 12, weight_kg: 0 }])).toBe(865)
  })
})

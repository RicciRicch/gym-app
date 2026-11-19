import { describe, expect, it } from 'vitest'
import { parseTimeInput, planAhead, PLAN_DAYS, toTimeInput } from './reminders'

describe('reminders', () => {
  it('lists the training days ahead, oldest first', () => {
    // Mon / Wed / Fri split starting on Monday 2026-11-16.
    const names: Record<string, string> = { '2026-11-16': 'Push', '2026-11-18': 'Pull', '2026-11-20': 'Legs' }
    const plan = planAhead((date) => (names[date] ? { name: names[date] } : null), '2026-11-17', 5)
    expect(plan).toEqual([
      { date: '2026-11-18', name: 'Pull' },
      { date: '2026-11-20', name: 'Legs' },
    ])
  })

  it('looks two weeks ahead by default and never past it', () => {
    const plan = planAhead(() => ({ name: 'Full body' }), '2026-11-20')
    expect(plan).toHaveLength(PLAN_DAYS)
    expect(plan.at(-1)?.date).toBe('2026-12-03')
  })

  it('keeps day names short enough for a notification', () => {
    expect(planAhead(() => ({ name: 'x'.repeat(200) }), '2026-11-20', 1)[0].name).toHaveLength(60)
  })

  it('reads and writes reminder times', () => {
    expect(toTimeInput('17:30:00')).toBe('17:30')
    expect(toTimeInput(null)).toBeNull()
    expect(parseTimeInput('7:05')).toBe('07:05')
    expect(parseTimeInput('18:00')).toBe('18:00')
    expect(parseTimeInput('24:00')).toBeNull()
    expect(parseTimeInput('')).toBeNull()
  })
})

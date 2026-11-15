import { describe, expect, it } from 'vitest'
import { formatInsight, fuelInsight, fuelReaction, fuelTip, type FuelSession } from './fuel'

const at = (hour: number) => new Date(2026, 10, 15, hour, 0)
const tip = (hour: number, dayName = 'Push', plannedSets = 12) => fuelTip({ now: at(hour), today: '2026-11-15', dayName, plannedSets })

describe('fuelTip', () => {
  it('suggests coffee before 4 PM and none after', () => {
    expect(tip(12).steps.some((s) => s.emoji === '☕')).toBe(true)
    const evening = tip(19)
    expect(evening.steps.some((s) => s.emoji === '☕')).toBe(false)
    expect(evening.steps.some((s) => s.emoji === '🚫')).toBe(true)
  })

  it('a quick snack in the morning, a proper meal later', () => {
    expect(tip(7).steps[0]).toMatchObject({ emoji: '🍌', when: '30–60 min before' })
    expect(tip(13).steps[0]).toMatchObject({ emoji: '🍚', when: '2–3 h before' })
  })

  it('leg day or lots of sets is a carb load', () => {
    expect(tip(13, 'Legs').steps[0].text).toMatch(/Carb load/)
    expect(tip(13, 'Push', 20).steps[0].text).toMatch(/Carb load/)
  })

  it('a light day needs only fruit', () => {
    expect(tip(13, 'Arms', 6).steps[0]).toMatchObject({ when: '1 h before' })
  })

  it('keeps the same headline all day', () => {
    expect(tip(12).headline).toBe(tip(13).headline)
  })
})

describe('fuelReaction', () => {
  it('reacts to what was logged', () => {
    expect(fuelReaction([])).toMatch(/Natty/)
    expect(fuelReaction(['coffee', 'energy', 'preworkout'])).toMatch(/heart rate/)
    expect(fuelReaction(['coffee', 'energy'])).toMatch(/Double stim/)
    expect(fuelReaction(['carbs'])).toMatch(/carb power/)
    expect(fuelReaction(['coffee', 'carbs'])).toMatch(/textbook/)
  })
})

describe('fuelInsight', () => {
  const s = (dayName: string, volume: number, fuel: FuelSession['fuel']): FuelSession => ({ dayName, volume, fuel })

  it('needs enough answered sessions', () => {
    expect(fuelInsight([s('Push', 1000, ['coffee']), s('Push', 900, [])])).toBeNull()
    const unanswered = Array.from({ length: 10 }, () => s('Push', 1000, null))
    expect(fuelInsight(unanswered)).toBeNull()
  })

  it('finds that coffee days lift more, compared within the same day', () => {
    const sessions = [
      s('Push', 1100, ['coffee']),
      s('Push', 1100, ['coffee']),
      s('Push', 900, []),
      s('Legs', 5500, ['coffee']),
      s('Legs', 4500, []),
      s('Legs', 4500, ['carbs']),
    ]
    const insight = fuelInsight(sessions)!
    expect(insight.fuel).toBe('coffee')
    expect(insight.percent).toBeGreaterThan(15)
    expect(insight.sessions).toBe(3)
    expect(formatInsight(insight)).toMatch(/^With coffee you lift \d+% more/)
  })

  it('ignores differences under 3%', () => {
    const sessions = [
      s('Push', 1010, ['coffee']),
      s('Push', 1000, []),
      s('Push', 1010, ['coffee']),
      s('Push', 1000, []),
      s('Push', 1010, ['coffee']),
      s('Push', 1000, []),
    ]
    expect(fuelInsight(sessions)).toBeNull()
  })

  it('reports a negative effect too', () => {
    expect(formatInsight({ fuel: 'energy', percent: -6, sessions: 4 })).toBe(
      'With an energy drink you lift 6% less on average (4 sessions). Awkward.',
    )
  })
})

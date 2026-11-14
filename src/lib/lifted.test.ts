import { describe, expect, it } from 'vitest'
import { LIFT_THINGS, formatMass, liftedComparison, totalVolume } from './lifted'

describe('liftedComparison', () => {
  it('picks the biggest thing covered at least twice', () => {
    // 8,450 kg covers a T. rex once and an elephant 1.4 times, but rhinos 2.8 times.
    expect(liftedComparison(8450)?.label).toBe('3 rhinos')
    expect(liftedComparison(12000)?.label).toBe('2 elephants')
  })

  it('rounds to halves below ten and whole numbers above', () => {
    expect(liftedComparison(7000)?.label).toBe('2.5 rhinos')
    expect(liftedComparison(52)?.label).toBe('6.5 watermelons')
    expect(liftedComparison(150_000 * 2.3)?.label).toBe('2.5 blue whales')
    expect(liftedComparison(52_000_000 * 12.4)?.label).toBe('12 Titanics')
    expect(liftedComparison(150)?.label).toBe('5 golden retrievers')
  })

  it('uses the singular for exactly one', () => {
    expect(liftedComparison(9)?.label).toBe('1 watermelon')
  })

  it('falls back to a fraction of the smallest thing', () => {
    expect(liftedComparison(4)?.label).toBe('0.5 watermelons')
    expect(liftedComparison(1)).toBeNull()
  })

  it('has nothing to say about zero volume', () => {
    expect(liftedComparison(0)).toBeNull()
    expect(liftedComparison(Number.NaN)).toBeNull()
  })

  it('keeps the list sorted lightest first', () => {
    const weights = LIFT_THINGS.map((t) => t.kg)
    expect(weights).toEqual([...weights].sort((a, b) => a - b))
  })

  it('can name an Eiffel Tower for a lifetime of lifting', () => {
    expect(liftedComparison(21_000_000)?.thing.one).toBe('Eiffel Tower')
  })
})

describe('formatMass', () => {
  it('shows kg below ten tonnes and tonnes above', () => {
    expect(formatMass(8450)).toBe('8,450 kg')
    expect(formatMass(12_440)).toBe('12.4 t')
    expect(formatMass(1_234_567)).toBe('1,235 t')
  })
})

describe('totalVolume', () => {
  const sets = [
    { date: '2025-12-30', reps: 5, weight_kg: 100 },
    { date: '2026-01-02', reps: 10, weight_kg: 50 },
    { date: '2026-03-01', reps: 12, weight_kg: 0 },
  ]

  it('adds weight x reps, bodyweight sets count as zero', () => {
    expect(totalVolume(sets)).toBe(1000)
  })

  it('can limit to one year', () => {
    expect(totalVolume(sets, 2026)).toBe(500)
  })
})

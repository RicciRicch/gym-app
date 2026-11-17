import { describe, expect, it } from 'vitest'
import { formatRatio, liftOf, strengthLevel, weakestLift, type Lift, type StrengthLevel } from './strength'

describe('liftOf', () => {
  it('matches only the four core lifts', () => {
    expect(liftOf('Bench Press')).toBe('bench')
    expect(liftOf('Back Squat')).toBe('squat')
    expect(liftOf('Deadlift')).toBe('deadlift')
    expect(liftOf('Overhead Press')).toBe('ohp')
    expect(liftOf('Front Squat')).toBeNull()
    expect(liftOf('Romanian Deadlift')).toBeNull()
    expect(liftOf('Incline Bench Press')).toBeNull()
  })
})

describe('strengthLevel', () => {
  it('places a 116.5 kg bench at 85 kg as Intermediate, 11 kg from Advanced', () => {
    const s = strengthLevel('bench', 116.5, 85, 'male')
    expect(s.level).toBe(2)
    expect(s.ratio).toBeCloseTo(1.37, 2)
    expect(s.next).toEqual({ level: 3, needKg: 11, targetKg: 127.5 })
    // 2 levels done + 0.74 of the third.
    expect(s.position).toBeCloseTo(2.74, 2)
  })
  it('starts a level exactly on its threshold', () => {
    expect(strengthLevel('bench', 85, 85, 'male').level).toBe(2)
    expect(strengthLevel('bench', 84.5, 85, 'male').level).toBe(1)
  })
  it('handles the ends of the scale', () => {
    const low = strengthLevel('squat', 20, 80, 'male')
    expect(low.level).toBe(0)
    expect(low.position).toBeCloseTo(0.25, 5)
    const elite = strengthLevel('deadlift', 250, 80, 'male')
    expect(elite.level).toBe(4)
    expect(elite.position).toBe(5)
    expect(elite.next).toBeNull()
  })
  it('uses lower standards for women', () => {
    expect(strengthLevel('bench', 60, 60, 'female').level).toBe(3)
    expect(strengthLevel('bench', 60, 60, 'male').level).toBe(2)
  })
})

describe('weakestLift', () => {
  it('picks the lift furthest behind', () => {
    const levels = new Map<Lift, StrengthLevel>([
      ['bench', strengthLevel('bench', 116.5, 85, 'male')],
      ['squat', strengthLevel('squat', 120, 85, 'male')],
    ])
    expect(weakestLift(levels)).toBe('squat')
    expect(weakestLift(new Map())).toBeNull()
  })
  it('formats the ratio', () => {
    expect(formatRatio(1.3706)).toBe('1.37× body weight')
    expect(formatRatio(1.5)).toBe('1.5× body weight')
  })
})

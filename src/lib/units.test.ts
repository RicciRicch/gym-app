import { describe, expect, it } from 'vitest'
import { convertInput, formatIn, fromKg, toKg, weightStep, withUnit } from './units'

describe('toKg', () => {
  it('keeps kg as typed', () => {
    expect(toKg(62.5, 'kg')).toBe(62.5)
  })
  it('turns pounds into kg with two decimals', () => {
    expect(toKg(100, 'lb')).toBe(45.36)
    expect(toKg(225, 'lb')).toBe(102.06)
    expect(toKg(0, 'lb')).toBe(0)
  })
})

describe('fromKg', () => {
  it('gives back what was typed in pounds', () => {
    for (const lb of [2.5, 5, 10, 45, 90, 100, 102.5, 135, 185, 225, 315, 405, 999.95, 101.3, 102.25]) {
      expect(fromKg(toKg(lb, 'lb'), 'lb')).toBe(lb)
    }
  })
  it('leaves kg alone', () => {
    expect(fromKg(45.36, 'kg')).toBe(45.36)
  })
})

describe('formatting', () => {
  it('drops trailing zeros', () => {
    expect(formatIn(45.36, 'lb')).toBe('100')
    expect(formatIn(80, 'kg')).toBe('80')
    expect(withUnit(102.06, 'lb')).toBe('225 lb')
    expect(withUnit(62.5, 'kg')).toBe('62.5 kg')
  })
})

describe('convertInput', () => {
  it('keeps the real weight when the unit changes', () => {
    expect(convertInput('100', 'lb', 'kg')).toBe('45.36')
    expect(convertInput('45.36', 'kg', 'lb')).toBe('100')
    expect(convertInput('60', 'kg', 'lb')).toBe('132.3')
    expect(convertInput('62,5', 'kg', 'lb')).toBe('137.8')
  })
  it('leaves bodyweight and unreadable text', () => {
    expect(convertInput('', 'kg', 'lb')).toBe('')
    expect(convertInput('6..', 'kg', 'lb')).toBe('6..')
  })
  it('does nothing for the same unit', () => {
    expect(convertInput('62,5', 'kg', 'kg')).toBe('62,5')
  })
})

describe('weightStep', () => {
  it('uses plate sized jumps per unit', () => {
    expect(weightStep(15, 'kg')).toBe(1)
    expect(weightStep(60, 'kg')).toBe(2.5)
    expect(weightStep(30, 'lb')).toBe(2.5)
    expect(weightStep(135, 'lb')).toBe(5)
  })
})

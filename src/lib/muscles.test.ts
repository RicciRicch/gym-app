import { describe, expect, it } from 'vitest'
import { exerciseGroup, heat, matchesSearch, muscleLoad, muscleVerdict, regionsOf, REGIONS, type MuscleLoad } from './muscles'

describe('regionsOf', () => {
  it('maps the core exercise muscles', () => {
    expect(regionsOf('Front delts')).toEqual(['shoulders'])
    expect(regionsOf('Upper chest')).toEqual(['chest'])
    expect(regionsOf('Lower back')).toEqual(['lowerBack'])
    expect(regionsOf('Upper back')).toEqual(['upperBack'])
    expect(regionsOf('Lats')).toEqual(['lats'])
    expect(regionsOf('Core')).toEqual(['core'])
    expect(regionsOf('Hamstrings')).toEqual(['hamstrings'])
  })

  it('handles free text and Serbian', () => {
    expect(regionsOf('back')).toEqual(['lats', 'upperBack'])
    expect(regionsOf('Leđa')).toEqual(['lats', 'upperBack'])
    expect(regionsOf('noge')).toEqual(['quads', 'hamstrings', 'glutes'])
    expect(regionsOf('Abs')).toEqual(['core'])
    expect(regionsOf('Grudi')).toEqual(['chest'])
    expect(regionsOf('cardio')).toEqual([])
    expect(regionsOf('Adductors')).toEqual(['quads'])
    expect(regionsOf('Abductors')).toEqual(['glutes'])
  })
})

describe('muscleLoad', () => {
  const muscles = new Map([
    ['bench', ['Chest', 'Triceps', 'Front delts']],
    ['row', ['Lats', 'Upper back', 'Biceps']],
    ['mystery', []],
  ])
  const set = (exerciseId: string, date: string) => ({ exerciseId, date })

  it('counts 1 for the main muscle and 0.5 for the rest, inside the period', () => {
    const load = muscleLoad(
      [set('bench', '2026-11-09'), set('bench', '2026-11-10'), set('row', '2026-11-15'), set('bench', '2026-11-08'), set('mystery', '2026-11-10')],
      muscles,
      '2026-11-09',
      '2026-11-15',
    )
    expect(load.chest).toBe(2)
    expect(load.triceps).toBe(1)
    expect(load.shoulders).toBe(1)
    expect(load.lats).toBe(1)
    expect(load.biceps).toBe(0.5)
    expect(load.quads).toBe(0)
  })

  it('does not count a region twice for one set', () => {
    const load = muscleLoad([set('x', '2026-11-10')], new Map([['x', ['Back', 'Lats']]]), '2026-11-09', '2026-11-15')
    expect(load.lats).toBe(1)
    expect(load.upperBack).toBe(1)
  })
})

describe('heat', () => {
  it('scales with sets per week', () => {
    expect(heat(0)).toBe(0)
    expect(heat(0.5)).toBe(1)
    expect(heat(5)).toBe(2)
    expect(heat(10)).toBe(3)
    expect(heat(20, 30)).toBe(1)
    expect(heat(45, 30)).toBe(3)
  })
})

describe('muscleVerdict', () => {
  const empty = () => Object.fromEntries(REGIONS.map((r) => [r, 0])) as MuscleLoad
  const full = () => Object.fromEntries(REGIONS.map((r) => [r, 6])) as MuscleLoad

  it('has a line for an empty and a full map', () => {
    expect(muscleVerdict(empty(), '2026-11-15')).toMatchObject({ region: null, line: expect.stringMatching(/couch/) })
    expect(muscleVerdict(full(), '2026-11-15')).toMatchObject({ region: null, line: expect.stringMatching(/Everything is lit/) })
  })

  it('teases a cold region, big muscles first', () => {
    const load = { ...full(), hamstrings: 0 }
    expect(muscleVerdict(load, '2026-11-15')).toEqual({ region: 'hamstrings', line: 'Your hamstrings filed a missing person report.' })
    const small = { ...full(), forearms: 0, calves: 0 }
    expect(['calves', 'forearms']).toContain(muscleVerdict(small, '2026-11-15').region)
  })
})

describe('exerciseGroup', () => {
  it('groups by the main muscle', () => {
    expect(exerciseGroup(['Chest', 'Triceps', 'Front delts'])).toBe('chest')
    expect(exerciseGroup(['Upper chest', 'Front delts'])).toBe('chest')
    expect(exerciseGroup(['Close grip', 'Triceps'])).toBe('arms')
    expect(exerciseGroup(['Traps'])).toBe('back')
    expect(exerciseGroup(['Rear delts', 'Upper back'])).toBe('shoulders')
    expect(exerciseGroup(['Obliques'])).toBe('core')
    expect(exerciseGroup(['Glutes', 'Hamstrings'])).toBe('legs')
    expect(exerciseGroup(['Adductors', 'Quads'])).toBe('legs')
    expect(exerciseGroup(['Upper back', 'Lats'])).toBe('back')
    expect(exerciseGroup([])).toBeNull()
    expect(exerciseGroup(['Cardio'])).toBeNull()
  })
})

describe('matchesSearch', () => {
  const bench = { name: 'Incline Bench Press', muscles: ['Upper chest', 'Front delts', 'Triceps'] }
  it('matches name, muscles and group, every word', () => {
    expect(matchesSearch('', bench)).toBe(true)
    expect(matchesSearch('bench', bench)).toBe(true)
    expect(matchesSearch('incline press', bench)).toBe(true)
    expect(matchesSearch('triceps', bench)).toBe(true)
    expect(matchesSearch('CHEST', bench)).toBe(true)
    expect(matchesSearch('decline', bench)).toBe(false)
    expect(matchesSearch('bench squat', bench)).toBe(false)
  })
  it('ignores accents', () => {
    expect(matchesSearch('ledja', { name: 'Veslanje', muscles: ['Leđa'] })).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME, THEMES, contrastRatio, parseStoredTheme, serializeTheme, themeById } from './theme'

const INK = '#0b0d10' // text on accent buttons
const SURFACE = '#14181d' // cards, the chart
const DANGER = '#ff5c5c'

describe('themes', () => {
  it('keeps button text readable and accents visible on the cards', () => {
    for (const theme of THEMES) {
      expect(contrastRatio(theme.accent, INK), theme.name).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(theme.dim, INK), theme.name).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(theme.accent, SURFACE), theme.name).toBeGreaterThanOrEqual(3)
    }
  })

  it('never uses the error red as an accent', () => {
    expect(THEMES.map((t) => t.accent)).not.toContain(DANGER)
  })

  it('has unique ids and lime as the default', () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length)
    expect(DEFAULT_THEME.id).toBe('lime')
  })
})

describe('stored theme', () => {
  it('round-trips and falls back to the default on anything unknown', () => {
    const ember = themeById('ember')
    expect(parseStoredTheme(serializeTheme(ember))).toBe(ember)
    expect(parseStoredTheme(null)).toBe(DEFAULT_THEME)
    expect(parseStoredTheme('not json')).toBe(DEFAULT_THEME)
    expect(parseStoredTheme('{"id":"red"}')).toBe(DEFAULT_THEME)
    expect(themeById(undefined)).toBe(DEFAULT_THEME)
  })

  it('serializes what index.html needs before the app loads', () => {
    expect(JSON.parse(serializeTheme(themeById('blue')))).toEqual({ id: 'blue', accent: '#5b8cff', dim: '#4d7cf0' })
  })

  it('computes contrast like WCAG', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0)
    expect(contrastRatio('#777777', '#777777')).toBe(1)
  })
})

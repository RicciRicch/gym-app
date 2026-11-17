// Color themes: the same dark app with a different accent. Red is deliberately
// not an accent (it means errors and drops); orange-red "Ember" takes its place.
// index.html applies the saved accent before the first paint, so there is no
// flash of lime; keep its key and value checks in sync with this file.

export type ThemeId = 'lime' | 'ember' | 'blue' | 'violet' | 'gold'

export interface Theme {
  id: ThemeId
  name: string
  accent: string
  /** Pressed / hover shade. */
  dim: string
}

export const THEMES: readonly Theme[] = [
  { id: 'lime', name: 'Lime', accent: '#c8ff2e', dim: '#9fd016' },
  { id: 'ember', name: 'Ember', accent: '#ff6a3d', dim: '#e5512a' },
  { id: 'blue', name: 'Electric blue', accent: '#5b8cff', dim: '#4d7cf0' },
  { id: 'violet', name: 'Violet', accent: '#b18cff', dim: '#9670ea' },
  { id: 'gold', name: 'Gold', accent: '#ffc93c', dim: '#e6ad1f' },
]

export const DEFAULT_THEME = THEMES[0]

/** localStorage key; the value is JSON { id, accent, dim } so index.html can apply it without this module. */
export const THEME_KEY = 'gym-app:theme'

export function themeById(id: string | null | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? DEFAULT_THEME
}

/** Reads the stored choice; anything unknown or broken falls back to the default. */
export function parseStoredTheme(raw: string | null): Theme {
  if (!raw) return DEFAULT_THEME
  try {
    return themeById((JSON.parse(raw) as { id?: string })?.id)
  } catch {
    return DEFAULT_THEME
  }
}

export const serializeTheme = (theme: Theme) => JSON.stringify({ id: theme.id, accent: theme.accent, dim: theme.dim })

/** WCAG contrast ratio between two #rrggbb colors. */
export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

import { useState } from 'react'
import { Button } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { DEFAULT_THEME, THEMES, type Theme } from '../../lib/theme'
import { setTheme, useTheme } from './theme-store'

/** Profile row that opens the theme sheet; shows the current accent. */
export function ThemeRow({ className = '' }: { className?: string }) {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex w-full items-center gap-3 rounded-3xl bg-surface px-4 py-3.5 text-left transition active:scale-[0.98] ${className}`}
      >
        <span className="min-w-0 flex-1">
          <span className="block font-bold">Theme</span>
          <span className="block text-sm text-muted">{theme.name}</span>
        </span>
        <span className="size-6 shrink-0 rounded-full" style={{ background: theme.accent }} aria-hidden="true" />
        <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>
      {open && <ThemeSheet onClose={() => setOpen(false)} />}
    </>
  )
}

/** Five accents on the same dark app; a tap applies one right away. */
function ThemeSheet({ onClose }: { onClose: () => void }) {
  const current = useTheme()
  return (
    <Sheet title="Theme" onClose={onClose}>
      <p className="text-muted">Pick the accent color. It is saved on this device.</p>
      <div className="mt-4 flex flex-col gap-1.5" role="radiogroup" aria-label="Theme">
        {THEMES.map((theme) => (
          <ThemeOption key={theme.id} theme={theme} selected={theme.id === current.id} />
        ))}
      </div>
      <Button className="mt-5 mb-2 w-full" onClick={onClose}>
        Done
      </Button>
    </Sheet>
  )
}

function ThemeOption({ theme, selected }: { theme: Theme; selected: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => setTheme(theme.id)}
      className={`flex min-h-16 w-full items-center gap-3 rounded-2xl px-3 text-left transition active:scale-[0.98] ${selected ? 'bg-surface-2' : 'hover:bg-surface-2/60'}`}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full" style={{ background: theme.accent }} aria-hidden="true">
        {selected && (
          <svg viewBox="0 0 24 24" className="size-5 text-accent-ink" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 5 5 9-10" />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{theme.name}</span>
        {theme.id === DEFAULT_THEME.id && <span className="block text-sm text-muted">Default</span>}
      </span>
      {/* A small sample of the theme: a filled bar and a button. */}
      <span className="flex shrink-0 items-center gap-2" aria-hidden="true">
        <span className="flex w-14 gap-0.5">
          {[1, 1, 0].map((on, i) => (
            <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: on ? theme.accent : 'var(--color-line)' }} />
          ))}
        </span>
        <span className="rounded-lg px-2 py-1 text-[11px] font-black text-accent-ink" style={{ background: theme.accent }}>
          Start
        </span>
      </span>
    </button>
  )
}

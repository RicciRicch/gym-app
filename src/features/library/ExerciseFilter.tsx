import { GROUP_LABEL, MUSCLE_GROUPS, type MuscleGroup } from '../../lib/muscles'

export function SearchField({
  value,
  onChange,
  placeholder = 'Search exercises',
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <label className={`flex min-h-12 items-center gap-2 rounded-2xl border border-line bg-surface px-4 focus-within:border-accent ${className}`}>
      <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
      <span className="sr-only">Search exercises</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        enterKeyHint="search"
        className="min-h-12 w-full bg-transparent text-base outline-none placeholder:text-muted/60"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="-mr-2 grid size-10 shrink-0 place-items-center text-muted">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </label>
  )
}

/** A horizontally scrolling row of muscle group chips with counts. Tapping the active one clears it. */
export function GroupChips({
  value,
  onChange,
  counts,
  total,
  className = '',
}: {
  value: MuscleGroup | null
  onChange: (group: MuscleGroup | null) => void
  counts: Record<MuscleGroup, number>
  total: number
  className?: string
}) {
  const chip = (active: boolean) =>
    `inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-bold whitespace-nowrap transition active:scale-95 ${
      active ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface text-text'
    }`
  const count = (n: number, active: boolean) => (
    <span className={`text-xs tabular-nums ${active ? 'text-accent-ink/70' : 'text-muted'}`}>{n}</span>
  )
  return (
    <div
      role="group"
      aria-label="Filter by muscle group"
      className={`-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      <button type="button" aria-pressed={value === null} onClick={() => onChange(null)} className={chip(value === null)}>
        All {count(total, value === null)}
      </button>
      {MUSCLE_GROUPS.map((g) => (
        <button
          key={g}
          type="button"
          aria-pressed={value === g}
          onClick={() => onChange(value === g ? null : g)}
          disabled={counts[g] === 0 && value !== g}
          className={`${chip(value === g)} disabled:opacity-40`}
        >
          {GROUP_LABEL[g]} {count(counts[g], value === g)}
        </button>
      ))}
    </div>
  )
}

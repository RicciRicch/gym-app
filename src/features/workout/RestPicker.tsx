import { formatRest, REST_MAX, REST_MIN, REST_OPTIONS, stepRest } from '../../lib/workout'

/**
 * Rest between sets: −/+ in 15 s steps (15 s to 10 min) and quick picks.
 * Used before a workout (Today, start screen) and in the running workout.
 */
export function RestPicker({
  value,
  onChange,
  className = '',
}: {
  value: number
  onChange: (seconds: number) => void
  className?: string
}) {
  const step =
    'grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-2xl font-black transition active:scale-90 disabled:opacity-40'
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold">Rest between sets</p>
        <p className="text-xs text-muted">starts after each set</p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button type="button" className={step} onClick={() => onChange(stepRest(value, -1))} disabled={value <= REST_MIN} aria-label="15 seconds less rest">
          −
        </button>
        <output className="flex-1 text-center text-2xl font-black tabular-nums" aria-live="polite">
          {formatRest(value)}
        </output>
        <button type="button" className={step} onClick={() => onChange(stepRest(value, 1))} disabled={value >= REST_MAX} aria-label="15 seconds more rest">
          +
        </button>
      </div>
      <div className="mt-2 flex gap-1.5" role="group" aria-label="Quick rest picks">
        {REST_OPTIONS.map((seconds) => (
          <button
            key={seconds}
            type="button"
            aria-pressed={value === seconds}
            onClick={() => onChange(seconds)}
            className={`min-h-11 min-w-0 flex-1 rounded-xl border text-sm font-bold tabular-nums transition active:scale-95 ${
              value === seconds ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface-2 text-text'
            }`}
          >
            {seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`}
          </button>
        ))}
      </div>
    </div>
  )
}

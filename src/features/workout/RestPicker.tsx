import { useEffect, useRef } from 'react'
import { DEFAULT_REST_SECONDS, formatRest, REST_MAX, REST_MIN, REST_OFF, REST_OPTIONS, stepRest } from '../../lib/workout'
import { RestAlertHint } from './RestAlertHint'

/**
 * Rest between sets: on / off, −/+ in 15 s steps (15 s to 10 min) and quick picks.
 * Used before a workout (start screen) and in the running workout.
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
  const on = value > REST_OFF
  // Turning it back on brings back the last duration used here.
  const lastOn = useRef(on ? value : DEFAULT_REST_SECONDS)
  useEffect(() => {
    if (on) lastOn.current = value
  }, [on, value])

  const step =
    'grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-2xl font-black transition active:scale-90 disabled:opacity-40'
  return (
    <div className={className}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(on ? REST_OFF : lastOn.current)}
        className="flex min-h-11 w-full items-center gap-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Rest between sets</span>
          <span className="block text-xs text-muted">{on ? 'A timer starts after each set' : 'Off: no timer after a set'}</span>
        </span>
        <span aria-hidden="true" className={`relative h-8 w-13 shrink-0 rounded-full transition-colors duration-200 ${on ? 'bg-accent' : 'bg-surface-2'}`}>
          <span
            className={`absolute top-1 left-1 size-6 rounded-full shadow-sm transition-transform duration-200 ${on ? 'translate-x-5 bg-accent-ink' : 'bg-muted'}`}
          />
        </span>
      </button>
      {on && (
        <>
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
          <RestAlertHint />
        </>
      )}
    </div>
  )
}

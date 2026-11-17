import { cycleLength, cycleSlot, cycleWeeklyTarget, type SplitMode } from '../../lib/cycle'
import { useMoveDay, useSetRestAfter, useSetSplitMode, type Split } from './api'

const MODES: [SplitMode, string][] = [
  ['weekly', 'Weekly'],
  ['rotating', 'Rotating'],
]

/** Weekly (days on weekdays) or rotating (days loop in order, whatever the date). */
export function ModeSwitch({ split }: { split: Split }) {
  const setMode = useSetSplitMode()
  return (
    <section aria-labelledby="mode-heading">
      <h2 id="mode-heading" className="sr-only">
        Schedule
      </h2>
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface p-1" role="radiogroup" aria-label="Schedule">
        {MODES.map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={split.mode === mode}
            onClick={() => split.mode !== mode && setMode.mutate({ split, mode })}
            className={`min-h-11 rounded-xl font-bold transition ${split.mode === mode ? 'bg-accent text-accent-ink' : 'text-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">
        {split.mode === 'rotating'
          ? 'Your days follow each other in a loop, whatever the date. Skip a day and the plan waits for you.'
          : 'Each day has its weekday. Switch to rotating to loop through your days instead.'}
      </p>
      {setMode.isError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          Could not change the schedule. Try again.
        </p>
      )}
    </section>
  )
}

/** The cycle in one line: day chips with rest chips between them, looping back. */
export function CycleStrip({ days, className = '' }: { days: readonly { name: string; rest_after: number }[]; className?: string }) {
  return (
    <ol className={`flex flex-wrap items-center gap-1.5 ${className}`} aria-label="Cycle order">
      {days.flatMap((day, i) => [
        <li key={`d${i}`} className="rounded-lg bg-accent/15 px-2.5 py-1 text-sm font-bold text-accent">
          {day.name}
        </li>,
        ...Array.from({ length: day.rest_after }, (_, r) => (
          <li key={`r${i}-${r}`} className="rounded-lg bg-surface-2 px-2.5 py-1 text-sm font-semibold text-muted">
            Rest
          </li>
        )),
      ])}
      <li aria-label="then it starts again" className="grid size-7 place-items-center text-muted">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />
        </svg>
      </li>
    </ol>
  )
}

/** Rotating mode: the order of the days and the rest after each one. */
export function CycleSection({ split }: { split: Split }) {
  const move = useMoveDay()
  const setRest = useSetRestAfter()
  const days = split.split_days
  const length = cycleLength(days)

  return (
    <section aria-labelledby="cycle-heading">
      <h2 id="cycle-heading" className="text-lg font-bold">
        Your cycle
      </h2>
      <p className="text-sm text-muted">
        {days.length === 0
          ? 'Add a training day to start your cycle.'
          : `${length}-day cycle · ${days.length} ${days.length === 1 ? 'workout' : 'workouts'} · about ${cycleWeeklyTarget(days)} a week`}
      </p>
      {days.length > 0 && <CycleStrip days={days} className="mt-3" />}

      <ol className="mt-3 flex flex-col gap-2">
        {days.map((day, i) => (
          <li key={day.id} className="rounded-3xl bg-surface px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="w-7 text-sm font-bold text-muted tabular-nums">{cycleSlot(days, i)}</span>
              <span className="min-w-0 flex-1 truncate font-bold">{day.name}</span>
              <MoveButton
                label={`Move ${day.name} earlier`}
                direction="up"
                disabled={i === 0}
                onClick={() => move.mutate({ split, dayId: day.id, direction: -1 })}
              />
              <MoveButton
                label={`Move ${day.name} later`}
                direction="down"
                disabled={i === days.length - 1}
                onClick={() => move.mutate({ split, dayId: day.id, direction: 1 })}
              />
            </div>
            <div className="mt-1 flex items-center justify-between gap-3 pl-9">
              <span className="text-sm text-muted">Rest after</span>
              <RestStepper
                name={day.name}
                value={day.rest_after}
                onChange={(restAfter) => setRest.mutate({ dayId: day.id, restAfter })}
              />
            </div>
          </li>
        ))}
      </ol>
      {(move.isError || setRest.isError) && (
        <p role="alert" className="mt-2 text-sm text-danger">
          Could not save the change. Try again.
        </p>
      )}
    </section>
  )
}

function MoveButton({
  label,
  direction,
  disabled,
  onClick,
}: {
  label: string
  direction: 'up' | 'down'
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-11 shrink-0 place-items-center rounded-full text-muted transition active:scale-90 active:text-accent disabled:opacity-25"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={direction === 'up' ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
      </svg>
    </button>
  )
}

function RestStepper({ name, value, onChange }: { name: string; value: number; onChange: (value: number) => void }) {
  const button = 'grid size-11 place-items-center text-xl font-bold text-muted transition active:scale-90 active:text-accent disabled:opacity-30'
  return (
    <div className="flex w-40 items-center justify-between rounded-2xl bg-surface-2" role="group" aria-label={`Rest days after ${name}`}>
      <button type="button" className={button} disabled={value <= 0} onClick={() => onChange(value - 1)} aria-label="Fewer rest days">
        −
      </button>
      <span className="text-sm font-bold tabular-nums">{value === 0 ? 'None' : value === 1 ? '1 day' : `${value} days`}</span>
      <button type="button" className={button} disabled={value >= 6} onClick={() => onChange(value + 1)} aria-label="More rest days">
        +
      </button>
    </div>
  )
}

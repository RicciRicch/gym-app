import { useState, type FormEvent } from 'react'
import { Button, Field, Loader } from '../../components/ui'
import { Sheet, SheetOption } from '../../components/Sheet'
import { WEEKDAY_LONG, WEEKDAY_SHORT } from '../../lib/schedule'
import {
  useAddDay,
  useAddDayExercise,
  useAssignWeekday,
  useDeleteDay,
  useExercises,
  useRemoveDayExercise,
  useRenameDay,
  useRenameSplit,
  useUpdateDayExercise,
  type DayExercise,
  type Split,
  type SplitDay,
} from './api'

type SheetState =
  | { kind: 'weekday'; weekday: number }
  | { kind: 'add-exercise'; dayId: string }
  | { kind: 'name'; target: 'split' | 'new-day' | { dayId: string }; initial: string }
  | { kind: 'delete-day'; dayId: string }
  | null

export function SplitEditor({ split }: { split: Split }) {
  const [sheet, setSheet] = useState<SheetState>(null)
  const [openDayId, setOpenDayId] = useState<string | null>(split.split_days[0]?.id ?? null)
  const close = () => setSheet(null)

  const assignWeekday = useAssignWeekday()
  const addDay = useAddDay()
  const renameDay = useRenameDay()
  const renameSplit = useRenameSplit()
  const deleteDay = useDeleteDay()
  const addExercise = useAddDayExercise()

  const dayById = (id: string) => split.split_days.find((d) => d.id === id)

  function saveName(name: string) {
    if (sheet?.kind !== 'name') return
    if (sheet.target === 'split') renameSplit.mutate({ id: split.id, name })
    else if (sheet.target === 'new-day') addDay.mutate({ split, name })
    else renameDay.mutate({ dayId: sheet.target.dayId, name })
    close()
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-widest text-accent uppercase">Your split</p>
            <h1 className="truncate text-3xl font-black tracking-tight">{split.name}</h1>
          </div>
          <button
            onClick={() => setSheet({ kind: 'name', target: 'split', initial: split.name })}
            className="min-h-11 shrink-0 px-2 font-semibold text-muted"
          >
            Rename
          </button>
        </div>
      </section>

      <section aria-labelledby="week-heading">
        <h2 id="week-heading" className="text-lg font-bold">
          Weekly layout
        </h2>
        <p className="text-sm text-muted">Tap a weekday to change what you train. Empty days are rest.</p>
        <ul className="mt-3 overflow-hidden rounded-3xl border border-line bg-surface">
          {WEEKDAY_LONG.map((label, weekday) => {
            const day = split.split_days.find((d) => d.weekday === weekday)
            return (
              <li key={label} className="border-b border-line last:border-b-0">
                <button
                  onClick={() => setSheet({ kind: 'weekday', weekday })}
                  className="flex min-h-13 w-full items-center gap-4 px-4 text-left transition active:bg-surface-2"
                >
                  <span className="w-10 text-sm font-semibold text-muted">{WEEKDAY_SHORT[weekday]}</span>
                  <span className={`flex-1 font-semibold ${day ? 'text-text' : 'text-muted/60'}`}>{day?.name ?? 'Rest'}</span>
                  {day && <span className="size-2 rounded-full bg-accent" />}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="days-heading">
        <h2 id="days-heading" className="text-lg font-bold">
          Training days
        </h2>
        <p className="text-sm text-muted">Each day&apos;s default exercises and targets.</p>
        <div className="mt-3 flex flex-col gap-3">
          {split.split_days.map((day) => (
            <DayCard
              key={day.id}
              day={day}
              open={openDayId === day.id}
              onToggle={() => setOpenDayId(openDayId === day.id ? null : day.id)}
              onRename={() => setSheet({ kind: 'name', target: { dayId: day.id }, initial: day.name })}
              onDelete={() => setSheet({ kind: 'delete-day', dayId: day.id })}
              onAddExercise={() => setSheet({ kind: 'add-exercise', dayId: day.id })}
            />
          ))}
          {split.split_days.length < 7 && (
            <button
              onClick={() => setSheet({ kind: 'name', target: 'new-day', initial: `Day ${split.split_days.length + 1}` })}
              className="min-h-14 rounded-3xl border border-dashed border-line font-semibold text-muted transition hover:text-text active:scale-[0.98]"
            >
              + Add training day
            </button>
          )}
        </div>
      </section>

      {sheet?.kind === 'weekday' && (
        <Sheet title={WEEKDAY_LONG[sheet.weekday]} onClose={close}>
          <div className="flex flex-col gap-1">
            {split.split_days.map((day) => (
              <SheetOption
                key={day.id}
                selected={day.weekday === sheet.weekday}
                onClick={() => {
                  assignWeekday.mutate({ split, dayId: day.id, weekday: sheet.weekday })
                  close()
                }}
              >
                <span>
                  {day.name}
                  {day.weekday !== null && day.weekday !== sheet.weekday && (
                    <span className="ml-2 text-sm font-normal text-muted">now {WEEKDAY_SHORT[day.weekday]}</span>
                  )}
                </span>
              </SheetOption>
            ))}
            <SheetOption
              selected={!split.split_days.some((d) => d.weekday === sheet.weekday)}
              onClick={() => {
                const current = split.split_days.find((d) => d.weekday === sheet.weekday)
                if (current) assignWeekday.mutate({ split, dayId: current.id, weekday: null })
                close()
              }}
            >
              Rest
            </SheetOption>
          </div>
        </Sheet>
      )}

      {sheet?.kind === 'add-exercise' && (
        <ExercisePicker
          excludeIds={dayById(sheet.dayId)?.split_day_exercises.map((e) => e.exercise_id) ?? []}
          onClose={close}
          onPick={(exerciseId) => {
            const day = dayById(sheet.dayId)
            if (day) addExercise.mutate({ day, exerciseId })
            close()
          }}
        />
      )}

      {sheet?.kind === 'name' && (
        <NameSheet
          title={sheet.target === 'split' ? 'Rename split' : sheet.target === 'new-day' ? 'New training day' : 'Rename day'}
          initial={sheet.initial}
          onClose={close}
          onSave={saveName}
        />
      )}

      {sheet?.kind === 'delete-day' && (
        <Sheet title={`Delete ${dayById(sheet.dayId)?.name ?? 'day'}?`} onClose={close}>
          <p className="text-muted">Its default exercises are removed. Logged workouts stay in your history.</p>
          <div className="mt-5 flex flex-col gap-2 pb-2">
            <Button
              className="bg-danger! text-white! shadow-none!"
              onClick={() => {
                deleteDay.mutate({ dayId: sheet.dayId })
                close()
              }}
            >
              Delete day
            </Button>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  )
}

function DayCard({
  day,
  open,
  onToggle,
  onRename,
  onDelete,
  onAddExercise,
}: {
  day: SplitDay
  open: boolean
  onToggle: () => void
  onRename: () => void
  onDelete: () => void
  onAddExercise: () => void
}) {
  const count = day.split_day_exercises.length
  return (
    <article className="overflow-hidden rounded-3xl border border-line bg-surface">
      <button onClick={onToggle} aria-expanded={open} className="flex min-h-16 w-full items-center gap-3 px-5 text-left">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold">{day.name}</h3>
          <p className="text-sm text-muted">
            {day.weekday === null ? 'Not scheduled' : WEEKDAY_LONG[day.weekday]} · {count} {count === 1 ? 'exercise' : 'exercises'}
          </p>
        </div>
        <svg
          viewBox="0 0 24 24"
          className={`size-5 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="animate-fade-up border-t border-line px-5 pt-1 pb-4">
          {count === 0 && <p className="py-4 text-sm text-muted">No exercises yet. Add the ones you do on this day.</p>}
          <ul>
            {day.split_day_exercises.map((row) => (
              <ExerciseRow key={row.id} row={row} dayId={day.id} />
            ))}
          </ul>
          <Button variant="secondary" className="mt-3 w-full" onClick={onAddExercise}>
            + Add exercise
          </Button>
          <div className="mt-2 flex justify-between">
            <button onClick={onRename} className="min-h-11 px-2 text-sm font-semibold text-muted">
              Rename day
            </button>
            <button onClick={onDelete} className="min-h-11 px-2 text-sm font-semibold text-danger">
              Delete day
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

function ExerciseRow({ row, dayId }: { row: DayExercise; dayId: string }) {
  const update = useUpdateDayExercise()
  const remove = useRemoveDayExercise()
  return (
    <li className="border-b border-line py-3 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-semibold">{row.exercises.name}</span>
        <button
          onClick={() => remove.mutate({ dayId, id: row.id })}
          aria-label={`Remove ${row.exercises.name}`}
          className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted active:text-danger"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
          </svg>
        </button>
      </div>
      <div className="mt-1 flex items-center gap-3">
        <Stepper
          label="sets"
          value={row.target_sets}
          min={1}
          max={20}
          onChange={(target_sets) => update.mutate({ dayId, id: row.id, target_sets })}
        />
        <span className="text-muted">×</span>
        <Stepper
          label="reps"
          value={row.target_reps}
          min={1}
          max={100}
          onChange={(target_reps) => update.mutate({ dayId, id: row.id, target_reps })}
        />
      </div>
    </li>
  )
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  const button = 'grid size-11 place-items-center text-xl font-bold text-muted transition active:scale-90 active:text-accent disabled:opacity-30'
  return (
    <div className="flex flex-1 items-center justify-between rounded-2xl bg-surface-2" role="group" aria-label={label}>
      <button className={button} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`Fewer ${label}`}>
        −
      </button>
      <span className="text-center tabular-nums">
        <span className="font-bold">{value}</span> <span className="text-sm text-muted">{label}</span>
      </span>
      <button className={button} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`More ${label}`}>
        +
      </button>
    </div>
  )
}

function NameSheet({
  title,
  initial,
  onClose,
  onSave,
}: {
  title: string
  initial: string
  onClose: () => void
  onSave: (name: string) => void
}) {
  const [name, setName] = useState(initial)
  function submit(e: FormEvent) {
    e.preventDefault()
    if (name.trim()) onSave(name.trim())
  }
  return (
    <Sheet title={title} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4 pb-2">
        <Field label="Name" value={name} maxLength={40} autoFocus onChange={(e) => setName(e.target.value)} />
        <Button type="submit" disabled={!name.trim()}>
          Save
        </Button>
      </form>
    </Sheet>
  )
}

export function ExercisePicker({
  excludeIds,
  onPick,
  onClose,
}: {
  excludeIds: string[]
  onPick: (exerciseId: string) => void
  onClose: () => void
}) {
  const { data: exercises, isPending } = useExercises()
  const available = exercises?.filter((e) => !excludeIds.includes(e.id)) ?? []
  return (
    <Sheet title="Add exercise" onClose={onClose}>
      {isPending && (
        <div className="grid place-items-center py-8">
          <Loader label="Loading exercises" className="size-10" />
        </div>
      )}
      {!isPending && available.length === 0 && <p className="py-4 text-muted">Every exercise is already on this day.</p>}
      <div className="flex flex-col gap-1">
        {available.map((exercise) => (
          <SheetOption key={exercise.id} onClick={() => onPick(exercise.id)}>
            <span>
              {exercise.name}
              <span className="block text-sm font-normal text-muted">
                {exercise.muscles.join(', ') || (exercise.user_id ? 'Custom' : '')}
              </span>
            </span>
          </SheetOption>
        ))}
      </div>
    </Sheet>
  )
}

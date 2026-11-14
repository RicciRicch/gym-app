import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Spinner } from '../components/ui'
import { Sheet, SheetOption } from '../components/Sheet'
import { useOverrides } from '../features/schedule/api'
import { useActiveSplit, type SplitDay } from '../features/split/api'
import { ExercisePicker } from '../features/split/SplitEditor'
import { useExercises } from '../features/split/api'
import { buildDraftExercise, useFinishWorkout, useStartWorkout, useUpdateDayDefault } from '../features/workout/api'
import { saveRestSeconds, useWorkoutDraft } from '../features/workout/draft-store'
import { RestTimer } from '../features/workout/RestTimer'
import { useNow } from '../features/workout/useNow'
import { resolveDay, toISODate } from '../lib/schedule'
import {
  REST_OPTIONS,
  exercisesDiffer,
  formatClock,
  isLoggable,
  toSetRows,
  type DraftExercise,
  type DraftSet,
  type WorkoutDraft,
} from '../lib/workout'

type SheetState = 'add-exercise' | 'rest' | 'discard' | 'finish-empty' | null

export function WorkoutPage() {
  const { draft, setDraft } = useWorkoutDraft()
  const split = useActiveSplit()
  const navigate = useNavigate()
  const [sheet, setSheet] = useState<SheetState>(null)
  const [askDefault, setAskDefault] = useState<{ day: SplitDay; exercises: DraftExercise[] } | null>(null)
  const finish = useFinishWorkout()
  const updateDefault = useUpdateDayDefault()
  const { data: library } = useExercises()

  const clearRest = useCallback(() => setDraft((d) => ({ ...d, restEndsAt: null })), [setDraft])

  if (askDefault) {
    const done = () => navigate('/', { replace: true })
    return (
      <Sheet title={`Update default for ${askDefault.day.name}?`} onClose={done}>
        <p className="text-muted">
          You changed the exercises today. Save this list as the new default for {askDefault.day.name}?
        </p>
        <ul className="mt-3 rounded-2xl bg-surface-2 px-4 py-2 text-sm">
          {askDefault.exercises.map((e) => (
            <li key={e.exerciseId} className="py-1 font-semibold">
              {e.name}
            </li>
          ))}
        </ul>
        {updateDefault.isError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            Could not update the default — try again
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2 pb-2">
          <Button loading={updateDefault.isPending} onClick={() => updateDefault.mutate(askDefault, { onSuccess: done })}>
            Update default
          </Button>
          <Button variant="ghost" onClick={done}>
            Keep the old one
          </Button>
        </div>
      </Sheet>
    )
  }

  if (!draft) return <StartScreen />

  const update = (fn: (d: WorkoutDraft) => WorkoutDraft) => setDraft(fn)
  const updateExercise = (index: number, fn: (e: DraftExercise) => DraftExercise) =>
    update((d) => ({ ...d, exercises: d.exercises.map((e, i) => (i === index ? fn(e) : e)) }))
  const updateSet = (exerciseIndex: number, setIndex: number, patch: Partial<DraftSet>) =>
    updateExercise(exerciseIndex, (e) => ({ ...e, sets: e.sets.map((s, i) => (i === setIndex ? { ...s, ...patch } : s)) }))

  function toggleDone(exerciseIndex: number, setIndex: number) {
    const set = draft!.exercises[exerciseIndex].sets[setIndex]
    if (set.done) return updateSet(exerciseIndex, setIndex, { done: false })
    if (!isLoggable(set)) return
    update((d) => ({
      ...d,
      restEndsAt: Date.now() + d.restSeconds * 1000,
      exercises: d.exercises.map((e, i) =>
        i === exerciseIndex ? { ...e, sets: e.sets.map((s, j) => (j === setIndex ? { ...s, done: true } : s)) } : e,
      ),
    }))
  }

  async function finishWorkout() {
    const current = draft!
    if (toSetRows(current).length === 0) return setSheet('finish-empty')
    try {
      await finish.mutateAsync(current)
    } catch {
      return // the error is shown next to the button; the draft stays
    }
    const day = split.data?.split_days.find((d) => d.id === current.splitDayId)
    const changed = day && exercisesDiffer(current, day.split_day_exercises.map((e) => e.exercise_id))
    if (day && changed && current.exercises.length > 0) setAskDefault({ day, exercises: current.exercises })
    setDraft(null)
    if (!(day && changed && current.exercises.length > 0)) navigate('/', { replace: true })
  }

  const doneSets = draft.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
  const totalSets = draft.exercises.reduce((n, e) => n + e.sets.length, 0)

  return (
    <div className={`animate-fade-up pt-2 ${draft.restEndsAt ? 'pb-24' : ''}`}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-widest text-accent uppercase">Workout in progress</p>
          <h1 className="truncate text-3xl font-black tracking-tight">{draft.dayName}</h1>
        </div>
        <Elapsed startedAt={draft.startedAt} />
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted">
          {doneSets} / {totalSets} sets done
        </span>
        <button onClick={() => setSheet('rest')} className="min-h-11 rounded-full bg-surface px-4 font-semibold">
          Rest {draft.restSeconds}s
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {draft.exercises.map((exercise, exerciseIndex) => (
          <article key={exercise.exerciseId} className="rounded-3xl border border-line bg-surface px-4 pt-3 pb-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="min-w-0 truncate text-lg font-bold">{exercise.name}</h2>
              <button
                onClick={() => update((d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== exerciseIndex) }))}
                aria-label={`Remove ${exercise.name}`}
                className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted active:text-danger"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2 text-center text-xs font-semibold text-muted">
              <span>Set</span>
              <span>kg</span>
              <span>Reps</span>
              <span>Done</span>
            </div>
            <ul className="mt-1 flex flex-col gap-2">
              {exercise.sets.map((set, setIndex) => (
                <SetRow
                  key={setIndex}
                  number={setIndex + 1}
                  set={set}
                  exerciseName={exercise.name}
                  onChange={(patch) => updateSet(exerciseIndex, setIndex, patch)}
                  onToggle={() => toggleDone(exerciseIndex, setIndex)}
                />
              ))}
            </ul>

            <div className="mt-2 flex gap-2">
              <button
                onClick={() =>
                  updateExercise(exerciseIndex, (e) => {
                    const last = e.sets.at(-1)
                    return { ...e, sets: [...e.sets, { weight: last?.weight ?? '', reps: last?.reps ?? '10', done: false }] }
                  })
                }
                className="min-h-11 flex-1 rounded-xl bg-surface-2 text-sm font-semibold"
              >
                + Add set
              </button>
              <button
                disabled={exercise.sets.length <= 1}
                onClick={() => updateExercise(exerciseIndex, (e) => ({ ...e, sets: e.sets.slice(0, -1) }))}
                className="min-h-11 flex-1 rounded-xl bg-surface-2 text-sm font-semibold text-muted disabled:opacity-40"
              >
                − Remove set
              </button>
            </div>
          </article>
        ))}

        {draft.exercises.length === 0 && (
          <p className="rounded-3xl border border-dashed border-line p-6 text-center text-muted">No exercises yet. Add the first one.</p>
        )}

        <Button variant="secondary" onClick={() => setSheet('add-exercise')}>
          + Add exercise
        </Button>
      </div>

      {finish.isError && (
        <p role="alert" className="mt-4 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          Could not save the workout — check your connection and try again. Nothing is lost.
        </p>
      )}
      <Button className="mt-5 min-h-14 w-full text-lg" loading={finish.isPending} onClick={finishWorkout}>
        Finish workout
      </Button>
      <Button variant="ghost" className="mt-1 w-full" onClick={() => setSheet('discard')}>
        Discard workout
      </Button>

      {draft.restEndsAt !== null && (
        <RestTimer
          endsAt={draft.restEndsAt}
          totalSeconds={draft.restSeconds}
          onAdjust={(delta) => update((d) => (d.restEndsAt === null ? d : { ...d, restEndsAt: d.restEndsAt + delta * 1000 }))}
          onDone={clearRest}
        />
      )}

      {sheet === 'add-exercise' && (
        <ExercisePicker
          excludeIds={draft.exercises.map((e) => e.exerciseId)}
          onClose={() => setSheet(null)}
          onPick={async (exerciseId) => {
            setSheet(null)
            const exercise = library?.find((e) => e.id === exerciseId)
            if (!exercise) return
            const block = await buildDraftExercise(exercise)
            update((d) => (d.exercises.some((e) => e.exerciseId === block.exerciseId) ? d : { ...d, exercises: [...d.exercises, block] }))
          }}
        />
      )}

      {sheet === 'rest' && (
        <Sheet title="Rest between sets" onClose={() => setSheet(null)}>
          <div className="flex flex-col gap-1">
            {REST_OPTIONS.map((seconds) => (
              <SheetOption
                key={seconds}
                selected={draft.restSeconds === seconds}
                onClick={() => {
                  saveRestSeconds(seconds)
                  update((d) => ({ ...d, restSeconds: seconds }))
                  setSheet(null)
                }}
              >
                {seconds < 60 ? `${seconds} seconds` : `${formatClock(seconds)} min`}
              </SheetOption>
            ))}
          </div>
          <p className="mt-2 pb-2 text-sm text-muted">The timer starts by itself when you complete a set.</p>
        </Sheet>
      )}

      {sheet === 'finish-empty' && (
        <Sheet title="No sets completed" onClose={() => setSheet(null)}>
          <p className="text-muted">Tick at least one set as done to save this workout.</p>
          <div className="mt-5 flex flex-col gap-2 pb-2">
            <Button onClick={() => setSheet(null)}>Keep going</Button>
            <Button variant="ghost" onClick={() => setSheet('discard')}>
              Discard workout
            </Button>
          </div>
        </Sheet>
      )}

      {sheet === 'discard' && (
        <Sheet title="Discard this workout?" onClose={() => setSheet(null)}>
          <p className="text-muted">Everything you logged in this session will be deleted.</p>
          <div className="mt-5 flex flex-col gap-2 pb-2">
            <Button
              className="bg-danger! text-white! shadow-none!"
              onClick={() => {
                setDraft(null)
                navigate('/', { replace: true })
              }}
            >
              Discard
            </Button>
            <Button variant="ghost" onClick={() => setSheet(null)}>
              Keep going
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  )
}

function SetRow({
  number,
  set,
  exerciseName,
  onChange,
  onToggle,
}: {
  number: number
  set: DraftSet
  exerciseName: string
  onChange: (patch: Partial<DraftSet>) => void
  onToggle: () => void
}) {
  const valid = isLoggable(set)
  const input = `min-h-12 w-full rounded-xl border bg-surface-2 text-center text-lg font-bold tabular-nums outline-none transition focus:border-accent ${set.done ? 'border-accent/40 text-accent' : 'border-transparent'}`
  return (
    <li className="grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2">
      <span className="text-center font-bold text-muted">{number}</span>
      <input
        className={input}
        inputMode="decimal"
        placeholder="BW"
        aria-label={`${exerciseName} set ${number} weight in kg`}
        value={set.weight}
        onChange={(e) => onChange({ weight: e.target.value.replace(/[^\d.,]/g, '').slice(0, 7) })}
        onFocus={(e) => e.target.select()}
      />
      <input
        className={input}
        inputMode="numeric"
        placeholder="0"
        aria-label={`${exerciseName} set ${number} reps`}
        value={set.reps}
        onChange={(e) => onChange({ reps: e.target.value.replace(/\D/g, '').slice(0, 4) })}
        onFocus={(e) => e.target.select()}
      />
      <button
        onClick={onToggle}
        disabled={!set.done && !valid}
        aria-pressed={set.done}
        aria-label={`${exerciseName} set ${number} done`}
        className={`grid size-12 place-items-center rounded-xl border-2 transition active:scale-90 disabled:opacity-30 ${set.done ? 'animate-pop border-accent bg-accent text-accent-ink' : 'border-line text-muted'}`}
      >
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5 9-10" />
        </svg>
      </button>
    </li>
  )
}

function Elapsed({ startedAt }: { startedAt: string }) {
  const now = useNow(1000)
  return (
    <span className="shrink-0 text-right">
      <span className="block text-xs font-semibold text-muted">Time</span>
      <span className="block text-xl font-black tabular-nums">{formatClock((now - new Date(startedAt).getTime()) / 1000)}</span>
    </span>
  )
}

/** No workout running: start today's planned day or pick another one. */
function StartScreen() {
  const split = useActiveSplit()
  const today = toISODate(new Date())
  const overrides = useOverrides(today, today)
  const start = useStartWorkout()
  const navigate = useNavigate()

  if (split.isPending || overrides.isPending) {
    return (
      <div className="grid place-items-center pt-24 text-accent">
        <Spinner />
      </div>
    )
  }

  const days = split.data?.split_days ?? []
  const planned = resolveDay(today, days, overrides.data ?? [])

  return (
    <div className="animate-fade-up pt-2">
      <h1 className="text-3xl font-black tracking-tight">Start a workout</h1>
      {days.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-line bg-surface p-6">
          <p className="text-muted">Create a split first, then start any of its days here.</p>
          <Button className="mt-4 w-full" onClick={() => navigate('/split')}>
            Create your split
          </Button>
        </div>
      ) : (
        <>
          <p className="mt-1 text-muted">{planned ? `Today is ${planned.name}.` : 'Today is a rest day, but you can train anyway.'}</p>
          <ul className="mt-4 flex flex-col gap-2">
            {[...days].sort((a, b) => Number(b.id === planned?.id) - Number(a.id === planned?.id)).map((day) => (
              <li key={day.id}>
                <button
                  disabled={start.isPending}
                  onClick={() => start.mutate(day)}
                  className={`flex min-h-16 w-full items-center justify-between rounded-3xl border px-5 text-left transition active:scale-[0.98] disabled:opacity-60 ${day.id === planned?.id ? 'border-accent bg-accent/10' : 'border-line bg-surface'}`}
                >
                  <span>
                    <span className="block text-lg font-bold">{day.name}</span>
                    <span className="block text-sm text-muted">
                      {day.split_day_exercises.length} exercises{day.id === planned?.id && ' · planned today'}
                    </span>
                  </span>
                  <span className="font-bold text-accent">Start</span>
                </button>
              </li>
            ))}
          </ul>
          {start.isError && (
            <p role="alert" className="mt-3 text-sm text-danger">
              Could not start the workout — check your connection and try again
            </p>
          )}
        </>
      )}
    </div>
  )
}

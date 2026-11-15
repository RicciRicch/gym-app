import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Sheet } from '../components/Sheet'
import { Button, Field, PageLoader } from '../components/ui'
import { ExerciseExistsError, parseMuscles, useCreateExercise } from '../features/library/api'
import { EquipmentIcon } from '../features/library/EquipmentIcon'
import { SearchField } from '../features/library/ExerciseFilter'
import { useExerciseFilter } from '../features/library/filter'
import { useLoggedSets } from '../features/progress/api'
import { useActiveSplit, useExercises, type Exercise } from '../features/split/api'
import { EQUIPMENT_LABEL, equipmentOf, yourExerciseIds } from '../lib/library'
import { exerciseGroup, GROUP_LABEL, MUSCLE_GROUPS, type MuscleGroup } from '../lib/muscles'

export function LibraryPage() {
  const { data: exercises, isPending, isError, refetch } = useExercises()
  const [adding, setAdding] = useState(false)
  // Search and group live in the URL, so they survive opening an exercise and coming back,
  // and the phone's back button leaves a group.
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const groupParam = params.get('group')
  const group = MUSCLE_GROUPS.includes(groupParam as MuscleGroup) ? (groupParam as MuscleGroup) : null
  const update = (key: 'q' | 'group', value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: key === 'q' },
    )

  const openGroup = (g: MuscleGroup | null) => {
    update('group', g)
    window.scrollTo({ top: 0 })
  }

  const all = exercises ?? []
  const q = query.trim()
  const { shown } = useExerciseFilter(all, query, group)
  const { counts } = useExerciseFilter(all, '', null)
  const yours = useYourExercises(all)
  const custom = all.filter((e) => e.user_id)

  return (
    <div className="animate-fade-up pt-2">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-3xl font-black tracking-tight">Library</h1>
        <button onClick={() => setAdding(true)} className="min-h-11 px-2 font-bold text-accent">
          + Custom
        </button>
      </div>

      <SearchField
        className="mt-4"
        value={query}
        onChange={(v) => update('q', v)}
        placeholder={group ? `Search in ${GROUP_LABEL[group].toLowerCase()}` : 'Search by name or muscle'}
      />

      {group && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            onClick={() => openGroup(null)}
            className="-ml-1 inline-flex min-h-11 items-center gap-1 font-semibold text-muted"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 6-6 6 6 6" />
            </svg>
            All groups
          </button>
          <h2 className="text-xl font-black">{GROUP_LABEL[group]}</h2>
        </div>
      )}

      {isPending ? (
        <PageLoader label="Loading exercises" />
      ) : isError ? (
        <div className="pt-16 text-center">
          <p className="font-bold">Could not load exercises</p>
          <button className="mt-2 min-h-11 px-4 font-semibold text-accent" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      ) : q || group ? (
        shown.length > 0 ? (
          <ExerciseList title={q ? `${shown.length} ${shown.length === 1 ? 'result' : 'results'}` : `${shown.length} exercises`} exercises={shown} />
        ) : (
          <div className="mt-10 text-center">
            <p className="text-muted">
              No {group ? `${GROUP_LABEL[group].toLowerCase()} ` : ''}exercise matches{q ? ` “${q}”` : ''}.
            </p>
            <button className="mt-2 min-h-11 px-4 font-semibold text-accent" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
              Clear search
            </button>
          </div>
        )
      ) : (
        <>
          {yours.length > 0 && <ExerciseList title="Yours" exercises={yours} />}

          <section className="mt-6">
            <h2 className="text-sm font-semibold tracking-widest text-muted uppercase">Muscle groups</h2>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {MUSCLE_GROUPS.map((g) => (
                <GroupTile key={g} group={g} count={counts[g]} examples={all.filter((e) => exerciseGroup(e.muscles) === g)} onOpen={() => openGroup(g)} />
              ))}
            </div>
          </section>

          {custom.length > 0 ? (
            <ExerciseList title="Your custom exercises" exercises={custom} />
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="mt-6 min-h-14 w-full rounded-3xl border border-dashed border-line font-semibold text-muted transition hover:text-text active:scale-[0.98]"
            >
              + Add a custom exercise
            </button>
          )}
        </>
      )}

      {adding && <AddExerciseSheet existingNames={all.map((e) => e.name)} onClose={() => setAdding(false)} />}
    </div>
  )
}

/** What the user logged lately, then the rest of their split. */
function useYourExercises(exercises: Exercise[]) {
  const { data: sets } = useLoggedSets()
  const { data: split } = useActiveSplit()
  return useMemo(() => {
    const byId = new Map(exercises.map((e) => [e.id, e]))
    const splitIds = split?.split_days.flatMap((d) => d.split_day_exercises.map((x) => x.exercise_id)) ?? []
    return yourExerciseIds(sets ?? [], splitIds)
      .map((id) => byId.get(id))
      .filter((e): e is Exercise => !!e)
  }, [exercises, sets, split])
}

function GroupTile({ group, count, examples, onOpen }: { group: MuscleGroup; count: number; examples: Exercise[]; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      disabled={count === 0}
      className="flex min-h-24 flex-col justify-between gap-2 rounded-3xl border border-line bg-surface p-4 text-left transition active:scale-[0.97] disabled:opacity-40"
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-lg font-black">{GROUP_LABEL[group]}</span>
        <span className="text-sm font-bold text-accent tabular-nums">{count}</span>
      </span>
      <span className="line-clamp-2 text-xs leading-snug text-muted">
        {examples
          .slice(0, 3)
          .map((e) => e.name)
          .join(' · ')}
      </span>
    </button>
  )
}

function ExerciseList({ title, exercises }: { title: string; exercises: Exercise[] }) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold tracking-widest text-muted uppercase">{title}</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {exercises.map((e) => (
          <li key={e.id}>
            <ExerciseRow exercise={e} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** A compact row: name, main muscle and gear, with the gear icon on the right. */
function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const equipment = equipmentOf(exercise.name)
  const details = [exercise.muscles[0] ?? (exercise.user_id ? 'Custom exercise' : null), equipment && EQUIPMENT_LABEL[equipment]].filter(Boolean)
  return (
    <Link
      to={`/library/${exercise.id}`}
      className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface py-2 pr-2 pl-4 transition active:scale-[0.98]"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold">{exercise.name}</span>
        {details.length > 0 && <span className="block truncate text-sm text-muted">{details.join(' · ')}</span>}
      </span>
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-accent" title={equipment ? EQUIPMENT_LABEL[equipment] : undefined}>
        <EquipmentIcon equipment={equipment} />
      </span>
    </Link>
  )
}

function AddExerciseSheet({ existingNames, onClose }: { existingNames: string[]; onClose: () => void }) {
  const [name, setName] = useState('')
  const [muscles, setMuscles] = useState('')
  const create = useCreateExercise()

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim().replace(/\s+/g, ' ')
    if (!trimmed) return
    create.mutate({ name: trimmed, muscles: parseMuscles(muscles), existingNames }, { onSuccess: onClose })
  }

  return (
    <Sheet title="Custom exercise" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4 pb-2">
        <Field
          label="Name"
          value={name}
          maxLength={60}
          autoFocus
          onChange={(e) => {
            setName(e.target.value)
            create.reset()
          }}
          placeholder="Incline Dumbbell Press"
          error={create.error instanceof ExerciseExistsError ? create.error.message : null}
        />
        <Field
          label="Target muscles (optional)"
          value={muscles}
          maxLength={120}
          onChange={(e) => setMuscles(e.target.value)}
          placeholder="Upper chest, front delts"
          hint="Separate with commas."
        />
        {create.isError && !(create.error instanceof ExerciseExistsError) && (
          <p role="alert" className="text-sm text-danger">
            Could not save the exercise — try again
          </p>
        )}
        <Button type="submit" loading={create.isPending} disabled={!name.trim()}>
          Add exercise
        </Button>
      </form>
    </Sheet>
  )
}

import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ExerciseImage } from '../components/ExerciseImage'
import { Sheet } from '../components/Sheet'
import { Button, Field, PageLoader } from '../components/ui'
import { ExerciseExistsError, parseMuscles, useCreateExercise } from '../features/library/api'
import { GroupChips, SearchField } from '../features/library/ExerciseFilter'
import { useExerciseFilter } from '../features/library/filter'
import { GROUP_LABEL, MUSCLE_GROUPS, type MuscleGroup } from '../lib/muscles'
import { useExercises, type Exercise } from '../features/split/api'

export function LibraryPage() {
  const { data: exercises, isPending, isError, refetch } = useExercises()
  const [adding, setAdding] = useState(false)
  // Search and group live in the URL, so they survive opening an exercise and coming back.
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
      { replace: true },
    )

  const { shown, counts, total } = useExerciseFilter(exercises ?? [], query, group)
  const q = query.trim()
  const core = shown.filter((e) => !e.user_id)
  const custom = shown.filter((e) => e.user_id)

  return (
    <div className="animate-fade-up pt-2">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-3xl font-black tracking-tight">Library</h1>
        <button onClick={() => setAdding(true)} className="min-h-11 px-2 font-bold text-accent">
          + Custom
        </button>
      </div>

      <SearchField className="mt-4" value={query} onChange={(v) => update('q', v)} placeholder="Search by name or muscle" />
      {exercises && <GroupChips className="mt-3" value={group} onChange={(g) => update('group', g)} counts={counts} total={total} />}

      {isPending ? (
        <PageLoader label="Loading exercises" />
      ) : isError ? (
        <div className="pt-16 text-center">
          <p className="font-bold">Could not load exercises</p>
          <button className="mt-2 min-h-11 px-4 font-semibold text-accent" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      ) : (
        <>
          {core.length > 0 && (
            <ExerciseList title={`${group ? GROUP_LABEL[group] : 'Core exercises'} · ${core.length}`} exercises={core} />
          )}
          {custom.length > 0 && <ExerciseList title={`Your exercises · ${custom.length}`} exercises={custom} />}
          {core.length === 0 && custom.length === 0 && (
            <div className="mt-10 text-center">
              <p className="text-muted">
                No {group ? `${GROUP_LABEL[group].toLowerCase()} ` : ''}exercise matches{q ? ` “${q}”` : ''}.
              </p>
              <button className="mt-2 min-h-11 px-4 font-semibold text-accent" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                Clear filters
              </button>
            </div>
          )}
          {!q && !group && custom.length === 0 && (
            <button
              onClick={() => setAdding(true)}
              className="mt-6 min-h-14 w-full rounded-3xl border border-dashed border-line font-semibold text-muted transition hover:text-text active:scale-[0.98]"
            >
              + Add a custom exercise
            </button>
          )}
        </>
      )}

      {adding && <AddExerciseSheet existingNames={exercises?.map((e) => e.name) ?? []} onClose={() => setAdding(false)} />}
    </div>
  )
}

function ExerciseList({ title, exercises }: { title: string; exercises: Exercise[] }) {
  return (
    <section className="mt-6">
      <h2 className="text-sm font-semibold tracking-widest text-muted uppercase">{title}</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {exercises.map((e) => (
          <li key={e.id}>
            <Link
              to={`/library/${e.id}`}
              className="flex min-h-20 items-center gap-4 rounded-3xl border border-line bg-surface p-2 pr-4 transition active:scale-[0.98]"
            >
              <ExerciseImage imageKey={e.image_key} name={e.name} muscles={e.muscles} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{e.name}</span>
                <span className="block truncate text-sm text-muted">{e.muscles.join(' · ') || 'Custom exercise'}</span>
              </span>
              <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </section>
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

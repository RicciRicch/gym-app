import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExerciseImage, Mascot } from '../components/ExerciseImage'
import { PrBadge } from '../components/PrBadge'
import { Sheet } from '../components/Sheet'
import { Button, PageLoader } from '../components/ui'
import { useDeleteWorkout, useLoggedSets, useWorkoutHistory, type HistoryWorkout } from '../features/progress/api'
import { useExercises } from '../features/split/api'
import { formatTopSet, progressByExercise, prsByWorkout } from '../lib/progress'
import { fromISODate } from '../lib/schedule'
import { formatClock } from '../lib/workout'

type Tab = 'history' | 'exercises'

export function ProgressPage() {
  const [tab, setTab] = useState<Tab>('history')
  const history = useWorkoutHistory()
  const sets = useLoggedSets()
  const exercises = useExercises()

  const progress = useMemo(() => progressByExercise(sets.data ?? []), [sets.data])
  const prs = useMemo(() => prsByWorkout(progress), [progress])

  const loading = history.isPending || sets.isPending
  const empty = !loading && (history.data?.length ?? 0) === 0

  return (
    <div className="animate-fade-up pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight">Progress</h1>
        {!empty && (
          <div className="flex rounded-full bg-surface p-1" role="tablist" aria-label="Progress view">
            {(['history', 'exercises'] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`min-h-9 rounded-full px-4 text-sm font-bold capitalize transition ${tab === t ? 'bg-accent text-accent-ink' : 'text-muted'}`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <PageLoader label="Loading your progress" />
      ) : history.isError || sets.isError ? (
        <div className="pt-16 text-center">
          <p className="font-bold">Could not load your progress</p>
          <button
            className="mt-2 min-h-11 px-4 font-semibold text-accent"
            onClick={() => {
              history.refetch()
              sets.refetch()
            }}
          >
            Try again
          </button>
        </div>
      ) : empty ? (
        <div className="mt-10 text-center">
          <Mascot />
          <p className="mt-4 text-lg font-bold">No workouts yet</p>
          <p className="mt-1 text-muted">Finish your first workout and your history and PRs land here.</p>
          <Link
            to="/"
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-2xl bg-accent px-6 font-bold text-accent-ink"
          >
            Go to today
          </Link>
        </div>
      ) : tab === 'history' ? (
        <ul className="mt-4 flex flex-col gap-3">
          {history.data!.map((w) => (
            <WorkoutCard key={w.id} workout={w} prExercises={prs.get(w.id)} />
          ))}
        </ul>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {[...progress]
            .map(([id, p]) => ({ id, p, exercise: exercises.data?.find((e) => e.id === id) }))
            .sort((a, b) => (b.p.points.at(-1)?.date ?? '').localeCompare(a.p.points.at(-1)?.date ?? ''))
            .map(({ id, p, exercise }) => {
              const last = p.points.at(-1)
              return (
                <li key={id}>
                  <Link
                    to={`/progress/${id}`}
                    className="flex min-h-20 items-center gap-4 rounded-3xl border border-line bg-surface p-2 pr-4 transition active:scale-[0.98]"
                  >
                    <ExerciseImage imageKey={exercise?.image_key ?? null} name={exercise?.name ?? ''} className="size-14 rounded-2xl" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{exercise?.name ?? 'Exercise'}</span>
                      <span className="block text-sm text-muted">
                        Best {p.best ? formatTopSet(p.best) : '–'} · {p.points.length} {p.points.length === 1 ? 'session' : 'sessions'}
                      </span>
                    </span>
                    {last?.isPR && <PrBadge />}
                  </Link>
                </li>
              )
            })}
        </ul>
      )}
    </div>
  )
}

function WorkoutCard({ workout, prExercises }: { workout: HistoryWorkout; prExercises: Set<string> | undefined }) {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const groups: { exerciseId: string; name: string; sets: HistoryWorkout['workout_sets'] }[] = []
  for (const s of workout.workout_sets) {
    const last = groups.at(-1)
    if (last && last.exerciseId === s.exercise_id) last.sets.push(s)
    else groups.push({ exerciseId: s.exercise_id, name: s.exercises.name, sets: [s] })
  }
  const seconds = (new Date(workout.finished_at).getTime() - new Date(workout.started_at).getTime()) / 1000
  const date = fromISODate(workout.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <li className="overflow-hidden rounded-3xl border border-line bg-surface">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-18 w-full items-center gap-3 px-5 py-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-muted">{date}</span>
          <span className="block truncate text-lg font-bold">{workout.day_name}</span>
          <span className="block text-sm text-muted">
            {groups.length} {groups.length === 1 ? 'exercise' : 'exercises'} · {workout.workout_sets.length} sets · {formatClock(seconds)}
          </span>
        </span>
        {prExercises && prExercises.size > 0 && <PrBadge label={prExercises.size > 1 ? `${prExercises.size} PRs` : 'PR'} />}
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
        <div className="animate-fade-up border-t border-line px-5 py-3">
          {groups.map((g) => (
            <div key={g.exerciseId} className="py-2">
              <p className="flex items-center gap-2 font-semibold">
                {g.name}
                {prExercises?.has(g.exerciseId) && <PrBadge />}
              </p>
              <p className="mt-0.5 text-sm text-muted tabular-nums">
                {g.sets.map((s) => formatTopSet({ weight: Number(s.weight_kg), reps: s.reps })).join('  ·  ')}
              </p>
            </div>
          ))}
          <button
            onClick={() => setConfirmDelete(true)}
            className="-mx-2 mt-1 flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-danger/80"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
            </svg>
            Delete workout
          </button>
        </div>
      )}
      {confirmDelete && (
        <DeleteWorkoutSheet workout={workout} date={date} hasPRs={!!prExercises?.size} onClose={() => setConfirmDelete(false)} />
      )}
    </li>
  )
}

function DeleteWorkoutSheet({
  workout,
  date,
  hasPRs,
  onClose,
}: {
  workout: HistoryWorkout
  date: string
  hasPRs: boolean
  onClose: () => void
}) {
  const remove = useDeleteWorkout()
  return (
    <Sheet title="Delete this workout?" onClose={remove.isPending ? () => {} : onClose}>
      <p className="text-muted">
        <span className="font-semibold text-text">
          {workout.day_name} · {date}
        </span>{' '}
        and its {workout.workout_sets.length} sets will be removed for good. Your charts and PRs are recalculated without it.
        {hasPRs && ' The PRs from this session go with it.'}
      </p>
      {remove.isError && (
        <p role="alert" className="mt-4 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {navigator.onLine ? 'Could not delete the workout. Try again.' : 'You are offline. Try again when you are back online.'}
        </p>
      )}
      <div className="mt-5 flex flex-col gap-2">
        <Button variant="danger" className="w-full" loading={remove.isPending} onClick={() => remove.mutate(workout.id, { onSuccess: onClose })}>
          Delete workout
        </Button>
        <Button variant="ghost" className="w-full" disabled={remove.isPending} onClick={onClose}>
          Keep it
        </Button>
      </div>
    </Sheet>
  )
}

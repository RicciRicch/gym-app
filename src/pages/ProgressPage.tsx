import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mascot } from '../components/Mascot'
import { MovementGlyph } from '../components/MovementFigure'
import { PrBadge } from '../components/PrBadge'
import { Sheet } from '../components/Sheet'
import { Button, PageLoader } from '../components/ui'
import { useDeleteWorkout, useLoggedSets, useWorkoutHistory, type HistoryWorkout } from '../features/progress/api'
import { MuscleMapCard } from '../features/muscles/MuscleMapCard'
import { useExercises } from '../features/split/api'
import { LiftedStrip } from '../components/LiftedCard'
import { InfoBubble } from '../components/InfoBubble'
import { formatTrend, groupByWeek, SAME_BAND, sessionTrends, type SessionTrend, type Trend } from '../lib/history'
import { formatMass, totalVolume } from '../lib/lifted'
import { formatTopSet, progressByExercise, prsByWorkout } from '../lib/progress'
import { fromISODate, toISODate } from '../lib/schedule'
import { formatClock } from '../lib/workout'
import { useExerciseUnits } from '../features/units/api'

type Tab = 'history' | 'exercises'

export function ProgressPage() {
  const [tab, setTab] = useState<Tab>('history')
  const history = useWorkoutHistory()
  const sets = useLoggedSets()
  const exercises = useExercises()
  const unitOf = useExerciseUnits()

  const progress = useMemo(() => progressByExercise(sets.data ?? []), [sets.data])
  const prs = useMemo(() => prsByWorkout(progress), [progress])
  const year = new Date().getFullYear()
  const volume = useMemo(
    () => ({ year: totalVolume(sets.data ?? [], year), allTime: totalVolume(sets.data ?? []) }),
    [sets.data, year],
  )

  const today = toISODate(new Date())
  const weeks = useMemo(() => groupByWeek(history.data ?? [], today), [history.data, today])
  const trends = useMemo(() => sessionTrends(history.data ?? []), [history.data])

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
        <>
          <MuscleMapCard className="mt-4" />

          <section aria-labelledby="training-log" className="mt-10">
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <h2 id="training-log" className="text-2xl font-black tracking-tight">
                  Training log
                </h2>
                <span className="ml-1.5">
                  <InfoBubble label="How sessions are compared">
                    <TrendLegend />
                  </InfoBubble>
                </span>
              </div>
              <span className="text-sm font-semibold text-muted tabular-nums">
                {history.data!.length} {history.data!.length === 1 ? 'session' : 'sessions'}
              </span>
            </div>
            {volume.allTime > 0 && (
              <div className="mt-3">
                <LiftedStrip
                  kg={volume.year > 0 ? volume.year : volume.allTime}
                  label={volume.year > 0 ? `in ${year}` : 'all time'}
                  footer={volume.year > 0 && volume.allTime > volume.year ? `${formatMass(volume.allTime)} total` : undefined}
                />
              </div>
            )}

            {weeks.map((week) => {
              const sets = week.items.reduce((sum, w) => sum + w.workout_sets.length, 0)
              return (
                <div key={week.weekStart} className="mt-6">
                  <h3 className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-black tracking-wider text-text uppercase">{week.label}</span>
                    <span className="text-xs font-semibold text-muted tabular-nums">
                      {week.items.length} {week.items.length === 1 ? 'workout' : 'workouts'} · {sets} sets
                    </span>
                  </h3>
                  <ol className="relative mt-2 flex flex-col gap-3 pl-7">
                    <span aria-hidden="true" className="absolute top-2 bottom-2 left-[6px] w-0.5 rounded-full bg-line" />
                    {week.items.map((w) => (
                      <WorkoutCard key={w.id} workout={w} prExercises={prs.get(w.id)} trend={trends.get(w.id)} />
                    ))}
                  </ol>
                </div>
              )
            })}
          </section>
        </>
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
                    <MovementGlyph name={exercise?.name ?? ''} className="size-14 rounded-2xl" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{exercise?.name ?? 'Exercise'}</span>
                      <span className="block text-sm text-muted">
                        Best {p.best ? formatTopSet(p.best, unitOf(id)) : '–'} · {p.points.length} {p.points.length === 1 ? 'session' : 'sessions'}
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

const TREND_DOT: Record<Trend, string> = {
  up: 'bg-accent',
  down: 'bg-danger',
  same: 'bg-muted',
  first: 'border-2 border-muted bg-bg',
}
const TREND_TEXT: Record<Trend, string> = { up: 'text-accent', down: 'text-danger', same: 'text-muted', first: 'text-muted font-semibold' }

function trendLabel(t: SessionTrend, day: string): string {
  if (t.trend === 'first') return `First ${day} session`
  if (t.trend === 'same' || t.change === null) return `About the same as your last ${day} session`
  return `${Math.round(Math.abs(t.change) * 100)}% ${t.trend === 'up' ? 'more' : 'less'} than your last ${day} session`
}

function WorkoutCard({
  workout,
  prExercises,
  trend,
}: {
  workout: HistoryWorkout
  prExercises: Set<string> | undefined
  trend: SessionTrend | undefined
}) {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const unitOf = useExerciseUnits()
  const groups: { exerciseId: string; name: string; sets: HistoryWorkout['workout_sets'] }[] = []
  for (const s of workout.workout_sets) {
    const last = groups.at(-1)
    if (last && last.exerciseId === s.exercise_id) last.sets.push(s)
    else groups.push({ exerciseId: s.exercise_id, name: s.exercises.name, sets: [s] })
  }
  const seconds = (new Date(workout.finished_at).getTime() - new Date(workout.started_at).getTime()) / 1000
  const date = fromISODate(workout.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  const hasPR = !!prExercises?.size
  const t = trend ?? { volumeKg: 0, previousKg: null, change: null, trend: 'first' as const }

  return (
    <li className="relative">
      <span
        aria-hidden="true"
        className={`absolute top-[26px] left-[-21px] size-3 -translate-x-1/2 rounded-full ${TREND_DOT[t.trend]} ${hasPR ? 'dot-pr' : ''}`}
        style={{ boxShadow: '0 0 0 4px var(--color-bg)' }}
      />
      <div className={`overflow-hidden rounded-3xl border bg-surface ${hasPR ? 'border-accent/40' : 'border-line'}`}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-18 w-full items-center gap-3 px-5 py-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-muted">{date}</span>
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-lg font-bold">{workout.day_name}</span>
            <span
              className={`shrink-0 text-sm font-black tabular-nums ${TREND_TEXT[t.trend]}`}
              aria-label={trendLabel(t, workout.day_name)}
            >
              {formatTrend(t)}
            </span>
          </span>
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
                {g.sets.map((s) => formatTopSet({ weight: Number(s.weight_kg), reps: s.reps }, unitOf(g.exerciseId))).join('  ·  ')}
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
      </div>
      {confirmDelete && (
        <DeleteWorkoutSheet workout={workout} date={date} hasPRs={hasPR} onClose={() => setConfirmDelete(false)} />
      )}
    </li>
  )
}

/** The info bubble on the training log: what the arrows and dots compare. */
function TrendLegend() {
  const rows: { trend: Trend; text: string; note: string }[] = [
    { trend: 'up', text: '▲ 12%', note: 'moved more than last time' },
    { trend: 'down', text: '▼ 4%', note: 'moved less than last time' },
    { trend: 'same', text: '≈ same', note: `within ${SAME_BAND * 100}%` },
    { trend: 'first', text: 'First', note: 'nothing to compare yet' },
  ]
  return (
    <>
      <p className="font-bold">You vs your last same day</p>
      <p className="mt-1 text-muted">
        Each session is compared with the last one of the same day, e.g. Chest with your previous Chest. Total weight × reps.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.trend} className="flex items-center gap-3">
            <span className={`size-3 shrink-0 rounded-full ${TREND_DOT[r.trend]}`} aria-hidden="true" />
            <span className={`w-14 shrink-0 font-black tabular-nums ${TREND_TEXT[r.trend]}`}>{r.text}</span>
            <span className="text-xs text-muted">{r.note}</span>
          </li>
        ))}
      </ul>
    </>
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

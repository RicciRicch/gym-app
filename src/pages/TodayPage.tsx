import { Link, useNavigate } from 'react-router-dom'
import { PageLoader, Spinner } from '../components/ui'
import { useProfile } from '../features/auth/useProfile'
import { useCompletedWorkouts, useOverrides } from '../features/schedule/api'
import { useActiveSplit, type SplitDay } from '../features/split/api'
import { useStartWorkout } from '../features/workout/api'
import { useWorkoutDraft } from '../features/workout/draft-store'
import { WEEKDAY_LONG, WEEKDAY_SHORT, addDays, fromISODate, resolveDay, toISODate, weekDates, weekdayOf } from '../lib/schedule'

const primaryLink =
  'inline-flex w-full items-center justify-center rounded-2xl bg-accent font-bold text-accent-ink shadow-[0_0_32px_-6px] shadow-accent/60 transition active:scale-[0.97]'

export function TodayPage() {
  const { data: profile } = useProfile()
  const today = toISODate(new Date())
  const week = weekDates(today)
  // Look one week ahead so a rest day can point at the next session.
  const rangeEnd = addDays(week[6], 7)

  const navigate = useNavigate()
  const { draft } = useWorkoutDraft()
  const start = useStartWorkout()
  const split = useActiveSplit()
  const overrides = useOverrides(week[0], rangeEnd)
  const completed = useCompletedWorkouts(week[0], week[6])

  const days: SplitDay[] = split.data?.split_days ?? []
  const planned = (date: string) => resolveDay(date, days, overrides.data ?? [])
  const doneOn = (date: string) => completed.data?.find((w) => w.date === date)

  const todayDay = planned(today)
  const doneToday = doneOn(today)
  const dateLabel = fromISODate(today).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  let nextSession: { date: string; day: SplitDay } | null = null
  for (let i = 1; i <= 7 && !nextSession; i++) {
    const date = addDays(today, i)
    const day = planned(date)
    if (day) nextSession = { date, day }
  }

  return (
    <div className="animate-fade-up pt-2">
      <p className="text-sm font-semibold tracking-widest text-accent uppercase">{dateLabel}</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight">Hey, {profile?.display_name}</h1>

      {split.isPending || overrides.isPending ? (
        <PageLoader label="Loading today" />
      ) : !split.data ? (
        <section className="mt-6 rounded-3xl border border-line bg-surface p-6">
          <h2 className="text-xl font-bold">No split yet</h2>
          <p className="mt-1 text-muted">Build your weekly split and today&apos;s workout will show up here.</p>
          <Link to="/split" className={`${primaryLink} mt-5 min-h-12`}>
            Create your split
          </Link>
        </section>
      ) : (
        <>
          <ul className="mt-5 grid grid-cols-7 gap-1.5" aria-label="This week">
            {week.map((date) => {
              const day = planned(date)
              const done = doneOn(date)
              const isToday = date === today
              return (
                <li
                  key={date}
                  aria-label={`${WEEKDAY_LONG[weekdayOf(date)]}: ${done ? 'completed' : (day?.name ?? 'rest')}`}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border py-2 ${isToday ? 'border-accent bg-accent/10' : 'border-line bg-surface'}`}
                >
                  <span className={`text-[11px] font-semibold ${isToday ? 'text-accent' : 'text-muted'}`}>{WEEKDAY_SHORT[weekdayOf(date)][0]}</span>
                  <span
                    className={`grid size-5 place-items-center rounded-full ${done ? 'bg-accent text-accent-ink' : day ? 'border-2 border-accent' : 'border-2 border-line'}`}
                  >
                    {done && (
                      <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12 5 5 9-10" />
                      </svg>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>

          {draft ? (
            <section className="mt-5 rounded-3xl border border-accent/40 bg-accent/10 p-6">
              <p className="text-sm font-semibold tracking-widest text-accent uppercase">Workout in progress</p>
              <h2 className="mt-1 text-3xl font-black tracking-tight">{draft.dayName}</h2>
              <p className="mt-1 text-muted">
                {draft.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)} sets done so far.
              </p>
              <Link to="/workout" className={`${primaryLink} mt-5 min-h-16 text-xl`}>
                Resume workout
              </Link>
            </section>
          ) : doneToday ? (
            <section className="mt-5 rounded-3xl border border-accent/40 bg-accent/10 p-6">
              <p className="text-sm font-semibold tracking-widest text-accent uppercase">Done for today</p>
              <h2 className="mt-1 text-2xl font-black">{doneToday.day_name}</h2>
              <p className="mt-1 text-muted">Workout logged. Nice work.</p>
              <Link to="/progress" className="mt-4 inline-flex min-h-11 items-center font-bold text-accent">
                See your progress →
              </Link>
            </section>
          ) : todayDay ? (
            <section className="mt-5 rounded-3xl border border-line bg-surface p-6">
              <p className="text-sm font-semibold tracking-widest text-muted uppercase">Today&apos;s workout</p>
              <h2 className="mt-1 text-3xl font-black tracking-tight">{todayDay.name}</h2>
              <ul className="mt-4 divide-y divide-line">
                {todayDay.split_day_exercises.map((e) => (
                  <li key={e.id} className="flex items-center justify-between py-2.5">
                    <span className="font-semibold">{e.exercises.name}</span>
                    <span className="text-muted tabular-nums">
                      {e.target_sets} × {e.target_reps}
                    </span>
                  </li>
                ))}
                {todayDay.split_day_exercises.length === 0 && (
                  <li className="py-2.5 text-muted">No default exercises yet. You can add them as you go.</li>
                )}
              </ul>
              <button
                disabled={start.isPending}
                onClick={() => start.mutate(todayDay, { onSuccess: () => navigate('/workout') })}
                className={`${primaryLink} mt-5 min-h-16 gap-3 text-xl disabled:opacity-80`}
              >
                {start.isPending ? (
                  <>
                    <Spinner className="size-5" /> Starting…
                  </>
                ) : (
                  'Start workout'
                )}
              </button>
              {start.isError && (
                <p role="alert" className="mt-3 text-sm text-danger">
                  Could not start the workout — check your connection and try again
                </p>
              )}
            </section>
          ) : (
            <section className="mt-5 rounded-3xl border border-line bg-surface p-6">
              <p className="text-sm font-semibold tracking-widest text-muted uppercase">Today</p>
              <h2 className="mt-1 text-3xl font-black tracking-tight">Rest day</h2>
              <p className="mt-2 text-muted">
                {nextSession
                  ? `Recover. Next up: ${nextSession.day.name} on ${WEEKDAY_LONG[weekdayOf(nextSession.date)]}.`
                  : 'No training days are scheduled. Put a day on your week to get going.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-6">
                <Link to={nextSession ? '/calendar' : '/split'} className="inline-flex min-h-11 items-center font-bold text-accent">
                  {nextSession ? 'Swap days this week →' : 'Edit your split →'}
                </Link>
                <Link to="/workout" className="inline-flex min-h-11 items-center font-bold text-muted">
                  Train anyway
                </Link>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

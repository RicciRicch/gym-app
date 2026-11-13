import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Spinner } from '../components/ui'
import { useCompletedWorkouts, useOverrides, useResetOverrides, useSwapDays } from '../features/schedule/api'
import { useActiveSplit, type SplitDay } from '../features/split/api'
import {
  WEEKDAY_SHORT,
  addDays,
  fromISODate,
  isSameWeek,
  monthGrid,
  resolveDay,
  toISODate,
  weekDates,
  weekdayOf,
  type ISODate,
} from '../lib/schedule'

type View = 'week' | 'month'

const monthTitle = (iso: ISODate) => fromISODate(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
const shortDate = (iso: ISODate) => fromISODate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export function CalendarPage() {
  const today = toISODate(new Date())
  const [view, setView] = useState<View>('week')
  const [anchor, setAnchor] = useState<ISODate>(today)
  const [swapFrom, setSwapFrom] = useState<ISODate | null>(null)
  const [selected, setSelected] = useState<ISODate>(today)

  const anchorDate = fromISODate(anchor)
  const weeks = view === 'week' ? [weekDates(anchor)] : monthGrid(anchorDate.getFullYear(), anchorDate.getMonth())
  const from = weeks[0][0]
  const to = weeks.at(-1)![6]

  const split = useActiveSplit()
  const overrides = useOverrides(from, to)
  const completed = useCompletedWorkouts(from, to)
  const swap = useSwapDays()
  const reset = useResetOverrides()

  const days: SplitDay[] = split.data?.split_days ?? []
  const overrideList = overrides.data ?? []
  const planned = (date: ISODate) => resolveDay(date, days, overrideList)
  const doneOn = (date: ISODate) => completed.data?.find((w) => w.date === date)
  const isCurrentWeek = view === 'week' && isSameWeek(anchor, today)
  const weekHasOverrides = view === 'week' && overrideList.length > 0

  function move(direction: 1 | -1) {
    setSwapFrom(null)
    if (view === 'week') setAnchor(addDays(anchor, 7 * direction))
    else setAnchor(toISODate(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + direction, 1, 12)))
  }

  function tapWeekDay(date: ISODate) {
    if (!isCurrentWeek || doneOn(date)) return
    if (swapFrom === null) return setSwapFrom(date)
    if (swapFrom !== date) swap.mutate({ a: swapFrom, b: date, days, overrides: overrideList })
    setSwapFrom(null)
  }

  if (split.isPending) {
    return (
      <div className="grid place-items-center pt-24 text-accent">
        <Spinner />
      </div>
    )
  }

  if (!split.data) {
    return (
      <div className="animate-fade-up pt-2">
        <h1 className="text-3xl font-black tracking-tight">Calendar</h1>
        <div className="mt-6 rounded-3xl border border-line bg-surface p-6">
          <p className="text-muted">Create a split to see your training days on the calendar.</p>
          <Link
            to="/split"
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-accent font-bold text-accent-ink"
          >
            Create your split
          </Link>
        </div>
      </div>
    )
  }

  const title = view === 'week' ? `${shortDate(from)} – ${shortDate(to)}` : monthTitle(anchor)

  return (
    <div className="animate-fade-up pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight">Calendar</h1>
        <div className="flex rounded-full bg-surface p-1" role="tablist" aria-label="Calendar view">
          {(['week', 'month'] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => {
                setView(v)
                setSwapFrom(null)
              }}
              className={`min-h-9 rounded-full px-4 text-sm font-bold capitalize transition ${view === v ? 'bg-accent text-accent-ink' : 'text-muted'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <NavButton label="Previous" onClick={() => move(-1)} direction="left" />
        <button
          className="min-h-11 px-3 text-center font-bold"
          onClick={() => {
            setAnchor(today)
            setSelected(today)
            setSwapFrom(null)
          }}
        >
          {title}
          {!(view === 'week' ? isCurrentWeek : monthTitle(anchor) === monthTitle(today)) && (
            <span className="block text-xs font-semibold text-accent">Back to today</span>
          )}
        </button>
        <NavButton label="Next" onClick={() => move(1)} direction="right" />
      </div>

      {view === 'week' ? (
        <>
          <ul className="mt-3 flex flex-col gap-2">
            {weeks[0].map((date) => {
              const day = planned(date)
              const done = doneOn(date)
              const picked = swapFrom === date
              const count = day?.split_day_exercises.length ?? 0
              return (
                <li key={date}>
                  <button
                    onClick={() => tapWeekDay(date)}
                    aria-pressed={isCurrentWeek ? picked : undefined}
                    className={`flex min-h-16 w-full items-center gap-4 rounded-3xl border px-4 text-left transition active:scale-[0.98] ${picked ? 'animate-pop border-accent bg-accent/10' : date === today ? 'border-muted bg-surface' : 'border-line bg-surface'}`}
                  >
                    <span className="w-10 text-center">
                      <span className="block text-xs font-semibold text-muted">{WEEKDAY_SHORT[weekdayOf(date)]}</span>
                      <span className={`block text-xl font-black ${date === today ? 'text-accent' : ''}`}>
                        {fromISODate(date).getDate()}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate font-bold ${day || done ? '' : 'text-muted/60'}`}>
                        {done?.day_name ?? day?.name ?? 'Rest'}
                      </span>
                      <span className="block text-sm text-muted">
                        {done ? 'Completed' : day ? `${count} ${count === 1 ? 'exercise' : 'exercises'}` : 'Recover'}
                        {overrideList.some((o) => o.date === date) && !done && ' · swapped'}
                      </span>
                    </span>
                    {done ? <DoneBadge /> : day && <span className="size-2.5 rounded-full bg-accent" />}
                  </button>
                </li>
              )
            })}
          </ul>

          <p className="mt-4 text-center text-sm text-muted" aria-live="polite">
            {!isCurrentWeek
              ? 'Days can be swapped in the current week only.'
              : swapFrom
                ? 'Now tap the day to swap it with.'
                : 'Tap two days to swap them for this week.'}
          </p>
          {swap.isError && (
            <p role="alert" className="mt-2 text-center text-sm text-danger">
              Could not swap the days — try again
            </p>
          )}
          {weekHasOverrides && (
            <button
              onClick={() => reset.mutate({ from, to })}
              disabled={reset.isPending}
              className="mx-auto mt-1 block min-h-11 px-4 text-sm font-semibold text-accent disabled:opacity-50"
            >
              Reset this week
            </button>
          )}
        </>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-7 text-center text-xs font-semibold text-muted">
            {WEEKDAY_SHORT.map((d) => (
              <span key={d} className="py-1">
                {d[0]}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weeks.flat().map((date) => {
              const inMonth = fromISODate(date).getMonth() === anchorDate.getMonth()
              const day = planned(date)
              const done = doneOn(date)
              return (
                <button
                  key={date}
                  onClick={() => setSelected(date)}
                  aria-label={`${shortDate(date)}: ${done ? `${done.day_name}, completed` : (day?.name ?? 'Rest')}`}
                  aria-pressed={selected === date}
                  className={`flex aspect-[4/5] min-h-11 flex-col items-center justify-center gap-1 rounded-2xl border transition active:scale-95 ${selected === date ? 'border-accent bg-accent/10' : 'border-transparent'} ${inMonth ? '' : 'opacity-30'}`}
                >
                  <span className={`text-sm font-bold ${date === today ? 'text-accent' : ''}`}>{fromISODate(date).getDate()}</span>
                  {done ? (
                    <DoneBadge small />
                  ) : (
                    <span className={`size-1.5 rounded-full ${day ? 'bg-accent' : 'bg-transparent'}`} />
                  )}
                </button>
              )
            })}
          </div>
          <SelectedDay date={selected} day={planned(selected)} doneName={doneOn(selected)?.day_name} isToday={selected === today} />
        </>
      )}
    </div>
  )
}

function SelectedDay({
  date,
  day,
  doneName,
  isToday,
}: {
  date: ISODate
  day: SplitDay | null
  doneName: string | undefined
  isToday: boolean
}) {
  const label = fromISODate(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <section className="mt-4 rounded-3xl border border-line bg-surface p-5" aria-live="polite">
      <p className="text-sm font-semibold text-muted">
        {label}
        {isToday && <span className="text-accent"> · Today</span>}
      </p>
      <h2 className="mt-0.5 text-xl font-bold">{doneName ?? day?.name ?? 'Rest day'}</h2>
      {doneName ? (
        <p className="mt-1 flex items-center gap-2 text-sm text-accent">
          <DoneBadge small /> Workout completed
        </p>
      ) : day ? (
        <ul className="mt-2 text-sm text-muted">
          {day.split_day_exercises.map((e) => (
            <li key={e.id} className="flex justify-between py-0.5">
              <span>{e.exercises.name}</span>
              <span className="tabular-nums">
                {e.target_sets} × {e.target_reps}
              </span>
            </li>
          ))}
          {day.split_day_exercises.length === 0 && <li>No exercises set for this day yet.</li>}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-muted">Nothing planned. Recover and come back stronger.</p>
      )}
    </section>
  )
}

function DoneBadge({ small }: { small?: boolean }) {
  return (
    <span className={`grid place-items-center rounded-full bg-accent text-accent-ink ${small ? 'size-4' : 'size-7'}`} aria-label="Completed">
      <svg viewBox="0 0 24 24" className={small ? 'size-2.5' : 'size-4'} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12 5 5 9-10" />
      </svg>
    </span>
  )
}

function NavButton({ label, direction, onClick }: { label: string; direction: 'left' | 'right'; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} className="grid size-11 place-items-center rounded-full bg-surface text-muted transition active:scale-90">
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={direction === 'left' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} />
      </svg>
    </button>
  )
}

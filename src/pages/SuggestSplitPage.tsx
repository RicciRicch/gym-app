import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { Sheet } from '../components/Sheet'
import { Button } from '../components/ui'
import { useLoggedSets } from '../features/progress/api'
import { useActiveSplit, useCreateSplit, useExercises } from '../features/split/api'
import type { SplitPreset } from '../features/split/presets'
import { muscleLoad } from '../lib/muscles'
import { addDays, toISODate, WEEKDAY_LONG, WEEKDAY_SHORT } from '../lib/schedule'
import { neglectedRegions, suggestSplit, type Goal, type SessionMinutes, type Suggestion } from '../lib/suggest'

const GOALS: { id: Goal; title: string; text: string }[] = [
  { id: 'strength', title: 'Get stronger', text: 'Heavy sets of 5 on the big lifts.' },
  { id: 'muscle', title: 'Build muscle', text: '8 to 12 reps, more sets.' },
  { id: 'fit', title: 'Stay fit', text: 'Moderate weights, the whole body.' },
]
const MINUTES: SessionMinutes[] = [45, 60, 90]

/** Three questions, and a split built from them that updates as you answer. */
export function SuggestSplitPage() {
  const active = useActiveSplit()
  const exercises = useExercises()
  const logged = useLoggedSets()
  const createSplit = useCreateSplit()
  const navigate = useNavigate()

  // Start from the current split's days when there is one.
  const currentDays = active.data?.mode === 'weekly' ? [...new Set(active.data.split_days.flatMap((d) => (d.weekday === null ? [] : [d.weekday])))].sort() : []
  const [weekdays, setWeekdays] = useState<number[] | null>(null)
  const days = weekdays ?? (currentDays.length > 0 && currentDays.length < 7 ? currentDays : [0, 2, 4])
  const [goal, setGoal] = useState<Goal>('muscle')
  const [minutes, setMinutes] = useState<SessionMinutes>(60)
  const [confirming, setConfirming] = useState(false)

  // Muscles left out in the last 30 days get first pick.
  const neglected = useMemo(() => {
    if (!logged.data || !exercises.data) return []
    const today = toISODate(new Date())
    const from = addDays(today, -29)
    const recent = logged.data.filter((s) => s.date >= from)
    const load = muscleLoad(recent, new Map(exercises.data.map((e) => [e.id, e.muscles])), from, today)
    return neglectedRegions(load, new Set(recent.map((s) => s.workoutId)).size)
  }, [logged.data, exercises.data])

  const suggestion = days.length > 0 ? suggestSplit({ weekdays: days, goal, minutes, neglected }) : null
  const names = useMemo(() => new Map((exercises.data ?? []).filter((e) => e.user_id === null && e.slug).map((e) => [e.slug!, e.name])), [exercises.data])

  function toggleDay(day: number) {
    setWeekdays(days.includes(day) ? days.filter((d) => d !== day) : days.length >= 6 ? days : [...days, day].sort())
  }

  function use() {
    if (!suggestion) return
    const preset: SplitPreset = {
      key: `suggested-${suggestion.layout}`,
      name: suggestion.name,
      tagline: '',
      days: suggestion.days.map((d) => ({ name: d.name, weekday: d.weekday, exercises: d.exercises.map(({ slug, sets, reps }) => ({ slug, sets, reps })) })),
    }
    createSplit.mutate({ preset }, { onSuccess: () => navigate('/split', { replace: true }) })
  }

  return (
    <div className="animate-fade-up pb-28">
      <Link to="/split" className="-ml-1 inline-flex min-h-11 items-center gap-1 pt-2 font-semibold text-muted">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m15 6-6 6 6 6" />
        </svg>
        Split
      </Link>
      <h1 className="text-3xl font-black tracking-tight">Build my split</h1>
      <p className="mt-1 text-muted">Answer three questions. The split below follows your answers.</p>

      <Question title="Which days can you train?" hint={days.length >= 6 ? 'Six is the most: keep one day to rest.' : 'Tap the days that work for you.'}>
        <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Training days">
          {WEEKDAY_SHORT.map((label, day) => {
            const on = days.includes(day)
            return (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                aria-label={WEEKDAY_LONG[day]}
                onClick={() => toggleDay(day)}
                className={`flex h-14 flex-col items-center justify-center rounded-2xl text-sm font-bold transition active:scale-95 ${on ? 'bg-accent text-accent-ink' : 'bg-surface text-muted'}`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </Question>

      <Question title="What is the goal?">
        <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Goal">
          {GOALS.map((g) => (
            <button
              key={g.id}
              type="button"
              role="radio"
              aria-checked={goal === g.id}
              onClick={() => setGoal(g.id)}
              className={`flex min-h-14 items-center gap-3 rounded-2xl px-4 text-left transition active:scale-[0.98] ${goal === g.id ? 'bg-surface-2' : 'bg-surface'}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{g.title}</span>
                <span className="block text-sm text-muted">{g.text}</span>
              </span>
              <span className={`grid size-6 shrink-0 place-items-center rounded-full ${goal === g.id ? 'bg-accent' : 'bg-surface-2'}`} aria-hidden="true">
                {goal === g.id && <span className="size-2.5 rounded-full bg-accent-ink" />}
              </span>
            </button>
          ))}
        </div>
      </Question>

      <Question title="How long can a workout take?">
        <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-surface p-1" role="radiogroup" aria-label="Workout length">
          {MINUTES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={minutes === m}
              onClick={() => setMinutes(m)}
              className={`min-h-11 rounded-xl text-sm font-bold transition ${minutes === m ? 'bg-accent text-accent-ink' : 'text-muted'}`}
            >
              {m} min
            </button>
          ))}
        </div>
      </Question>

      {suggestion ? (
        <SuggestionView suggestion={suggestion} names={names} />
      ) : (
        <p className="mt-10 text-center text-muted">Pick at least one day.</p>
      )}

      {createSplit.isError && (
        <p role="alert" className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
          Could not create the split. Try again.
        </p>
      )}

      {/* Portalled: the page wrapper's transform would trap a fixed element. */}
      {createPortal(
      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-md px-5">
        <Button
          className="w-full shadow-[0_10px_30px_-10px_rgb(0_0_0/0.9)]"
          disabled={!suggestion || active.isPending}
          loading={createSplit.isPending && !confirming}
          onClick={() => (active.data ? setConfirming(true) : use())}
        >
          Use this split
        </Button>
      </div>,
      document.body,
      )}

      {confirming && (
        <Sheet title="Replace your split?" onClose={createSplit.isPending ? () => {} : () => setConfirming(false)}>
          <p className="text-muted">
            Your current split ({active.data?.name}) is put aside and this one takes its place. Your workout history stays.
          </p>
          <div className="mt-5 flex flex-col gap-2 pb-2">
            <Button className="w-full" loading={createSplit.isPending} onClick={use}>
              Replace
            </Button>
            <Button variant="ghost" className="w-full" disabled={createSplit.isPending} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  )
}

function Question({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2.5 font-bold">{title}</h2>
      {children}
      {hint && <p className="mt-2 text-sm text-muted">{hint}</p>}
    </section>
  )
}

function SuggestionView({ suggestion, names }: { suggestion: Suggestion; names: ReadonlyMap<string, string> }) {
  return (
    <section className="mt-10" aria-live="polite">
      <p className="text-sm font-semibold tracking-widest text-muted uppercase">Your split</p>
      <h2 className="mt-1 text-2xl font-black tracking-tight">{suggestion.name}</h2>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {WEEKDAY_SHORT.map((label, weekday) => {
          const day = suggestion.days.find((d) => d.weekday === weekday)
          return (
            <div key={label} className="text-center">
              <div className="text-[10px] font-semibold text-muted">{label[0]}</div>
              <div
                className={`mt-1 h-7 truncate rounded-lg px-0.5 text-[10px] leading-7 font-bold ${day ? 'bg-accent/15 text-accent' : 'bg-surface text-muted/50'}`}
              >
                {day ? shortName(day.name) : '·'}
              </div>
            </div>
          )
        })}
      </div>

      <ul className="mt-5 flex flex-col gap-2.5">
        {suggestion.reasons.map((reason) => (
          <li key={reason} className="flex gap-3 text-sm text-muted">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            {reason}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-3">
        {suggestion.days.map((day) => (
          <article key={day.weekday} className="rounded-3xl bg-surface p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-bold">{day.name}</h3>
              <span className="text-sm text-muted">{WEEKDAY_LONG[day.weekday]}</span>
            </div>
            <ol className="mt-2 flex flex-col">
              {day.exercises.map((e) => (
                <li key={e.slug} className="flex min-h-9 items-center justify-between gap-3 text-sm">
                  <span className="truncate">{names.get(e.slug) ?? e.slug}</span>
                  <span className="shrink-0 font-semibold text-muted tabular-nums">
                    {e.sets} × {e.reps}
                  </span>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold tracking-widest text-muted uppercase">Sets per week</h3>
        <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5">
          {suggestion.volume.map((v) => (
            <li key={v.group} className="flex items-baseline justify-between text-sm">
              <span className="font-semibold">{v.group}</span>
              <span className="text-muted tabular-nums">
                {v.sets} sets · {v.days}x
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">You can change any exercise, set or day afterwards in the split editor.</p>
      </div>
    </section>
  )
}

/** Fits a day name into the week strip ("Upper A" -> "Up A"). */
function shortName(name: string): string {
  return name.replace(/^Full Body /, 'FB ').replace(/^Upper/, 'Up').replace(/^Lower/, 'Lo').slice(0, 5)
}

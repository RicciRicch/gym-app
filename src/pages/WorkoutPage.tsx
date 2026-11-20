import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, PageLoader, Spinner } from '../components/ui'
import { Sheet } from '../components/Sheet'
import { useLoggedSets } from '../features/progress/api'
import { usePlan, weeklyTarget } from '../features/schedule/plan'
import { useStreakFreezes, useWorkoutDates } from '../features/streak/api'
import { useActiveSplit, type SplitDay } from '../features/split/api'
import { ExercisePicker } from '../features/split/SplitEditor'
import { useExercises } from '../features/split/api'
import { buildDraftExercise, useFinishWorkout, useStartWorkout, useUpdateDayDefault } from '../features/workout/api'
import { savePartnerIds, saveRestSeconds, usePartnerIds, useRestSeconds, useWorkoutDraft } from '../features/workout/draft-store'
import { PartnerChip, PartnerPicker, TrainedWith } from '../features/friends/Partners'
import { RestPicker } from '../features/workout/RestPicker'
import { CoachTip } from '../features/workout/CoachTip'
import { FuelCheck } from '../features/fuel/FuelCheck'
import { ProofCamera } from '../features/feed/ProofCamera'
import { useFriends } from '../features/friends/api'
import { useProfile } from '../features/auth/useProfile'
import { RestTimer } from '../features/workout/RestTimer'
import { voiceSupported } from '../features/workout/voice'
import { VoiceSheet } from '../features/workout/VoiceSheet'
import { WorkoutSummaryScreen, type StreakChange } from '../features/workout/WorkoutSummaryScreen'
import { useNow } from '../features/workout/useNow'
import {
  coachTip,
  formatPastSet,
  ghostScore,
  ghostVerdict,
  lastSessionSets,
  type GhostVerdict,
  type PastSet,
} from '../lib/coach'
import { toISODate } from '../lib/schedule'
import { weeklyStreak } from '../lib/streak'
import { summarizeWorkout, type WorkoutSummary } from '../lib/summary'
import type { SpokenSet } from '../lib/voice-set'
import {
  formatRest,
  exercisesDiffer,
  formatClock,
  isLoggable,
  parseReps,
  parseWeight,
  REST_OFF,
  restEnd,
  toSetRows,
  type DraftExercise,
  type DraftSet,
  type WorkoutDraft,
} from '../lib/workout'

type SheetState = 'add-exercise' | 'rest' | 'partners' | 'discard' | 'finish-empty' | null
type DefaultPrompt = { day: SplitDay; exercises: DraftExercise[] }

export function WorkoutPage() {
  const { draft, setDraft } = useWorkoutDraft()
  const split = useActiveSplit()
  const navigate = useNavigate()
  const [sheet, setSheet] = useState<SheetState>(null)
  const [askDefault, setAskDefault] = useState<DefaultPrompt | null>(null)
  const [voiceFor, setVoiceFor] = useState<string | null>(null)
  const [canUseVoice] = useState(voiceSupported)
  const [finished, setFinished] = useState<{
    workoutId: string
    partnerIds: string[]
    summary: WorkoutSummary
    streak: StreakChange | null
    askDefault: DefaultPrompt | null
  } | null>(null)
  // Loaded while training so the summary can tell PRs and the streak right at the finish.
  const history = useLoggedSets()
  const workoutDates = useWorkoutDates()
  const freezes = useStreakFreezes()
  // Each exercise's previous session: the "ghost" to beat and what the coach's tip is based on.
  const lastSessions = useMemo(() => {
    const map = new Map<string, PastSet[]>()
    const sets = history.data ?? []
    for (const id of new Set(sets.map((s) => s.exerciseId))) map.set(id, lastSessionSets(sets, id))
    return map
  }, [history.data])
  const [tipsApplied, setTipsApplied] = useState<ReadonlySet<string>>(new Set())
  const finish = useFinishWorkout()
  const updateDefault = useUpdateDayDefault()
  const { data: library } = useExercises()
  // The photo step only makes sense with someone to show it to.
  const hasFriends = useFriends().data?.some((f) => f.status === 'accepted') ?? false
  const [proof, setProof] = useState(false)
  // Privacy setting: the photo step can be switched off.
  const askProof = useProfile().data?.ask_proof ?? true

  const clearRest = useCallback(() => setDraft((d) => ({ ...d, restEndsAt: null })), [setDraft])

  if (finished && proof) {
    return (
      <ProofCamera
        workoutId={finished.workoutId}
        summary={finished.summary}
        onDone={() => {
          if (finished.askDefault) setAskDefault(finished.askDefault)
          else navigate('/', { replace: true })
          setFinished(null)
          setProof(false)
        }}
      />
    )
  }

  if (finished) {
    return (
      <WorkoutSummaryScreen
        summary={finished.summary}
        streak={finished.streak}
        extra={(style) => (
          <>
            <TrainedWith ids={finished.partnerIds} className="rise-in mt-3 w-full" style={style} />
            <FuelCheck workoutId={finished.workoutId} className="rise-in mt-3 w-full" style={style} />
          </>
        )}
        onDone={() => {
          if (hasFriends && askProof) return setProof(true)
          if (finished.askDefault) setAskDefault(finished.askDefault)
          else navigate('/', { replace: true })
          setFinished(null)
        }}
      />
    )
  }

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
      restEndsAt: restEnd(d.restSeconds, Date.now()),
      exercises: d.exercises.map((e, i) =>
        i === exerciseIndex ? { ...e, sets: e.sets.map((s, j) => (j === setIndex ? { ...s, done: true } : s)) } : e,
      ),
    }))
  }

  /** Writes the coach's suggestion into the sets that are not done yet. */
  function applyTip(exerciseIndex: number, exerciseId: string, target: PastSet) {
    updateExercise(exerciseIndex, (e) => ({
      ...e,
      sets: e.sets.map((s) => (s.done ? s : { ...s, weight: target.weight === 0 ? '' : String(target.weight), reps: String(target.reps) })),
    }))
    setTipsApplied((applied) => new Set(applied).add(exerciseId))
  }

  /** The set a spoken set goes into: the first one not done yet, or a new one after the last. */
  const voiceTarget = (exercise: DraftExercise) => {
    const index = exercise.sets.findIndex((s) => !s.done)
    return index === -1 ? exercise.sets.length : index
  }

  /** Fills and completes the next set of an exercise from a spoken set; returns how it reads. */
  function logSpokenSet(exerciseId: string, spoken: SpokenSet & { reps: number }): string {
    const exercise = draft!.exercises.find((e) => e.exerciseId === exerciseId)
    if (!exercise) return ''
    const index = voiceTarget(exercise)
    const base = exercise.sets[index] ?? { weight: exercise.sets.at(-1)?.weight ?? '', reps: '', done: false }
    const weight = spoken.weight === null ? base.weight : spoken.weight === 0 ? '' : String(spoken.weight)
    const filled: DraftSet = { weight, reps: String(spoken.reps), done: true }
    update((d) => ({
      ...d,
      restEndsAt: restEnd(d.restSeconds, Date.now()),
      exercises: d.exercises.map((e) => {
        if (e.exerciseId !== exerciseId) return e
        const sets = [...e.sets]
        sets[index] = filled
        return { ...e, sets }
      }),
    }))
    return `${weight === '' ? 'Bodyweight' : `${weight.replace('.', ',')} kg`} × ${spoken.reps}`
  }

  async function finishWorkout() {
    const current = draft!
    if (toSetRows(current).length === 0) return setSheet('finish-empty')
    // Snapshot what was known before this workout: PRs and the streak are measured against it.
    const setsBefore = history.data
    const datesBefore = workoutDates.data
    let workoutId: string
    try {
      workoutId = await finish.mutateAsync(current)
    } catch {
      return // the error is shown next to the button; the draft stays
    }
    const day = split.data?.split_days.find((d) => d.id === current.splitDayId)
    const changed = day && exercisesDiffer(current, day.split_day_exercises.map((e) => e.exercise_id))
    const today = toISODate(new Date())
    const target = weeklyTarget(split.data)
    setFinished({
      workoutId,
      partnerIds: current.partnerIds ?? [],
      summary: summarizeWorkout(current, new Date().toISOString(), setsBefore),
      streak: datesBefore
        ? {
            before: weeklyStreak(datesBefore, target, today, freezes.data ?? []),
            after: weeklyStreak([...datesBefore, current.date], target, today, freezes.data ?? []),
          }
        : null,
      askDefault: day && changed && current.exercises.length > 0 ? { day, exercises: current.exercises } : null,
    })
    setDraft(null)
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

      <div className="mt-3 flex items-center justify-between gap-2 text-sm">
        <span className="shrink-0 text-muted">
          {doneSets} / {totalSets} sets done
        </span>
        <PartnerChip ids={draft.partnerIds ?? []} onClick={() => setSheet('partners')} className="ml-auto" />
        <button onClick={() => setSheet('rest')} className="min-h-11 shrink-0 rounded-full bg-surface px-4 font-semibold">
          Rest {formatRest(draft.restSeconds)}
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {draft.exercises.map((exercise, exerciseIndex) => {
          const ghost = lastSessions.get(exercise.exerciseId) ?? []
          const doneSets = exercise.sets.map((s) =>
            s.done && isLoggable(s) ? { weight: parseWeight(s.weight)!, reps: parseReps(s.reps)! } : null,
          )
          const anyDone = doneSets.some(Boolean)
          const score = ghostScore(doneSets, ghost)
          // Until the first set is done (or the tip is applied) the coach says what to aim for.
          const tip = history.data && !anyDone && !tipsApplied.has(exercise.exerciseId) ? coachTip(ghost) : null
          return (
          <article key={exercise.exerciseId} className="rounded-3xl border border-line bg-surface px-4 pt-3 pb-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="min-w-0 flex-1 truncate text-lg font-bold">{exercise.name}</h2>
              {canUseVoice && (
                <button
                  onClick={() => setVoiceFor(exercise.exerciseId)}
                  aria-label={`Say the next ${exercise.name} set`}
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-accent/10 text-accent active:scale-90"
                >
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="3" width="6" height="11" rx="3" />
                    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                  </svg>
                </button>
              )}
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

            {tip && (
              <CoachTip tip={tip} onApply={tip.apply ? () => applyTip(exerciseIndex, exercise.exerciseId, tip.apply!) : null} />
            )}
            {anyDone && ghost.length > 0 && (
              <p className="mb-2 flex items-center gap-2 text-sm font-bold" aria-label={`You ${score.you}, last time ${score.ghost}`}>
                <span className={score.you >= score.ghost ? 'text-accent' : ''}>You {score.you}</span>
                <span className="text-muted">:</span>
                <span className={score.ghost > score.you ? 'text-danger' : 'text-muted'}>{score.ghost} 👻 last time</span>
              </p>
            )}

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
                  ghost={ghost[setIndex]}
                  verdict={doneSets[setIndex] && ghost[setIndex] ? ghostVerdict(doneSets[setIndex], ghost[setIndex]) : null}
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
          )
        })}

        {draft.exercises.length === 0 && (
          <p className="rounded-3xl border border-dashed border-line p-6 text-center text-muted">No exercises yet. Add the first one.</p>
        )}

        <Button variant="secondary" onClick={() => setSheet('add-exercise')}>
          + Add exercise
        </Button>
      </div>

      {finish.isError && (
        <p role="alert" className="mt-4 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {navigator.onLine
            ? 'Could not save the workout — check your connection and try again. Nothing is lost.'
            : 'You are offline. Your workout is safe on this phone — tap Finish again when you are back online.'}
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

      {(() => {
        const exercise = voiceFor ? draft.exercises.find((e) => e.exerciseId === voiceFor) : undefined
        return (
          exercise && (
            <VoiceSheet
              key={exercise.exerciseId}
              exerciseName={exercise.name}
              setNumber={voiceTarget(exercise) + 1}
              onLog={(spoken) => logSpokenSet(exercise.exerciseId, spoken)}
              onClose={() => setVoiceFor(null)}
            />
          )
        )
      })()}

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
        <Sheet title="Rest timer" onClose={() => setSheet(null)}>
          <RestPicker
            value={draft.restSeconds}
            onChange={(seconds) => {
              saveRestSeconds(seconds)
              update((d) => ({ ...d, restSeconds: seconds, restEndsAt: seconds === REST_OFF ? null : d.restEndsAt }))
            }}
          />
          <Button className="mt-5 mb-2 w-full" onClick={() => setSheet(null)}>
            Done
          </Button>
        </Sheet>
      )}

      {sheet === 'partners' && (
        <Sheet title="Who trains with you?" onClose={() => setSheet(null)}>
          <PartnerPicker value={draft.partnerIds ?? []} onChange={(ids) => update((d) => ({ ...d, partnerIds: ids }))} />
          <Button className="mt-5 mb-2 w-full" onClick={() => setSheet(null)}>
            Done
          </Button>
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
  ghost,
  verdict,
  onChange,
  onToggle,
}: {
  number: number
  set: DraftSet
  exerciseName: string
  /** The same set in the previous session of this exercise. */
  ghost?: PastSet
  verdict: GhostVerdict | null
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
      {ghost && (
        <p className="col-span-4 -mt-1 flex items-center justify-between pr-1 pl-10 text-xs font-semibold text-muted">
          <span>👻 {formatPastSet(ghost)}</span>
          {verdict && (
            <span className={verdict === 'ahead' ? 'text-accent' : verdict === 'behind' ? 'text-danger' : ''}>
              {verdict === 'ahead' ? '▲ beat it' : verdict === 'even' ? '= matched' : '▼ ghost wins'}
            </span>
          )}
        </p>
      )}
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
  const today = toISODate(new Date())
  const { isPending, plan } = usePlan(today, today)
  const start = useStartWorkout()
  const navigate = useNavigate()
  const restSeconds = useRestSeconds()
  const partnerIds = usePartnerIds()

  if (isPending) {
    return (
      <PageLoader label="Loading your workout" />
    )
  }

  const days = plan?.days ?? []
  const rotating = plan?.mode === 'rotating'
  // Rotating: the cycle's next day is offered first, even on a rest day.
  const planned = rotating ? (plan?.next?.day ?? null) : (plan?.planned(today) ?? null)
  const plannedLabel = rotating ? 'next in your cycle' : 'planned today'
  const intro = rotating
    ? `Next in your cycle: ${planned?.name}.${plan?.next && plan.next.date > today ? ' Today is a rest day, but you can train anyway.' : ''}`
    : planned
      ? `Today is ${planned.name}.`
      : 'Today is a rest day, but you can train anyway.'

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
          <p className="mt-1 text-muted">{intro}</p>
          <RestPicker className="mt-4 rounded-3xl border border-line bg-surface p-4" value={restSeconds} onChange={saveRestSeconds} />
          <PartnerPicker className="mt-2 rounded-3xl border border-line bg-surface p-4" value={partnerIds} onChange={savePartnerIds} />
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
                      {day.split_day_exercises.length} exercises{day.id === planned?.id && ` · ${plannedLabel}`}
                    </span>
                  </span>
                  <span className="font-bold text-accent">
                    {start.isPending && start.variables?.id === day.id ? <Spinner className="size-5" /> : 'Start'}
                  </span>
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

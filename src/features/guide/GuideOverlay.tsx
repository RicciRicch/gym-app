import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ExerciseImage, Mascot } from '../../components/ExerciseImage'
import { Button } from '../../components/ui'

interface Step {
  title: string
  body: string
  art: ReactNode
  tip?: string
}

const STEPS: Step[] = [
  {
    title: 'Welcome to Gym App',
    body: 'Plan your week, log every set and watch your lifts go up. Here is how it works in four quick steps.',
    art: <Mascot className="h-52" />,
  },
  {
    title: '1. Pick your split',
    body: 'Open Split and start from a preset (Push/Pull/Legs, Upper/Lower, Full Body, Bro Split) or build your own. Choose which weekday each day lands on and set default sets × reps.',
    art: <ExerciseImage imageKey="bench-press" name="Bench press" className="size-44 rounded-3xl" />,
    tip: 'Empty weekdays are rest days.',
  },
  {
    title: '2. Train from Today',
    body: 'Today shows what is scheduled. Tap Start workout: weights are prefilled from last time. Enter reps × weight and tap the check to mark a set done.',
    art: <ExerciseImage imageKey="squat" name="Squat" className="size-44 rounded-3xl" />,
    tip: 'The rest timer starts by itself after each set.',
  },
  {
    title: '3. Plan the week',
    body: 'Calendar shows your week and month with finished workouts marked. Need to move a day? Swap two days for this week only; your split stays the same.',
    art: <ExerciseImage imageKey="lat-pulldown" name="Lat pulldown" className="size-44 rounded-3xl" />,
  },
  {
    title: '4. Track progress',
    body: 'Progress lists every workout and charts your top set per exercise, with PR badges when you beat your best. Library has form cues for each lift.',
    art: <ExerciseImage imageKey="overhead-press" name="Overhead press" className="size-44 rounded-3xl" />,
    tip: 'You can reopen this guide from your profile.',
  },
]

export function GuideOverlay({ onClose, hasSplit }: { onClose: () => void; hasSplit: boolean }) {
  const [index, setIndex] = useState(0)
  const navigate = useNavigate()
  const step = STEPS[index]
  const last = index === STEPS.length - 1

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, STEPS.length - 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function finish() {
    onClose()
    if (!hasSplit) navigate('/split')
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-title"
      className="fixed inset-0 z-50 flex flex-col bg-bg/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted tabular-nums">
            {index + 1} / {STEPS.length}
          </span>
          {!last && (
            <button onClick={onClose} className="-mr-3 min-h-11 px-3 font-semibold text-muted">
              Skip
            </button>
          )}
        </div>

        <div key={index} className="flex flex-1 animate-fade-up flex-col items-center justify-center text-center">
          <div className="grid place-items-center">{step.art}</div>
          <h2 id="guide-title" className="mt-8 text-3xl leading-tight font-black tracking-tight">
            {step.title}
          </h2>
          <p className="mt-3 text-muted">{step.body}</p>
          {step.tip && (
            <p className="mt-4 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent">
              {step.tip}
            </p>
          )}
        </div>

        <div className="flex justify-center gap-2 pb-6" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-accent' : 'w-2 bg-line'}`} />
          ))}
        </div>

        <div className="flex gap-3">
          {index > 0 && (
            <Button variant="secondary" className="flex-1" onClick={() => setIndex(index - 1)}>
              Back
            </Button>
          )}
          <Button className="flex-[2]" onClick={() => (last ? finish() : setIndex(index + 1))}>
            {last ? (hasSplit ? "Let's train" : 'Set up my split') : 'Next'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

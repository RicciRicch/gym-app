import { useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Confetti } from '../../components/Confetti'
import { Mascot } from '../../components/ExerciseImage'
import { Button } from '../../components/ui'
import { prefersReducedMotion } from '../../lib/motion'
import { formatTopSet } from '../../lib/progress'
import type { Streak } from '../../lib/streak'
import { formatPrGain, type WorkoutSummary } from '../../lib/summary'
import { formatClock } from '../../lib/workout'
import { StreakCard } from '../streak/StreakCard'

export interface StreakChange {
  before: Streak
  after: Streak
}

const delay = (seconds: number): CSSProperties => ({ animationDelay: `${seconds}s` })
const wholeNumber = (n: number) => Math.round(n).toLocaleString('en-GB')

/** Counts up from zero to `value` once, after `delayMs`. */
function CountUp({ value, delayMs = 0, format = wholeNumber }: { value: number; delayMs?: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0))
  useEffect(() => {
    if (prefersReducedMotion()) return
    const start = performance.now() + delayMs
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / 1100))
      setShown(value * (1 - (1 - t) ** 3))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, delayMs])
  return <>{format(shown)}</>
}

/**
 * Full-screen celebration after a workout is saved: totals, the streak, and a
 * big moment (confetti, sunburst, "NEW PR" stamp, vibration) when records fell.
 */
export function WorkoutSummaryScreen({
  summary,
  streak,
  onDone,
}: {
  summary: WorkoutSummary
  streak: StreakChange | null
  onDone: () => void
}) {
  const prCount = summary.prs.length
  const hasPr = prCount > 0
  const streakUp = !!streak && streak.after.weeks > streak.before.weeks

  useEffect(() => {
    try {
      navigator.vibrate?.(hasPr ? [70, 50, 70, 50, 260] : 70)
    } catch {
      /* vibration is a bonus */
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [hasPr])

  // Stagger: hero, headline, PR cards, then stats and streak.
  const afterPrs = hasPr ? 1 + prCount * 0.15 : 0.5

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-title"
      className="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto bg-bg"
    >
      <Confetti power={hasPr ? 'big' : 'small'} />
      {hasPr && <span aria-hidden="true" className="impact-flash pointer-events-none fixed inset-0 z-[65] bg-white" style={delay(0.45)} />}

      <div
        className={`mx-auto flex min-h-full w-full max-w-md flex-col items-center px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-32 text-center ${hasPr ? 'screen-shake' : ''}`}
        style={delay(0.45)}
      >
        <div className="relative grid h-60 w-full place-items-center">
          {/* Centred with margins, not a transform: the animation owns the transform. */}
          <span
            aria-hidden="true"
            className={`sunburst pointer-events-none absolute top-1/2 left-1/2 -mt-[15rem] -ml-[15rem] size-[30rem] rounded-full ${hasPr ? '' : 'opacity-50'}`}
          />
          {hasPr && (
            <span className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
              <span className="shockwave col-start-1 row-start-1 size-40 rounded-full border-4 border-accent" style={delay(0.45)} />
              <span className="shockwave col-start-1 row-start-1 size-40 rounded-full border-2 border-white" style={delay(0.65)} />
            </span>
          )}
          <span className="pop-in relative" style={delay(0.05)}>
            <span className={hasPr ? 'celebrate-bounce block' : 'block'}>
              <Mascot className="h-48" />
            </span>
          </span>
        </div>

        {hasPr ? (
          <>
            <h1 id="summary-title" className="pr-stamp mt-2 text-6xl font-black tracking-tighter text-accent italic" style={delay(0.15)}>
              {prCount > 1 ? `${prCount} NEW PRs!` : 'NEW PR!'}
            </h1>
            <p className="rise-in mt-4 text-lg font-bold" style={delay(0.75)}>
              {prCount > 1 ? `${prCount} records fell today.` : 'You just beat your best.'}
            </p>
            <p className="rise-in text-muted" style={delay(0.85)}>
              {summary.dayName} is in the books.
            </p>
          </>
        ) : (
          <>
            <h1 id="summary-title" className="pop-in mt-2 text-4xl font-black tracking-tight" style={delay(0.2)}>
              Workout done!
            </h1>
            <p className="rise-in mt-2 text-balance text-muted" style={delay(0.4)}>
              {summary.dayName} is in the books. Showing up is how records fall.
            </p>
          </>
        )}

        {hasPr && (
          <ul className="mt-6 flex w-full flex-col gap-3">
            {summary.prs.map((pr, i) => (
              <li
                key={pr.exerciseId}
                className="rise-in shine flex items-center gap-3 rounded-3xl border border-accent/50 bg-accent/10 p-4 text-left shadow-[0_0_32px_-12px] shadow-accent"
                style={delay(1 + i * 0.15)}
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-accent-ink">
                  <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 20h8M9 18h6" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{pr.name}</span>
                  <span className="block text-2xl leading-tight font-black tabular-nums">{formatTopSet(pr.top)}</span>
                  <span className="block truncate text-sm text-muted">Was {formatTopSet(pr.previous)}</span>
                </span>
                <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-sm font-black text-accent-ink">{formatPrGain(pr)}</span>
              </li>
            ))}
          </ul>
        )}

        <dl className="mt-6 grid w-full grid-cols-2 gap-3 text-left">
          {[
            { label: 'Time', value: summary.durationSeconds, format: formatClock, unit: '' },
            { label: 'Volume', value: summary.volumeKg, format: wholeNumber, unit: ' kg' },
            { label: 'Sets', value: summary.sets, format: wholeNumber, unit: '' },
            { label: 'Exercises', value: summary.exercises, format: wholeNumber, unit: '' },
          ].map((stat, i) => (
            <div key={stat.label} className="rise-in rounded-3xl border border-line bg-surface px-4 py-3" style={delay(afterPrs + i * 0.08)}>
              <dt className="text-sm font-semibold text-muted">{stat.label}</dt>
              <dd className="text-2xl font-black tabular-nums">
                <CountUp value={stat.value} delayMs={(afterPrs + i * 0.08) * 1000} format={stat.format} />
                {stat.unit && <span className="text-base font-bold text-muted">{stat.unit}</span>}
              </dd>
            </div>
          ))}
        </dl>

        {streak && (
          <div className="rise-in mt-3 w-full" style={delay(afterPrs + 0.4)}>
            <StreakCard streak={streak.after} />
            {streakUp && (
              <p className="pop-in mt-3 font-bold text-balance text-orange-400" style={delay(afterPrs + 0.8)}>
                Week complete. Your streak just grew to {streak.after.weeks} {streak.after.weeks === 1 ? 'week' : 'weeks'}!
              </p>
            )}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-[70] bg-gradient-to-t from-bg via-bg/95 to-transparent px-6 pt-10 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <Button className="mx-auto flex min-h-14 w-full max-w-md text-lg" onClick={onDone}>
          {hasPr ? 'Let’s go!' : 'Done'}
        </Button>
      </div>
    </div>,
    document.body,
  )
}

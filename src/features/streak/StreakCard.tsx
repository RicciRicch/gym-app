import type { ReactNode } from 'react'
import { Flame } from '../../components/Flame'
import { streakDetail, streakHeadline, type Streak } from '../../lib/streak'

/**
 * The burning flame with the weekly streak and this week's progress.
 * `card` is a framed tile (workout summary); `bare` sits straight on the page
 * background, lit only by the flame's own glow (Today, under the week strip).
 */
export function StreakCard({
  streak,
  action,
  variant = 'card',
  className = '',
}: {
  streak: Streak
  action?: ReactNode
  variant?: 'card' | 'bare'
  className?: string
}) {
  const bare = variant === 'bare'
  const lit = streak.frozen || streak.level > 0
  const tone = bare
    ? 'px-1'
    : `rounded-3xl border px-4 py-3 ${
        streak.frozen
          ? 'border-sky-400/40 bg-gradient-to-r from-sky-400/15 to-surface'
          : streak.level > 0
            ? 'border-orange-500/30 bg-gradient-to-r from-orange-500/15 to-surface'
            : 'border-line bg-surface'
      }`
  const color = streak.frozen ? 'text-sky-300' : 'text-orange-400'

  return (
    <section aria-label="Streak" className={`relative isolate flex items-center gap-4 ${tone} ${className}`}>
      {bare && lit && (
        // The flame lights the page around it: a soft pool of light with no edges.
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 -left-10 -z-10 h-28 w-64 -translate-y-1/2 rounded-full blur-3xl ${
            streak.frozen ? 'bg-sky-400/20' : 'bg-orange-500/20'
          }`}
        />
      )}
      <Flame level={streak.level} frozen={streak.frozen} className="h-14" />
      <div className="min-w-0 flex-1 text-left">
        <p className="text-xl leading-tight font-black tracking-tight">
          {streak.weeks > 0 ? (
            <>
              <span className={`text-3xl tabular-nums ${color}`}>{streak.weeks}</span> week streak
            </>
          ) : (
            streakHeadline(streak)
          )}
        </p>
        <p className="mt-0.5 text-sm text-muted">{streakDetail(streak)}</p>
        <div className={`mt-2 flex ${bare ? 'gap-1.5' : 'gap-1'}`} aria-hidden="true">
          {Array.from({ length: streak.target }, (_, i) => (
            <span
              key={i}
              className={`flex-1 rounded-full ${bare ? 'h-1' : 'h-1.5'} ${
                i < streak.thisWeek ? (streak.frozen ? 'bg-sky-300' : 'bg-orange-400') : bare ? 'bg-line/70' : 'bg-line'
              }`}
            />
          ))}
        </div>
      </div>
      {action}
    </section>
  )
}

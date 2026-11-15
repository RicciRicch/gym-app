import type { ReactNode } from 'react'
import { Flame } from '../../components/Flame'
import { streakDetail, streakHeadline, type Streak } from '../../lib/streak'

/** The burning flame with the weekly streak and this week's progress. */
export function StreakCard({ streak, action, className = '' }: { streak: Streak; action?: ReactNode; className?: string }) {
  const tone = streak.frozen
    ? 'border-sky-400/40 bg-gradient-to-r from-sky-400/15 to-surface'
    : streak.level > 0
      ? 'border-orange-500/30 bg-gradient-to-r from-orange-500/15 to-surface'
      : 'border-line bg-surface'
  return (
    <section aria-label="Streak" className={`flex items-center gap-4 rounded-3xl border px-4 py-3 ${tone} ${className}`}>
      <Flame level={streak.level} frozen={streak.frozen} className="h-14" />
      <div className="min-w-0 flex-1 text-left">
        <p className="text-xl leading-tight font-black tracking-tight">
          {streak.weeks > 0 ? (
            <>
              <span className={`text-3xl tabular-nums ${streak.frozen ? 'text-sky-300' : 'text-orange-400'}`}>{streak.weeks}</span> week streak
            </>
          ) : (
            streakHeadline(streak)
          )}
        </p>
        <p className="mt-0.5 text-sm text-muted">{streakDetail(streak)}</p>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {Array.from({ length: streak.target }, (_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i < streak.thisWeek ? (streak.frozen ? 'bg-sky-300' : 'bg-orange-400') : 'bg-line'}`} />
          ))}
        </div>
      </div>
      {action}
    </section>
  )
}

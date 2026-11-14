import { Flame } from '../../components/Flame'
import { streakDetail, streakHeadline, type Streak } from '../../lib/streak'

/** The burning flame with the weekly streak and this week's progress. */
export function StreakCard({ streak, className = '' }: { streak: Streak; className?: string }) {
  return (
    <section
      aria-label="Streak"
      className={`flex items-center gap-4 rounded-3xl border px-4 py-3 ${streak.level > 0 ? 'border-orange-500/30 bg-gradient-to-r from-orange-500/15 to-surface' : 'border-line bg-surface'} ${className}`}
    >
      <Flame level={streak.level} className="h-14" />
      <div className="min-w-0 flex-1 text-left">
        <p className="text-xl leading-tight font-black tracking-tight">
          {streak.weeks > 0 ? (
            <>
              <span className="text-3xl text-orange-400 tabular-nums">{streak.weeks}</span> week streak
            </>
          ) : (
            streakHeadline(streak)
          )}
        </p>
        <p className="mt-0.5 text-sm text-muted">{streakDetail(streak)}</p>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {Array.from({ length: streak.target }, (_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i < streak.thisWeek ? 'bg-orange-400' : 'bg-line'}`} />
          ))}
        </div>
      </div>
    </section>
  )
}

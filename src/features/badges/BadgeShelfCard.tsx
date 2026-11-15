import { Link } from 'react-router-dom'
import { useBadges } from './api'
import { Medal } from './Medal'

/** Profile preview of the badge shelf: the latest medals and a count, links to the full page. */
export function BadgeShelfCard({ className = '' }: { className?: string }) {
  const states = useBadges()
  const earned = (states ?? [])
    .filter((s) => s.earnedOn)
    .sort((a, b) => b.earnedOn!.localeCompare(a.earnedOn!))
    .slice(0, 4)
  const next = (states ?? []).filter((s) => !s.earnedOn).slice(0, 4 - earned.length)

  return (
    <Link
      to="/badges"
      className={`flex w-full items-center gap-3 rounded-3xl border border-line bg-surface px-4 py-3.5 text-left transition active:scale-[0.98] ${className}`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-bold">Badges</p>
        <p className="text-sm text-muted">
          {states ? `${states.filter((s) => s.earnedOn).length} of ${states.length} earned` : 'Loading…'}
        </p>
      </div>
      <div className="flex -space-x-2.5">
        {earned.map((s) => (
          <Medal key={s.badge.id} badge={s.badge} size={42} />
        ))}
        {next.map((s) => (
          <Medal key={s.badge.id} badge={s.badge} size={42} locked />
        ))}
      </div>
      <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  )
}

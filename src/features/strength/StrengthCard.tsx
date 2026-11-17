import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LEVELS, LIFTS, LIFT_LABEL, weakestLift, type Lift, type StrengthLevel } from '../../lib/strength'
import { useBodyStats, useLiftStrength } from './api'
import { BodyStatsSheet } from './BodyStatsSheet'
import { StrengthBar } from './StrengthBar'

const kg = (n: number) => `${Number(n.toFixed(1))}`

/** The chip that opens the body weight sheet: "85 kg · Men" or "Add body weight". */
export function BodyStatsButton({ className = '' }: { className?: string }) {
  const stats = useBodyStats()
  const [editing, setEditing] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-sm font-semibold text-muted transition active:scale-95 ${className}`}
      >
        {stats ? `${kg(stats.bodyweight)} kg · ${stats.sex === 'male' ? 'Men' : 'Women'}` : 'Add body weight'}
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
        </svg>
      </button>
      {editing && <BodyStatsSheet onClose={() => setEditing(false)} />}
    </>
  )
}

/** Profile: the four main lifts on the strength scale, and the weakest one to work on. */
export function StrengthCard({ className = '' }: { className?: string }) {
  const stats = useBodyStats()
  const lifts = useLiftStrength()

  const levels = new Map<Lift, StrengthLevel>()
  for (const [lift, s] of lifts) if (s.level) levels.set(lift, s.level)
  const weakest = levels.size > 1 ? weakestLift(levels) : null
  const next = weakest ? levels.get(weakest)!.next : null

  return (
    <section className={`w-full rounded-3xl bg-surface p-4 text-left ${className}`} aria-label="Your strength">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold">Your strength</h2>
        <BodyStatsButton />
      </div>

      <ul className="mt-3 flex flex-col gap-3.5">
        {LIFTS.map((lift) => {
          const s = lifts.get(lift)
          const label = !s ? 'Not logged yet' : s.level ? LEVELS[s.level.level] : `${kg(Math.round(s.estimate * 2) / 2)} kg est.`
          const row = (
            <>
              <span className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold">{LIFT_LABEL[lift]}</span>
                <span className={s?.level ? 'font-bold text-accent' : 'text-muted'}>{label}</span>
              </span>
              <StrengthBar position={s?.level?.position ?? 0} className="mt-1.5" />
            </>
          )
          return (
            <li key={lift}>
              {s ? (
                <Link to={`/library/${s.exerciseId}`} className="block py-1 transition active:opacity-70">
                  {row}
                </Link>
              ) : (
                <div className="py-1">{row}</div>
              )}
            </li>
          )
        })}
      </ul>

      <p className="mt-3 text-sm text-muted">
        {!stats
          ? 'Add your body weight to see where your lifts stand.'
          : weakest && next
            ? `${LIFT_LABEL[weakest]} is your weakest lift. ${kg(next.needKg)} kg more and it is ${LEVELS[next.level]}.`
            : lifts.size === 0
              ? 'Log a bench, squat, deadlift or overhead press to get a level.'
              : 'Levels use your estimated max and common strength standards: a guide, not a verdict.'}
      </p>
    </section>
  )
}

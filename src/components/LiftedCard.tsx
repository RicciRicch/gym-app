import type { CSSProperties, ReactNode } from 'react'
import { formatMass, liftedComparison, nextMilestone } from '../lib/lifted'

const MAX_ICONS = 8

/** One quiet line for the top of the training log: "3,175 kg in 2026 ≈ 2.5 giraffes", hairline bar to the next thing. */
export function LiftedStrip({ kg, label, footer }: { kg: number; label: string; footer?: string }) {
  const comparison = liftedComparison(kg)
  if (!comparison) return null
  const next = nextMilestone(kg)
  return (
    <div className="rounded-2xl bg-surface-2/60 px-3 py-2">
      <p className="flex items-center gap-2 text-xs text-muted">
        <span className="text-base leading-none" aria-hidden="true">
          {comparison.thing.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-bold text-text tabular-nums">{formatMass(kg)}</span> {label} ≈{' '}
          <span className="font-semibold text-accent">{comparison.label}</span>
        </span>
        {footer && <span className="shrink-0 tabular-nums">{footer}</span>}
      </p>
      {next && (
        <div
          className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-line"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(next.progress * 100)}
          aria-label={`${formatMass(next.remainingKg)} to ${next.label}`}
          title={`${formatMass(next.remainingKg)} to ${next.label}`}
        >
          <div className="lifted-bar h-full rounded-full bg-accent/50" style={{ width: `${Math.max(4, next.progress * 100)}%` }} />
        </div>
      )}
    </div>
  )
}

/**
 * "That's like lifting 2.5 giraffes": volume as real-world things, with a half icon for
 * halves and a thin bar towards the next, heavier thing. Kept quiet on purpose: it is a
 * fun aside, not the headline. Renders nothing at zero volume.
 */
export function LiftedCard({
  kg,
  label,
  showMass = true,
  footer,
  className = '',
  style,
}: {
  kg: number
  /** e.g. "2026 so far" */
  label: ReactNode
  /** Off where the total is already on screen (the workout summary). */
  showMass?: boolean
  footer?: ReactNode
  className?: string
  style?: CSSProperties
}) {
  const comparison = liftedComparison(kg)
  if (!comparison) return null
  const next = nextMilestone(kg)
  const { thing, count } = comparison
  const whole = Math.min(MAX_ICONS, Math.floor(count))
  const half = whole < MAX_ICONS && count % 1 !== 0
  const overflow = count > MAX_ICONS

  return (
    <div className={`rounded-3xl border border-line bg-surface px-4 py-3 text-left ${className}`} style={style}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted">
            {label}
            {showMass && <> · {formatMass(kg)}</>}
          </p>
          <p className="mt-0.5 text-base leading-snug font-bold text-balance">
            That&apos;s like lifting <span className="text-accent">{comparison.label}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-end gap-0.5 pt-0.5 text-xl leading-none" aria-hidden="true">
          {Array.from({ length: Math.min(whole, 3) }, (_, i) => (
            <span key={i} className="lift-emoji inline-block" style={{ animationDelay: `${i * 0.12}s` }}>
              {thing.emoji}
            </span>
          ))}
          {half && whole < 3 && (
            <span className="inline-block w-[0.6em] overflow-hidden opacity-70">
              <span className="inline-block">{thing.emoji}</span>
            </span>
          )}
          {(overflow || whole > 3) && <span className="ml-0.5 self-center text-xs font-bold text-muted">×{count.toLocaleString('en-GB')}</span>}
        </div>
      </div>

      {next && (
        <div className="mt-2.5 flex items-center gap-2">
          <div
            className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(next.progress * 100)}
            aria-label={`Progress to ${next.label}`}
          >
            <div className="lifted-bar h-full rounded-full bg-accent/60" style={{ width: `${Math.max(4, next.progress * 100)}%` }} />
          </div>
          <p className="shrink-0 text-xs text-muted">
            {formatMass(next.remainingKg)} to {next.label}
          </p>
        </div>
      )}

      {footer && <p className="mt-1.5 text-xs text-muted">{footer}</p>}
    </div>
  )
}

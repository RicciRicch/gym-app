import type { CSSProperties, ReactNode } from 'react'
import { liftedComparison } from '../lib/lifted'

/** "That's like lifting 3 rhinos 🦏🦏🦏": volume as real-world things. Renders nothing at zero volume. */
export function LiftedCard({
  kg,
  heading,
  footer,
  className = '',
  style,
}: {
  kg: number
  heading: ReactNode
  footer?: ReactNode
  className?: string
  style?: CSSProperties
}) {
  const comparison = liftedComparison(kg)
  if (!comparison) return null
  const icons = Math.min(6, Math.max(1, Math.floor(comparison.count)))
  return (
    <div className={`rounded-3xl border border-line bg-surface px-4 py-3 text-left ${className}`} style={style}>
      <p className="text-sm font-semibold text-muted">{heading}</p>
      <p className="mt-0.5 text-lg leading-snug font-bold text-balance">
        That&apos;s like lifting <span className="font-black text-accent">{comparison.label}</span>
      </p>
      <p className="mt-2 flex flex-wrap gap-1 text-3xl leading-none" aria-hidden="true">
        {Array.from({ length: icons }, (_, i) => (
          <span key={i} className="lift-emoji inline-block" style={{ animationDelay: `${i * 0.12}s` }}>
            {comparison.thing.emoji}
          </span>
        ))}
      </p>
      {footer && <p className="mt-2 text-sm text-muted">{footer}</p>}
    </div>
  )
}

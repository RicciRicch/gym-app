import { useMemo } from 'react'
import { movementFrames, type Movement, type Pt } from '../lib/movement'
import { prefersReducedMotion } from '../lib/motion'

const pts = (points: readonly Pt[]) => points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

// Start -> end -> hold -> back, eased: one calm rep every 2.8 s.
const TIMING = {
  dur: '2.8s',
  repeatCount: 'indefinite',
  calcMode: 'spline',
  keyTimes: '0;0.42;0.58;1',
  keySplines: '0.45 0 0.25 1;0 0 1 1;0.45 0 0.25 1',
} as const

const STYLE = {
  body: { stroke: 'var(--color-accent)' },
  scene: { stroke: 'var(--color-line)' },
  cable: { stroke: 'var(--color-muted)' },
  bar: { stroke: 'var(--color-muted)' },
} as const

/**
 * Draws a figure from its two frames. `still` shows one frame without motion;
 * otherwise SMIL animates every shape between the frames (no JS per frame).
 */
export function Figure({
  movement: { frames, box },
  still,
  thick = false,
  label,
  className = '',
}: {
  movement: Movement
  /** Index of the frame to show still, or null to animate. */
  still: 0 | 1 | null
  /** Heavier strokes for small glyphs. */
  thick?: boolean
  label?: string
  className?: string
}) {
  const [a, b] = frames
  const shown = still === null ? a : frames[still]
  const w = thick ? { body: 12, scene: 8, cable: 4, bar: 7 } : { body: 7, scene: 4, cable: 2, bar: 4.5 }
  const grow = thick ? 1.3 : 1

  return (
    <svg viewBox={box.join(' ') + ' ' + box[2]} className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {shown.map((shape, i) => {
        const other = b[i]
        if (shape.kind === 'line') {
          const from = pts(shape.points)
          const to = other.kind === 'line' ? pts(other.points) : from
          return (
            <polyline
              key={i}
              points={from}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={w[shape.role]}
              style={STYLE[shape.role]}
            >
              {still === null && from !== to && <animate attributeName="points" values={`${from};${to};${to};${from}`} {...TIMING} />}
            </polyline>
          )
        }
        // A dot is a zero-length round-capped line, so it animates exactly like the
        // limbs (one `points` animation) and can never drift from them.
        const r = shape.r * (shape.role === 'head' ? grow : thick ? 1.15 : 1)
        const at = pts([shape.at, shape.at])
        const to = other.kind === 'dot' ? pts([other.at, other.at]) : at
        const motion = still === null && at !== to && <animate attributeName="points" values={`${at};${to};${to};${at}`} {...TIMING} />
        const dot = (color: string, width: number, key: string) => (
          <polyline key={key} points={at} fill="none" strokeLinecap="round" strokeWidth={width} style={{ stroke: color }}>
            {motion}
          </polyline>
        )
        if (shape.role === 'plate') {
          // A plate: a grey ring with a dark middle.
          const ring = thick ? 5 : 3
          return [dot('var(--color-muted)', 2 * r + ring, `${i}o`), dot('var(--color-surface-2)', 2 * r - ring, `${i}i`)]
        }
        return dot(shape.role === 'head' ? 'var(--color-accent)' : 'var(--color-muted)', 2 * r, String(i))
      })}
    </svg>
  )
}

/** The exercise page hero: the movement on a loop (a still pose with reduced motion). Nothing for unknown names. */
export function MovementFigure({ name, className = '' }: { name: string; className?: string }) {
  const figure = useMemo(() => movementFrames(name), [name])
  if (!figure) return null
  return (
    <Figure
      movement={figure}
      still={prefersReducedMotion() ? figure.glyph : null}
      label={`${name}: how the movement goes`}
      className={className}
    />
  )
}

/** A small still of the movement for lists; a dumbbell tile when the name gives no clue. */
export function MovementGlyph({ name, className = 'size-14 rounded-2xl' }: { name: string; className?: string }) {
  const figure = useMemo(() => movementFrames(name), [name])
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center bg-bg text-accent ${className}`}>
      {figure ? (
        <Figure movement={figure} still={figure.glyph} thick className="size-full p-1" />
      ) : (
        <svg viewBox="0 0 24 24" className="size-1/2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M2 12h2m16 0h2M6 7v10M18 7v10M9 9v6m6-6v6M9 12h6" />
        </svg>
      )}
    </span>
  )
}

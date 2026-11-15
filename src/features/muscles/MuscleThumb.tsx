import { useId, type ReactNode } from 'react'
import { bestSide, muscleRoles, REGION_Y, type MuscleRole } from '../../lib/muscles'
import { BACK, FRONT, GAP, HEAT_GRADIENT, SILHOUETTE, SKIN } from './body-shapes'

/** Side length of the square crop out of the 200 x 440 figure. */
const CROP = 150

const mirrored = (node: ReactNode) => <g transform="translate(200 0) scale(-1 1)">{node}</g>

/**
 * A close-up of the body with the exercise's muscles lit: the main muscle on fire, the helpers hot.
 * Stands in for an exercise picture until real art exists. Renders nothing for unknown muscles.
 */
export function MuscleThumb({ muscles, className = '' }: { muscles: readonly string[]; className?: string }) {
  const id = useId()
  const roles = muscleRoles(muscles)
  const main = [...roles].find(([, role]) => role === 'main')?.[0]
  if (!main) return null

  const shapes = bestSide(roles) === 'back' ? BACK : FRONT
  const top = Math.min(Math.max(REGION_Y[main] - CROP / 2, 0), 440 - CROP)
  const fill = (role: MuscleRole | undefined) => `url(#${id}${role ?? 'idle'})`
  const silhouette = (
    <>
      <ellipse cx="100" cy="27" rx="17.5" ry="21" />
      <path d={SILHOUETTE} />
      {mirrored(<path d={SILHOUETTE} />)}
    </>
  )
  const body = (
    <>
      {shapes.map((s, i) => (
        <path key={i} d={s.d} fill={fill(roles.get(s.region))} stroke={GAP} strokeWidth="1.3" strokeLinejoin="round" />
      ))}
    </>
  )

  return (
    <svg viewBox={`${100 - CROP / 2} ${top} ${CROP} ${CROP}`} className={className} aria-hidden="true">
      <defs>
        {(
          [
            ['main', HEAT_GRADIENT[3]],
            ['assist', HEAT_GRADIENT[1]],
            ['idle', HEAT_GRADIENT[0]],
            ['skin', SKIN],
          ] as const
        ).map(([key, [from, to]]) => (
          <linearGradient key={key} id={`${id}${key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        ))}
        <radialGradient id={`${id}glow`}>
          <stop offset="0" stopColor="#ffb02e" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffb02e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy={REGION_Y[main]} r={CROP * 0.45} fill={`url(#${id}glow)`} />
      {/* Outline pass, then the fill on top hides the seam where the two halves meet. */}
      <g stroke="#3a4553" strokeWidth="2.4" fill="#3a4553">
        {silhouette}
      </g>
      <g fill={`url(#${id}skin)`}>{silhouette}</g>
      {body}
      {mirrored(body)}
    </svg>
  )
}

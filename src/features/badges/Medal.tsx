import { useId, type CSSProperties, type Ref } from 'react'
import type { Badge, BadgeTier } from '../../lib/badges'

/** Light, mid and dark stops of each tier's metal. */
const METAL: Record<BadgeTier, [string, string, string]> = {
  bronze: ['#ffcf9e', '#d9803f', '#6e3210'],
  silver: ['#ffffff', '#b9c5d3', '#4f5b6b'],
  gold: ['#fff3b0', '#f5b919', '#7c4f00'],
  legendary: ['#f2ffb8', '#c8ff2e', '#0f7d74'],
}

// A rosette rim: 28 rounded-off points around the centre of a 100 x 100 box.
const ROSETTE = (() => {
  const points = 28
  const pts: string[] = []
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? 44 : 49
    const a = (Math.PI * i) / points - Math.PI / 2
    pts.push(`${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`)
  }
  return `M${pts.join('L')}Z`
})()

/**
 * A badge's medal: a metal rosette in the tier's colours with the badge emoji
 * in the middle. Locked medals are dull grey.
 */
export function Medal({
  badge,
  size,
  locked = false,
  shine = false,
  className = '',
  style,
  ref,
}: {
  badge: Badge
  /** Width and height in px. */
  size: number
  locked?: boolean
  /** A light sweep now and then (earned medals). */
  shine?: boolean
  className?: string
  style?: CSSProperties
  ref?: Ref<HTMLDivElement>
}) {
  const id = useId()
  const [light, mid, dark] = METAL[badge.tier]
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`relative shrink-0 rounded-full ${shine && !locked ? 'shine' : ''} ${className}`}
      style={{ width: size, height: size, ...style }}
    >
      <svg viewBox="0 0 100 100" className={`absolute inset-0 size-full ${locked ? 'opacity-45 grayscale' : ''}`}>
        <defs>
          <linearGradient id={`${id}rim`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={light} />
            <stop offset="0.45" stopColor={mid} />
            <stop offset="1" stopColor={dark} />
          </linearGradient>
          <radialGradient id={`${id}face`} cx="0.35" cy="0.3" r="0.85">
            <stop offset="0" stopColor={mid} />
            <stop offset="1" stopColor={dark} />
          </radialGradient>
        </defs>
        <path d={ROSETTE} fill={`url(#${id}rim)`} />
        <circle cx="50" cy="50" r="37" fill={dark} />
        <circle cx="50" cy="50" r="34.5" fill={`url(#${id}face)`} />
        <circle cx="50" cy="50" r="34.5" fill="none" stroke={light} strokeOpacity="0.55" strokeWidth="1.2" />
        <circle cx="50" cy="50" r="30" fill="none" stroke={dark} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 2.6" />
        <ellipse cx="44" cy="30" rx="20" ry="9" fill="#fff" fillOpacity="0.22" transform="rotate(-18 44 30)" />
      </svg>
      <span
        className={`absolute inset-0 grid place-items-center leading-none ${locked ? 'opacity-35 grayscale' : ''}`}
        style={{ fontSize: size * 0.36, filter: locked ? undefined : 'drop-shadow(0 2px 2px rgb(0 0 0 / 0.35))' }}
      >
        {badge.emoji}
      </span>
    </div>
  )
}

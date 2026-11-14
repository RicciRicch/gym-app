import { useId, type CSSProperties } from 'react'

/**
 * The streak flame. Level 0 is a cold grey ember, 1 a small spark, 2 a steady
 * fire, 3 a blaze with more embers and a stronger glow. Animated with CSS only
 * (classes in index.css).
 */
export function Flame({ level, className = 'h-12' }: { level: 0 | 1 | 2 | 3; className?: string }) {
  const id = useId().replace(/:/g, '')
  const lit = level > 0
  const embers = level === 3 ? 5 : level === 2 ? 3 : level === 1 ? 1 : 0

  return (
    <span aria-hidden="true" className={`relative inline-flex aspect-[4/5] shrink-0 items-end justify-center ${className}`}>
      {lit && (
        <span
          className={`flame-glow absolute inset-x-0 bottom-0 h-4/5 rounded-full blur-lg ${level === 3 ? 'bg-orange-500/60' : 'bg-orange-500/40'}`}
        />
      )}
      <svg
        viewBox="0 0 64 80"
        className={`relative size-full origin-bottom overflow-visible ${lit ? '' : 'opacity-40 grayscale'} ${level === 1 ? 'scale-[0.78]' : ''}`}
      >
        <defs>
          <linearGradient id={`${id}-outer`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ff9a1f" />
            <stop offset="0.55" stopColor="#ff5a0a" />
            <stop offset="1" stopColor="#e3210b" />
          </linearGradient>
          <linearGradient id={`${id}-mid`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ffd84a" />
            <stop offset="1" stopColor="#ff8a12" />
          </linearGradient>
          <linearGradient id={`${id}-core`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#fffbe0" />
            <stop offset="1" stopColor="#ffe36b" />
          </linearGradient>
        </defs>

        {Array.from({ length: embers }, (_, i) => (
          <circle
            key={i}
            className="flame-ember"
            cx={[32, 22, 43, 27, 38][i]}
            cy={[14, 26, 24, 8, 16][i]}
            r={[2, 1.6, 1.8, 1.4, 1.5][i]}
            fill="#ffb347"
            style={{ animationDelay: `${i * 0.45}s`, '--ember-x': `${[5, -7, 8, -4, 6][i]}px` } as CSSProperties}
          />
        ))}

        <path
          className={lit ? 'flame-layer' : undefined}
          fill={`url(#${id}-outer)`}
          d="M32 3C34 17 53 27 53 50c0 16-9 27-21 27S11 66 11 50c0-10 5-16 8-24 2 6 6 7 7 2 1-8 3-17 6-25Z"
        />
        <path
          className={lit ? 'flame-layer flame-layer-2' : undefined}
          fill={`url(#${id}-mid)`}
          d="M32 27c2 10 13 16 13 28 0 12-6 20-13 20s-13-8-13-20c0-6 3-10 5-15 2 4 4 4 5 1 1-5 1-9 3-14Z"
        />
        <path
          className={lit ? 'flame-layer flame-layer-3' : undefined}
          fill={`url(#${id}-core)`}
          d="M32 47c1 6 7 9 7 16 0 7-3 11-7 11s-7-4-7-11c0-5 5-8 7-16Z"
        />
      </svg>
    </span>
  )
}

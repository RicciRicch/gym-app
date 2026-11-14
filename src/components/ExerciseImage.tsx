import { useState } from 'react'

/**
 * Exercise illustration from public/assets/exercises. Falls back to a drawn
 * tile for custom exercises and until the generated image exists.
 */
export function ExerciseImage({
  imageKey,
  name,
  className = 'size-16 rounded-2xl',
}: {
  imageKey: string | null
  name: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)

  if (!imageKey || failed) {
    return (
      <span
        aria-hidden="true"
        className={`grid shrink-0 place-items-center bg-gradient-to-br from-surface-2 to-bg text-accent ${className}`}
      >
        <svg viewBox="0 0 24 24" className="size-1/2 max-h-10 max-w-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M2 12h2m16 0h2M6 7v10M18 7v10M9 9v6m6-6v6M9 12h6" />
        </svg>
      </span>
    )
  }

  return (
    <img
      src={`${import.meta.env.BASE_URL}assets/exercises/${imageKey}.webp`}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 bg-surface-2 object-cover ${className}`}
    />
  )
}

/** Coach mascot for empty states; renders nothing until the asset exists. */
export function Mascot({ className = 'size-32 rounded-3xl' }: { className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <img
      src={`${import.meta.env.BASE_URL}assets/mascot.webp`}
      alt=""
      onError={() => setFailed(true)}
      className={`mx-auto object-contain ${className}`}
    />
  )
}

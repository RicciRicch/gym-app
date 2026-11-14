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

/**
 * The coach mascot (a cut-out gorilla on a transparent background): gently
 * floats above a soft lime glow. Renders nothing until the asset exists.
 */
export function Mascot({ className = 'h-40' }: { className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <span className={`relative mx-auto flex w-fit justify-center ${className}`}>
      <span
        aria-hidden="true"
        className="absolute inset-x-[15%] bottom-0 h-[12%] rounded-[50%] bg-accent/25 blur-xl"
      />
      <img
        src={`${import.meta.env.BASE_URL}assets/mascot.webp`}
        alt=""
        onError={() => setFailed(true)}
        className="relative h-full w-auto animate-float object-contain drop-shadow-[0_10px_16px_rgb(0_0_0_/_0.5)]"
      />
    </span>
  )
}

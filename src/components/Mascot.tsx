import { useState } from 'react'

export type MascotPose = 'coach' | 'proud' | 'sad'

const MASCOT_FILES: Record<MascotPose, string> = { coach: 'mascot', proud: 'mascot-proud', sad: 'mascot-sad' }

/**
 * The coach mascot (a cut-out gorilla on a transparent background): gently
 * floats above a soft lime glow. Poses: coach (arms crossed), proud (beating
 * its chest), sad (on the couch with chips; sits still, no glow). Renders
 * nothing until the asset exists.
 */
export function Mascot({ className = 'h-40', pose = 'coach' }: { className?: string; pose?: MascotPose }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  const sad = pose === 'sad'
  return (
    <span className={`relative mx-auto flex w-fit justify-center ${className}`}>
      <span
        aria-hidden="true"
        className={`absolute inset-x-[15%] bottom-0 h-[12%] rounded-[50%] blur-xl ${sad ? 'bg-black/40' : 'bg-accent/25'}`}
      />
      <img
        key={pose}
        src={`${import.meta.env.BASE_URL}assets/${MASCOT_FILES[pose]}.webp`}
        alt=""
        onError={() => setFailed(true)}
        className={`relative h-full w-auto object-contain drop-shadow-[0_10px_16px_rgb(0_0_0_/_0.5)] ${sad ? '' : 'animate-float'}`}
      />
    </span>
  )
}

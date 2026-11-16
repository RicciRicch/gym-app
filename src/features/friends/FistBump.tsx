import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Confetti } from '../../components/Confetti'
import { Avatar, Button } from '../../components/ui'
import { prefersReducedMotion } from '../../lib/motion'
import { avatarPhotoUrl } from '../avatar/api'
import { useProfile } from '../auth/useProfile'

export interface Buddy {
  name: string
  avatarKey: string
  avatarPath: string | null
}

/**
 * The moment two users become friends: both avatars charge in from the sides and
 * bump fists, with a shockwave, a shake and confetti. Static with reduced motion.
 */
export function FistBump({ buddy, onClose }: { buddy: Buddy; onClose: () => void }) {
  const { data: me } = useProfile()

  useEffect(() => {
    if (prefersReducedMotion()) return
    const timer = window.setTimeout(() => navigator.vibrate?.([30, 40, 80]), 560)
    return () => window.clearTimeout(timer)
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-bg/95 px-6 text-center backdrop-blur" role="dialog" aria-modal="true" aria-label="New friend">
      <Confetti power="small" />
      <div className="fist-shake relative flex items-center justify-center">
        <span aria-hidden="true" className="fist-wave absolute size-40 rounded-full border-4 border-accent" />
        <span aria-hidden="true" className="fist-wave absolute size-40 rounded-full border-2 border-white/70" style={{ animationDelay: '0.68s' }} />
        <div className="fist-left -mr-1.5 flex items-center">
          {me && <Avatar avatarKey={me.avatar_key} photoUrl={avatarPhotoUrl(me.avatar_path)} className="size-24 ring-4 ring-accent" />}
          <span aria-hidden="true" className="-ml-3 text-5xl drop-shadow-lg">
            🤜
          </span>
        </div>
        <div className="fist-right -ml-1.5 flex items-center">
          <span aria-hidden="true" className="-mr-3 text-5xl drop-shadow-lg">
            🤛
          </span>
          <Avatar avatarKey={buddy.avatarKey} photoUrl={avatarPhotoUrl(buddy.avatarPath)} className="size-24 ring-4 ring-accent" />
        </div>
      </div>

      <div className="fist-text mt-10">
        <p className="text-sm font-black tracking-[0.3em] text-accent uppercase">Gym buddies</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-balance">You and {buddy.name} are friends</h2>
        <p className="mt-2 text-muted">Now you can see each other&apos;s streak, badges and who trains more.</p>
      </div>
      <Button className="fist-text mt-8 w-full max-w-xs" onClick={onClose} autoFocus>
        Let&apos;s go
      </Button>
    </div>,
    document.body,
  )
}

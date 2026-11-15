import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { Confetti } from '../../components/Confetti'
import { Button } from '../../components/ui'
import { BADGES, TIER_LABEL, type Badge } from '../../lib/badges'
import { prefersReducedMotion } from '../../lib/motion'
import { useAuth } from '../auth/auth-context'
import { markBadgesSeen, useBadges, useNewBadges } from './api'
import { Medal } from './Medal'

/** Where a medal sits on screen, handed to the badges page so the flight starts there. */
export interface MedalRect {
  x: number
  y: number
  w: number
  h: number
}

export interface ShelfState {
  from?: MedalRect
}

const TIER_RAYS: Record<Badge['tier'], string> = {
  bronze: 'sunburst-gold opacity-60',
  silver: 'opacity-40 grayscale',
  gold: 'sunburst-gold',
  legendary: '',
}

/**
 * Pops up when a badge is unlocked (anywhere but the workout screen, so it
 * never covers the summary). "Put it on my shelf" opens the badges page,
 * where the medal flies into its slot.
 */
export function BadgeUnlock() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const fresh = useNewBadges(useBadges())
  if (!user || fresh.length === 0 || pathname === '/workout' || pathname === '/badges') return null

  const badges = fresh.map((id) => BADGES.find((b) => b.id === id)!)
  return (
    <UnlockOverlay
      key={fresh.join()}
      badges={badges}
      onShelf={(from) => navigate('/badges', { state: { from } satisfies ShelfState })}
      onLater={() => markBadgesSeen(user.id, fresh)}
    />
  )
}

/** The unlock screen itself: one badge at a time, then off to the shelf. */
export function UnlockOverlay({
  badges,
  onShelf,
  onLater,
}: {
  badges: readonly Badge[]
  onShelf: (from: MedalRect) => void
  onLater: () => void
}) {
  const [index, setIndex] = useState(0)
  const badge = badges[index]
  const last = index === badges.length - 1
  const medal = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const still = prefersReducedMotion()

  useEffect(() => {
    // Warm up the badges page so the flight starts without a loader.
    void import('../../pages/BadgesPage')
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onLater()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onLater])

  useEffect(() => {
    // Buzz as the medal lands.
    const timer = window.setTimeout(() => navigator.vibrate?.([40, 60, 120]), still ? 0 : 640)
    return () => window.clearTimeout(timer)
  }, [index, still])

  function toShelf() {
    const r = medal.current?.getBoundingClientRect()
    onShelf(r ? { x: r.left, y: r.top, w: r.width, h: r.height } : { x: innerWidth / 2 - 88, y: innerHeight / 2 - 160, w: 176, h: 176 })
  }

  const delay = (s: number) => (still ? undefined : { animationDelay: `${s}s` })

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex animate-[fade-in_0.3s_ease-out_both] flex-col items-center justify-center overflow-hidden bg-bg/90 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center backdrop-blur-md"
    >
      <Confetti key={index} power="small" />
      <div key={`stage-${index}`} className="relative flex w-full max-w-sm flex-col items-center">
        <div className="relative grid place-items-center" style={{ perspective: '800px' }}>
          <div
            className={`sunburst pointer-events-none absolute top-1/2 left-1/2 -mt-[13rem] -ml-[13rem] size-[26rem] rounded-full ${TIER_RAYS[badge.tier]}`}
          />
          {!still && (
            <>
              <span className="shockwave absolute size-44 rounded-full border-4 border-[#ffd23f]" style={delay(0.62)} />
              <span className="shockwave absolute size-44 rounded-full border-2 border-white" style={delay(0.8)} />
            </>
          )}
          <span className="badge-glow absolute size-48 rounded-full bg-[#ffd23f]/25 blur-2xl" />
          <div className={still ? '' : 'badge-drop'}>
            <div className={still ? '' : 'animate-float'} style={delay(1.2)}>
              <Medal ref={medal} badge={badge} size={176} shine />
            </div>
          </div>
        </div>

        <p className="rise-in mt-8 text-xs font-black tracking-[0.3em] text-[#ffd23f] uppercase" style={delay(0.75)}>
          Badge unlocked{badges.length > 1 && ` · ${index + 1} of ${badges.length}`}
        </p>
        <h2 id={titleId} className="pop-in mt-2 text-4xl font-black tracking-tight text-balance" style={delay(0.85)}>
          {badge.name}
        </h2>
        <p className="rise-in mt-2 text-muted" style={delay(1)}>
          {badge.description}
          <span className="mx-1.5 opacity-50">·</span>
          {TIER_LABEL[badge.tier]}
        </p>

        <div className="rise-in mt-9 flex w-full flex-col gap-2" style={delay(1.15)}>
          {last ? (
            <Button autoFocus className="w-full" onClick={toShelf}>
              Put {badges.length > 1 ? 'them' : 'it'} on my shelf
            </Button>
          ) : (
            <Button autoFocus className="w-full" onClick={() => setIndex(index + 1)}>
              Next badge
            </Button>
          )}
          <Button variant="ghost" className="w-full" onClick={onLater}>
            Later
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

import { useEffect, useEffectEvent, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Sheet } from '../../components/Sheet'
import { badgeProgressLabel, TIER_LABEL, type BadgeState } from '../../lib/badges'
import { prefersReducedMotion } from '../../lib/motion'
import { fromISODate } from '../../lib/schedule'
import type { MedalRect } from './BadgeUnlock'
import { Medal } from './Medal'

const SLOT = 76
/** Flying medals are drawn at this size and scaled down, so they stay sharp. */
const FLY = 176
const SPARK_COLORS = ['#ffd23f', '#c8ff2e', '#ffffff', '#ff7a1a']

const earnedDate = (iso: string) =>
  fromISODate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

/**
 * The badge shelf. Newly earned badges fly in from the middle of the screen
 * (or from where the unlock screen showed them) and land in their slot.
 */
export function BadgeShelf({
  states,
  fresh,
  from,
  onSeen,
  onFlightEnd,
}: {
  states: readonly BadgeState[]
  /** Earned badges not shown yet: these fly in. */
  fresh: readonly string[]
  /** Where the first medal starts (the unlock screen's medal); the middle of the screen otherwise. */
  from?: MedalRect
  onSeen: (ids: readonly string[]) => void
  onFlightEnd?: () => void
}) {
  const [still] = useState(prefersReducedMotion)
  const slots = useRef(new Map<string, HTMLDivElement>())
  const clones = useRef(new Map<string, HTMLDivElement>())
  const [open, setOpen] = useState<BadgeState | null>(null)

  // The badges that fly in on this visit: the unseen ones, once they are known.
  const [flight, setFlight] = useState<readonly string[] | null>(null)
  if (flight === null && fresh.length > 0) setFlight(fresh)
  const [landedIds, setLanded] = useState<ReadonlySet<string>>(new Set())
  const [done, setDone] = useState(false)
  // With reduced motion they are simply in place, marked NEW.
  const landed = still && flight ? new Set(flight) : landedIds
  const flying = !!flight && !still && !done

  // They count as seen straight away, so leaving mid-flight doesn't bring the unlock screen back.
  const seen = useEffectEvent((ids: readonly string[]) => onSeen(ids))
  const ended = useEffectEvent(() => onFlightEnd?.())
  useEffect(() => {
    if (flight) seen(flight)
  }, [flight])

  useEffect(() => {
    if (!flying || !flight) return
    let cancelled = false
    const running: Animation[] = []
    void (async () => {
      await wait(from ? 80 : 350)
      for (const [i, id] of flight.entries()) {
        const slot = slots.current.get(id)
        const clone = clones.current.get(id)
        if (cancelled) return
        if (!slot || !clone) continue
        const now = slot.getBoundingClientRect()
        if (now.top < 70 || now.bottom > innerHeight - 90) {
          slot.scrollIntoView({ block: 'center', behavior: i === 0 ? 'instant' : 'smooth' })
          await wait(i === 0 ? 30 : 420)
          if (cancelled) return
        }
        const to = slot.getBoundingClientRect()
        const start: MedalRect =
          i === 0 && from ? from : { x: innerWidth / 2 - 80, y: innerHeight / 2 - 120, w: 160, h: 160 }
        const cx = to.left + to.width / 2
        const cy = to.top + to.height / 2
        Object.assign(clone.style, { left: `${cx - FLY / 2}px`, top: `${cy - FLY / 2}px`, visibility: 'visible' })
        const dx = start.x + start.w / 2 - cx
        const dy = start.y + start.h / 2 - cy
        const s0 = start.w / FLY
        const s1 = to.width / FLY
        const at = (x: number, y: number, scale: number, turn: number, offset: number) => ({
          transform: `perspective(700px) translate(${x}px, ${y}px) scale(${scale}) rotateY(${turn}deg)`,
          offset,
        })
        const anim = clone.animate(
          [
            at(dx, dy, s0, 0, 0),
            at(dx, dy - 16, s0 * 1.1, 0, 0.14), // wind-up
            at(dx * 0.42, dy * 0.42 - 80, (s0 + s1) / 2, 360, 0.6), // arc over, spinning like a coin
            at(0, 0, s1 * 0.9, 720, 0.9),
            at(0, 0, s1, 720, 1),
          ],
          { duration: 1050, easing: 'cubic-bezier(0.5, 0, 0.25, 1)', fill: 'both' },
        )
        running.push(anim)
        await anim.finished.catch(() => {})
        if (cancelled) return
        clone.style.visibility = 'hidden'
        setLanded((prev) => new Set(prev).add(id))
        navigator.vibrate?.(30)
        await wait(260)
      }
      if (cancelled) return
      setDone(true)
      ended()
    })()
    return () => {
      cancelled = true
      running.forEach((a) => a.cancel())
    }
  }, [flying, flight, from])

  const waiting = (id: string) => flying && !!flight?.includes(id) && !landed.has(id)
  // The count ticks up as each medal lands.
  const earned = states.filter((s) => s.earnedOn && !waiting(s.badge.id)).length

  return (
    <div className="animate-fade-up pt-2">
      <h1 className="text-3xl font-black tracking-tight">Badges</h1>
      <p className="mt-1 text-muted">
        <span className="font-bold text-text">{earned}</span> of {states.length} earned
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#ffd23f] to-accent transition-[width] duration-700"
          style={{ width: `${(earned / states.length) * 100}%` }}
        />
      </div>

      <ul className="mt-5 grid grid-cols-3 gap-2.5">
        {states.map((state) => {
          const { badge, earnedOn } = state
          const isNew = landed.has(badge.id)
          const label = badgeProgressLabel(state)
          return (
            <li key={badge.id}>
              <button
                type="button"
                onClick={() => setOpen(state)}
                aria-label={`${badge.name}: ${earnedOn ? `earned ${earnedDate(earnedOn)}` : `locked, ${badge.description}`}`}
                className={`relative flex h-full w-full flex-col items-center rounded-3xl border px-1.5 pt-4 pb-3 text-center transition active:scale-95 ${
                  earnedOn ? 'border-line bg-surface' : 'border-line/60 bg-surface/50'
                } ${isNew ? 'border-[#ffd23f]/70 shadow-[0_0_24px_-8px] shadow-[#ffd23f]' : ''}`}
              >
                <div
                  ref={(el) => {
                    if (el) slots.current.set(badge.id, el)
                    else slots.current.delete(badge.id)
                  }}
                  className="relative grid place-items-center"
                  style={{ width: SLOT, height: SLOT }}
                >
                  {waiting(badge.id) ? (
                    <span className="size-[66px] animate-pulse rounded-full border-2 border-dashed border-[#ffd23f]/60" />
                  ) : (
                    <Medal badge={badge} size={SLOT} locked={!earnedOn} shine={!!earnedOn} className={isNew && !still ? 'badge-land' : ''} />
                  )}
                  {isNew && !still && <LandingBurst />}
                </div>
                <span className="mt-2 text-[13px] leading-tight font-bold text-balance">{badge.name}</span>
                {earnedOn ? (
                  <span className="mt-1 text-[11px] text-muted">{earnedDate(earnedOn)}</span>
                ) : label ? (
                  <span className="mt-1.5 w-full px-2">
                    <span className="block h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <span className="block h-full rounded-full bg-muted" style={{ width: `${(state.progress / badge.goal) * 100}%` }} />
                    </span>
                    <span className="mt-1 block text-[11px] text-muted">{label}</span>
                  </span>
                ) : (
                  <span className="mt-1 text-[11px] leading-snug text-muted text-balance">{badge.description}</span>
                )}
                {isNew && (
                  <span className="pop-in absolute top-2 right-2 rounded-full bg-[#ffd23f] px-1.5 py-0.5 text-[10px] font-black text-bg">
                    NEW
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {flying &&
        createPortal(
          <>
            {from && <div className="badge-backdrop-out pointer-events-none fixed inset-0 z-40 bg-bg/90" />}
            {flight?.map((id) => {
                const badge = states.find((s) => s.badge.id === id)!.badge
                return (
                  <div
                    key={id}
                    ref={(el) => {
                      if (el) clones.current.set(id, el)
                      else clones.current.delete(id)
                    }}
                    className="pointer-events-none fixed z-50"
                    style={{ width: FLY, height: FLY, visibility: 'hidden', filter: 'drop-shadow(0 0 18px rgb(255 210 63 / 0.75))' }}
                  >
                    <Medal badge={badge} size={FLY} />
                  </div>
                )
            })}
          </>,
          document.body,
        )}

      {open && <BadgeSheet state={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

/** Sparks and a ring that burst out of a slot when a medal lands in it. */
function LandingBurst() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span className="shockwave absolute inset-0 rounded-full border-2 border-[#ffd23f]" />
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className="badge-spark"
          style={{ '--a': `${i * 36}deg`, background: SPARK_COLORS[i % SPARK_COLORS.length], animationDelay: `${(i % 2) * 0.05}s` } as CSSProperties}
        />
      ))}
    </span>
  )
}

function BadgeSheet({ state, onClose }: { state: BadgeState; onClose: () => void }) {
  const { badge, earnedOn, progress } = state
  const label = badgeProgressLabel(state)
  return (
    <Sheet title={badge.name} onClose={onClose}>
      <div className="flex flex-col items-center pb-3 text-center">
        <Medal badge={badge} size={132} locked={!earnedOn} shine={!!earnedOn} className="pop-in" />
        <p className="mt-4 text-lg font-bold">{badge.description}</p>
        <p className="mt-1 text-sm font-semibold text-muted">{TIER_LABEL[badge.tier]}</p>
        {earnedOn ? (
          <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-2.5 text-sm font-semibold">Earned on {earnedDate(earnedOn)}</p>
        ) : (
          label && (
            <div className="mt-4 w-full">
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(progress / badge.goal) * 100}%` }} />
              </div>
              <p className="mt-2 text-sm font-semibold text-muted">{label}</p>
            </div>
          )
        )}
      </div>
    </Sheet>
  )
}

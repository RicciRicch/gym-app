import { useEffect, useRef } from 'react'
import { formatClock } from '../../lib/workout'
import { useNow } from './useNow'

/**
 * Rest countdown docked above the bottom nav. Runs off an absolute end time,
 * so it survives reloads and backgrounding. Vibrates when it reaches zero.
 */
export function RestTimer({
  endsAt,
  totalSeconds,
  onAdjust,
  onDone,
}: {
  endsAt: number
  totalSeconds: number
  onAdjust: (deltaSeconds: number) => void
  onDone: () => void
}) {
  const now = useNow(250)
  const remainingMs = endsAt - now
  const firedFor = useRef<number | null>(null)

  useEffect(() => {
    if (remainingMs > 0 || firedFor.current === endsAt) return
    firedFor.current = endsAt
    // Only buzz if it just ended, not when reopening the app long after.
    if (remainingMs > -3000 && 'vibrate' in navigator) navigator.vibrate([250, 120, 250])
    onDone()
  }, [remainingMs, endsAt, onDone])

  const remaining = Math.max(0, Math.ceil(remainingMs / 1000))
  const progress = Math.min(1, Math.max(0, remainingMs / (Math.max(totalSeconds, remaining) * 1000)))
  const chip = 'grid min-h-11 min-w-12 place-items-center rounded-xl bg-surface-2 px-2 text-sm font-bold transition active:scale-90'

  return (
    <div
      role="timer"
      aria-label="Rest timer"
      className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-md animate-fade-up px-3 pb-2"
    >
      <div className="overflow-hidden rounded-2xl border border-accent/40 bg-surface shadow-[0_8px_32px_-8px] shadow-black">
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex-1">
            <p className="text-xs font-semibold tracking-widest text-accent uppercase">Rest</p>
            <p className="text-3xl leading-none font-black tabular-nums">{formatClock(remaining)}</p>
          </div>
          <button className={chip} onClick={() => onAdjust(-15)} aria-label="15 seconds less">
            −15
          </button>
          <button className={chip} onClick={() => onAdjust(15)} aria-label="15 seconds more">
            +15
          </button>
          <button className={`${chip} text-accent`} onClick={onDone}>
            Skip
          </button>
        </div>
        <div className="h-1 bg-surface-2">
          <div className="h-full bg-accent transition-[width] duration-200 ease-linear" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </div>
  )
}

import type { CoachTip as Tip } from '../../lib/coach'

/** The mascot's head, cropped from the full-body cut-out. */
export function GorillaHead({ className = 'size-9' }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`block shrink-0 overflow-hidden rounded-full bg-accent/15 ${className}`}>
      <img
        src={`${import.meta.env.BASE_URL}assets/mascot.webp`}
        alt=""
        className="h-[260%] w-full max-w-none object-cover object-top"
        onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
      />
    </span>
  )
}

/** The coach's suggestion for an exercise, with a button that writes it into the open sets. */
export function CoachTip({ tip, onApply }: { tip: Tip; onApply: (() => void) | null }) {
  return (
    <div className="mb-3 flex items-center gap-2.5 rounded-2xl bg-surface-2 px-3 py-2">
      <GorillaHead />
      <p className="min-w-0 flex-1 text-sm leading-snug font-semibold text-balance">{tip.text}</p>
      {onApply && (
        <button
          type="button"
          onClick={onApply}
          className="min-h-11 shrink-0 rounded-xl bg-accent px-3 text-sm font-bold text-accent-ink active:scale-95"
        >
          Apply
        </button>
      )}
    </div>
  )
}

import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Bottom sheet dialog. Closes on backdrop tap and Escape. Rendered into <body>
 * so animated (transformed) ancestors cannot trap its fixed positioning.
 */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button aria-label="Close" className="absolute inset-0 cursor-default bg-black/60" onClick={onClose} />
      <div className="relative flex max-h-[85dvh] w-full max-w-md animate-fade-up flex-col rounded-t-3xl border-t border-line bg-surface pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line" />
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          <button onClick={onClose} className="-mr-2 grid size-11 place-items-center rounded-full text-muted" aria-label="Close">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-2">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

/** A full-width tappable row for use inside a Sheet. */
export function SheetOption({
  children,
  selected,
  danger,
  onClick,
}: {
  children: ReactNode
  selected?: boolean
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-13 w-full items-center justify-between gap-3 rounded-2xl px-4 text-left font-semibold transition active:scale-[0.98] ${selected ? 'bg-accent/10 text-accent' : danger ? 'text-danger' : 'text-text hover:bg-surface-2'}`}
    >
      {children}
      {selected && (
        <svg viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5 9-10" />
        </svg>
      )}
    </button>
  )
}

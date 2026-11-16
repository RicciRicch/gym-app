import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/**
 * A small "i" button that opens a speech bubble under it. The bubble is placed against the
 * nearest positioned ancestor (give the surrounding row `relative`), so it can span the row
 * while its arrow still points at the button. Closes on a tap outside or Escape.
 */
export function InfoBubble({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [arrowX, setArrowX] = useState(0)
  const button = useRef<HTMLButtonElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const id = useId()

  // Point the arrow at the button, again whenever the layout width changes.
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      // Measured against the (untransformed) offset parent: the bubble itself scales in.
      const el = bubble.current
      const b = button.current?.getBoundingClientRect()
      const parent = el?.offsetParent?.getBoundingClientRect()
      if (el && b && parent) setArrowX(b.left + b.width / 2 - parent.left - el.offsetLeft)
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node
      if (!bubble.current?.contains(target) && !button.current?.contains(target)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = () => setOpen((o) => !o)

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        className={`-m-2.5 grid size-11 shrink-0 place-items-center rounded-full transition ${open ? 'text-accent' : 'text-muted'}`}
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 11v5.5M12 7.6v.1" />
        </svg>
      </button>
      {open && (
        <div
          ref={bubble}
          id={id}
          role="dialog"
          aria-label={label}
          className="info-bubble absolute top-full right-0 left-0 z-30 mt-2 rounded-2xl border border-line bg-surface-2 p-4 text-sm shadow-[0_18px_40px_-12px_rgb(0_0_0/0.7)]"
          style={{ transformOrigin: `${arrowX}px 0` }}
        >
          <span
            aria-hidden="true"
            className="absolute -top-[7px] size-3 rotate-45 border-t border-l border-line bg-surface-2"
            style={{ left: arrowX - 6 }}
          />
          {children}
        </div>
      )}
    </>
  )
}

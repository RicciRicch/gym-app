/** Small "PR" pill: text plus color, so it never relies on color alone. */
export function PrBadge({ label = 'PR' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] font-black tracking-wide text-accent-ink">
      <svg viewBox="0 0 24 24" className="size-3" fill="currentColor" aria-hidden="true">
        <path d="M12 2l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17l-6.1 3.5 1.5-6.8L2.2 9l6.9-.7L12 2z" />
      </svg>
      {label}
    </span>
  )
}

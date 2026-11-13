/** Temporary placeholder for tabs that land in a later milestone. */
export function ComingSoonPage({ title, milestone }: { title: string; milestone: string }) {
  return (
    <div className="animate-fade-up pt-2">
      <h1 className="text-3xl font-black tracking-tight">{title}</h1>
      <p className="mt-6 rounded-3xl border border-dashed border-line p-6 text-muted">Coming in {milestone}.</p>
    </div>
  )
}

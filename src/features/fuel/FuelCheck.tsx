import { useState, type CSSProperties } from 'react'
import { Button } from '../../components/ui'
import { FUELS, fuelReaction, type Fuel } from '../../lib/fuel'
import { useSaveFuel } from '../workout/api'
import { GorillaHead } from '../workout/CoachTip'

/** On the workout summary: "What did you have before?", one tap per item, then the gorilla's verdict. */
export function FuelCheck({ workoutId, className = '', style }: { workoutId: string; className?: string; style?: CSSProperties }) {
  const [picked, setPicked] = useState<ReadonlySet<Fuel>>(new Set())
  const [nothing, setNothing] = useState(false)
  const [saved, setSaved] = useState<readonly Fuel[] | null>(null)
  const save = useSaveFuel()

  function toggle(fuel: Fuel) {
    setNothing(false)
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(fuel)) next.delete(fuel)
      else next.add(fuel)
      return next
    })
  }

  function submit() {
    const fuel = nothing ? [] : FUELS.map((f) => f.id).filter((id) => picked.has(id))
    save.mutate({ workoutId, fuel }, { onSuccess: () => setSaved(fuel) })
  }

  const chip = (active: boolean) =>
    `inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-bold transition active:scale-95 ${
      active ? 'border-accent bg-accent/15 text-accent' : 'border-line bg-surface-2 text-text'
    }`

  return (
    <section aria-label="Pre-workout log" className={`rounded-3xl border border-line bg-surface p-4 text-left ${className}`} style={style}>
      {saved ? (
        <div className="flex items-center gap-3">
          <GorillaHead className="size-10" />
          <p className="pop-in min-w-0 flex-1 text-sm leading-snug font-bold text-balance">{fuelReaction(saved)}</p>
        </div>
      ) : (
        <>
          <p className="font-bold">What did you have before?</p>
          <p className="text-sm text-muted">The gorilla is taking notes to find out what works for you.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FUELS.map((f) => (
              <button key={f.id} type="button" aria-pressed={picked.has(f.id)} onClick={() => toggle(f.id)} className={chip(picked.has(f.id))}>
                <span aria-hidden="true">{f.emoji}</span>
                {f.label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={nothing}
              onClick={() => {
                setNothing(!nothing)
                setPicked(new Set())
              }}
              className={chip(nothing)}
            >
              <span aria-hidden="true">🚫</span>
              Nothing
            </button>
          </div>
          {save.isError && (
            <p role="alert" className="mt-3 text-sm text-danger">
              Could not save. Check your connection and try again.
            </p>
          )}
          {(nothing || picked.size > 0) && (
            <Button variant="secondary" className="mt-3 w-full" loading={save.isPending} onClick={submit}>
              Save
            </Button>
          )}
        </>
      )}
    </section>
  )
}

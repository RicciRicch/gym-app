import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Button } from '../../components/ui'
import type { Sex } from '../../lib/strength'
import { useBodyStats, useUpdateBodyStats } from './api'

const SEXES: [Sex, string][] = [
  ['male', 'Men'],
  ['female', 'Women'],
]

/** Body weight and which standards to compare against. Kept private: friends never see it. */
export function BodyStatsSheet({ onClose }: { onClose: () => void }) {
  const current = useBodyStats()
  const [weight, setWeight] = useState(current ? String(current.bodyweight) : '')
  const [sex, setSex] = useState<Sex | null>(current?.sex ?? null)
  const update = useUpdateBodyStats()
  const kg = Number(weight.replace(',', '.'))
  const validWeight = weight.trim() !== '' && kg >= 25 && kg <= 350
  const ready = validWeight && sex !== null

  return (
    <Sheet title="Your body weight" onClose={update.isPending ? () => {} : onClose}>
      <p className="text-muted">Strength levels compare your lifts with your body weight. Only you can see this.</p>
      <label className="mt-5 block">
        <span className="text-sm font-semibold text-muted">Body weight</span>
        <span className="mt-1.5 flex items-center rounded-2xl bg-surface-2 px-4 focus-within:ring-2 focus-within:ring-accent/60">
          <input
            inputMode="decimal"
            aria-label="Body weight in kg"
            value={weight}
            onChange={(e) => setWeight(e.target.value.replace(/[^0-9.,]/g, ''))}
            placeholder="80"
            className="min-h-14 w-full bg-transparent text-2xl font-black tabular-nums outline-none placeholder:text-muted/50"
          />
          <span className="font-bold text-muted">kg</span>
        </span>
      </label>
      {weight.trim() !== '' && !validWeight && <p className="mt-2 text-sm text-danger">Enter a weight between 25 and 350 kg</p>}

      <p className="mt-5 text-sm font-semibold text-muted">Compare with standards for</p>
      <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1" role="radiogroup" aria-label="Standards">
        {SEXES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={sex === value}
            onClick={() => setSex(value)}
            className={`min-h-11 rounded-xl font-bold transition ${sex === value ? 'bg-accent text-accent-ink' : 'text-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {update.isError && (
        <p role="alert" className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
          Could not save. Check your connection and try again.
        </p>
      )}
      <div className="mt-6 flex flex-col gap-2">
        <Button
          className="w-full"
          disabled={!ready}
          loading={update.isPending}
          onClick={() => sex && update.mutate({ bodyweight: Math.round(kg * 10) / 10, sex }, { onSuccess: onClose })}
        >
          Save
        </Button>
        <Button variant="ghost" className="w-full" disabled={update.isPending} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Sheet>
  )
}

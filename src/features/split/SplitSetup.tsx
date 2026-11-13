import { useState, type FormEvent } from 'react'
import { Button, Field } from '../../components/ui'
import { Sheet } from '../../components/Sheet'
import { WEEKDAY_SHORT } from '../../lib/schedule'
import { useCreateSplit } from './api'
import { SPLIT_PRESETS, type SplitPreset } from './presets'

/** Pick a preset or start from scratch. Shown when there is no split, and when replacing one. */
export function SplitSetup({ onDone, replacing }: { onDone?: () => void; replacing?: boolean }) {
  const createSplit = useCreateSplit()
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [scratchOpen, setScratchOpen] = useState(false)
  const [name, setName] = useState('My split')

  function create(input: { preset: SplitPreset } | { name: string }, key: string) {
    setPendingKey(key)
    createSplit.mutate(input, {
      onSuccess: () => onDone?.(),
      onSettled: () => setPendingKey(null),
    })
  }

  function submitScratch(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setScratchOpen(false)
    create({ name: name.trim() }, 'scratch')
  }

  return (
    <div className="flex flex-col gap-3">
      {replacing && (
        <p className="rounded-2xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
          This replaces your current split. Your workout history stays.
        </p>
      )}

      {SPLIT_PRESETS.map((preset) => (
        <button
          key={preset.key}
          disabled={createSplit.isPending}
          onClick={() => create({ preset }, preset.key)}
          className="rounded-3xl border border-line bg-surface p-5 text-left transition hover:border-muted active:scale-[0.98] disabled:opacity-60"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">{preset.name}</h3>
              <p className="text-sm text-muted">{preset.tagline}</p>
            </div>
            <span className="text-sm font-bold text-accent">{pendingKey === preset.key ? 'Creating…' : 'Use'}</span>
          </div>
          <WeekPreview preset={preset} />
        </button>
      ))}

      <button
        disabled={createSplit.isPending}
        onClick={() => setScratchOpen(true)}
        className="min-h-14 rounded-3xl border border-dashed border-line px-5 font-semibold text-muted transition hover:border-muted hover:text-text active:scale-[0.98] disabled:opacity-60"
      >
        {pendingKey === 'scratch' ? 'Creating…' : '+ Start from scratch'}
      </button>

      {createSplit.isError && (
        <p role="alert" className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          Could not create the split — try again
        </p>
      )}

      {scratchOpen && (
        <Sheet title="New split" onClose={() => setScratchOpen(false)}>
          <form onSubmit={submitScratch} className="flex flex-col gap-4 pb-2">
            <Field label="Split name" value={name} maxLength={40} autoFocus onChange={(e) => setName(e.target.value)} />
            <Button type="submit" disabled={!name.trim()}>
              Create split
            </Button>
          </form>
        </Sheet>
      )}
    </div>
  )
}

function WeekPreview({ preset }: { preset: SplitPreset }) {
  return (
    <div className="mt-4 grid grid-cols-7 gap-1">
      {WEEKDAY_SHORT.map((label, weekday) => {
        const day = preset.days.find((d) => d.weekday === weekday)
        return (
          <div key={label} className="text-center">
            <div className="text-[10px] font-semibold text-muted">{label[0]}</div>
            <div
              title={day?.name ?? 'Rest'}
              className={`mt-1 h-7 truncate rounded-lg px-0.5 text-[10px] leading-7 font-bold ${day ? 'bg-accent/15 text-accent' : 'bg-surface-2 text-muted/50'}`}
            >
              {day ? day.name.replace(/^Full Body /, 'FB ').slice(0, 5) : '·'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

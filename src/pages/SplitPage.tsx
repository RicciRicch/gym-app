import { useState } from 'react'
import { PageLoader } from '../components/ui'
import { Sheet } from '../components/Sheet'
import { useActiveSplit } from '../features/split/api'
import { SplitEditor } from '../features/split/SplitEditor'
import { SplitSetup } from '../features/split/SplitSetup'

export function SplitPage() {
  const { data: split, isPending, isError, refetch } = useActiveSplit()
  const [replacing, setReplacing] = useState(false)

  if (isPending) {
    return (
      <PageLoader label="Loading your split" />
    )
  }
  if (isError) {
    return (
      <div className="pt-16 text-center">
        <p className="font-bold">Could not load your split</p>
        <button className="mt-2 min-h-11 px-4 font-semibold text-accent" onClick={() => refetch()}>
          Try again
        </button>
      </div>
    )
  }

  if (!split) {
    return (
      <div className="animate-fade-up pt-2">
        <h1 className="text-3xl font-black tracking-tight">Build your split</h1>
        <p className="mt-1 mb-5 text-muted">Start from a proven layout and make it yours, or build one from scratch.</p>
        <SplitSetup />
      </div>
    )
  }

  return (
    <div className="animate-fade-up pt-2">
      <SplitEditor key={split.id} split={split} />
      <button
        onClick={() => setReplacing(true)}
        className="mt-8 min-h-12 w-full rounded-2xl border border-line font-semibold text-muted transition active:scale-[0.98]"
      >
        Switch to a different split
      </button>
      {replacing && (
        <Sheet title="New split" onClose={() => setReplacing(false)}>
          <div className="pb-2">
            <SplitSetup replacing onDone={() => setReplacing(false)} />
          </div>
        </Sheet>
      )}
    </div>
  )
}

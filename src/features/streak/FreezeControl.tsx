import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { Button } from '../../components/ui'
import { startOfWeek, toISODate } from '../../lib/schedule'
import { canFreezeWeek, type Streak } from '../../lib/streak'
import { useFreezeWeek, useStreakFreezes } from './api'

/**
 * The ice button on the streak card. Offered when there is a streak to protect
 * and this week's target is not met yet; one freeze per calendar month. A
 * frozen running week can be thawed again.
 */
export function FreezeControl({ streak }: { streak: Streak }) {
  const [open, setOpen] = useState(false)
  const freezes = useStreakFreezes()
  const freeze = useFreezeWeek()
  const weekStart = startOfWeek(toISODate(new Date()))

  if (!freezes.data || streak.weekDone) return null
  const atRisk = streak.weeks > 0
  if (!streak.frozen && !atRisk) return null
  const available = canFreezeWeek(freezes.data, weekStart)

  const close = () => {
    freeze.reset()
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={streak.frozen ? 'Week frozen. Tap to undo' : 'Freeze this week'}
        className={`grid size-12 shrink-0 place-items-center rounded-2xl border text-2xl transition active:scale-90 ${
          streak.frozen ? 'border-sky-300/60 bg-sky-400/20' : available ? 'border-line bg-surface-2' : 'border-line bg-surface-2 opacity-40 grayscale'
        }`}
      >
        🧊
      </button>

      {open && (
        <Sheet title={streak.frozen ? 'Week on ice' : 'Freeze this week?'} onClose={freeze.isPending ? () => {} : close}>
          {streak.frozen ? (
            <p className="text-muted">
              This week is frozen: it won&apos;t count, and it won&apos;t break your {streak.weeks} week streak. Feeling better? Thaw it and
              train, or hit your target anyway and the week counts as normal.
            </p>
          ) : available ? (
            <p className="text-muted">
              Sick or travelling? Freeze this week and your {streak.weeks} week streak survives even if you miss your workouts. You get one
              freeze per month.
            </p>
          ) : (
            <p className="text-muted">You already used your freeze this month. The next one unlocks on the 1st.</p>
          )}
          {freeze.isError && (
            <p role="alert" className="mt-4 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
              Could not save that. Check your connection and try again.
            </p>
          )}
          <div className="mt-5 flex flex-col gap-2 pb-2">
            {streak.frozen ? (
              <Button variant="secondary" loading={freeze.isPending} onClick={() => freeze.mutate({ weekStart, undo: true }, { onSuccess: close })}>
                Thaw the week
              </Button>
            ) : (
              available && (
                <Button loading={freeze.isPending} onClick={() => freeze.mutate({ weekStart }, { onSuccess: close })}>
                  🧊 Freeze this week
                </Button>
              )
            )}
            <Button variant="ghost" disabled={freeze.isPending} onClick={close}>
              {streak.frozen || available ? 'Not now' : 'OK'}
            </Button>
          </div>
        </Sheet>
      )}
    </>
  )
}

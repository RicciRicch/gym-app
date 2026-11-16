import { Button } from '../../components/ui'
import { canNudge } from '../../lib/friends'
import { toISODate } from '../../lib/schedule'
import { useNudgedToday, useSendNudge, type Friend } from './api'

/** "Poke": tells the friend's gorilla to pass on a message. Once a day, not after they trained. */
export function NudgeButton({ friend, compact = false }: { friend: Friend; compact?: boolean }) {
  const today = toISODate(new Date())
  const nudged = useNudgedToday()
  const send = useSendNudge()
  const done = nudged.has(friend.id) || send.isSuccess
  const trained = friend.lastDate === today
  const allowed = canNudge(friend.lastDate, done, today)

  if (compact) {
    return (
      <button
        onClick={() => send.mutate(friend.id)}
        disabled={!allowed || send.isPending}
        aria-label={trained ? `${friend.name} trained today` : done ? `${friend.name} nudged` : `Nudge ${friend.name}`}
        className={`grid size-11 shrink-0 place-items-center rounded-xl text-xl transition active:scale-90 ${allowed ? 'bg-surface-2' : 'opacity-60'}`}
      >
        {trained ? '💪' : done ? '✓' : '👉'}
      </button>
    )
  }
  return (
    <Button variant="secondary" className="w-full" disabled={!allowed} loading={send.isPending} onClick={() => send.mutate(friend.id)}>
      {trained ? `${friend.name} trained today 💪` : done ? 'Nudged ✓ Their gorilla will tell them' : `👉 Nudge ${friend.name}`}
    </Button>
  )
}

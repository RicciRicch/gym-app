import type { CSSProperties } from 'react'
import { Avatar } from '../../components/ui'
import { togetherLine, withNames } from '../../lib/friends'
import { avatarPhotoUrl } from '../avatar/api'
import { useFriends, useTogether, type Friend } from './api'

function useAcceptedFriends(): Friend[] {
  const friends = useFriends()
  return friends.data?.filter((f) => f.status === 'accepted') ?? []
}

/**
 * "Training with": tap the friends who train along. Shows nothing for a user
 * without friends. Used before a workout and in the running workout's sheet.
 */
export function PartnerPicker({
  value,
  onChange,
  className = '',
}: {
  value: readonly string[]
  onChange: (ids: string[]) => void
  className?: string
}) {
  const friends = useAcceptedFriends()
  const together = useTogether()
  if (friends.length === 0) return null
  // The usual gym buddies first.
  const sorted = [...friends].sort((a, b) => (together.get(b.id)?.count ?? 0) - (together.get(a.id)?.count ?? 0))

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold">Training with</p>
        <p className="text-xs text-muted">{value.length === 0 ? 'tap who joins you' : 'counts as a workout together'}</p>
      </div>
      <ul className="-mx-1 mt-2 flex gap-1 overflow-x-auto px-1 pb-1">
        {sorted.map((friend) => {
          const selected = value.includes(friend.id)
          return (
            <li key={friend.id} className="shrink-0">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(selected ? value.filter((id) => id !== friend.id) : [...value, friend.id])}
                className="flex w-16 flex-col items-center gap-1 rounded-2xl py-1.5 transition active:scale-95"
              >
                <span className="relative">
                  <Avatar
                    avatarKey={friend.avatarKey}
                    photoUrl={avatarPhotoUrl(friend.avatarPath)}
                    className={`size-12 transition ${selected ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : 'opacity-60'}`}
                  />
                  {selected && (
                    <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-accent text-xs font-black text-accent-ink" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </span>
                <span className={`w-full truncate text-center text-xs font-semibold ${selected ? 'text-text' : 'text-muted'}`}>{friend.name}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * The partners of the running workout, small: overlapping avatars and "With Ana".
 * Without partners it is a quiet "+ Buddy" (hidden when the user has no friends).
 */
export function PartnerChip({ ids, onClick, className = '' }: { ids: readonly string[]; onClick: () => void; className?: string }) {
  const friends = useAcceptedFriends()
  if (friends.length === 0) return null
  const partners = friends.filter((f) => ids.includes(f.id))

  if (partners.length === 0) {
    return (
      <button onClick={onClick} className={`min-h-11 px-2 text-sm font-semibold text-muted ${className}`}>
        + Buddy
      </button>
    )
  }
  const label = withNames(partners.map((p) => p.name))
  return (
    <button onClick={onClick} aria-label={`${label}. Change`} className={`flex min-h-11 min-w-0 items-center gap-1.5 px-1 ${className}`}>
      <span className="flex shrink-0 -space-x-2">
        {partners.slice(0, 3).map((p) => (
          <Avatar key={p.id} avatarKey={p.avatarKey} photoUrl={avatarPhotoUrl(p.avatarPath)} className="size-7 ring-2 ring-bg" />
        ))}
      </span>
      <span className="truncate text-sm text-muted">{partners.length === 1 ? `with ${partners[0].name}` : `+${partners.length - 1}`}</span>
    </button>
  )
}

/** On the summary: who the finished workout was with, and which one together it was. */
export function TrainedWith({ ids, className = '', style }: { ids: readonly string[]; className?: string; style?: CSSProperties }) {
  const friends = useAcceptedFriends()
  const together = useTogether()
  const partners = friends.filter((f) => ids.includes(f.id))
  if (partners.length === 0) return null

  return (
    <div className={`flex items-center gap-3 rounded-3xl border border-line bg-surface p-4 text-left ${className}`} style={style}>
      <span className="flex shrink-0 -space-x-3">
        {partners.slice(0, 3).map((p) => (
          <Avatar key={p.id} avatarKey={p.avatarKey} photoUrl={avatarPhotoUrl(p.avatarPath)} className="size-11 ring-2 ring-surface" />
        ))}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-bold">{withNames(partners.map((p) => p.name))}</span>
        <span className="block text-sm text-muted">
          {partners.length === 1
            ? togetherLine(partners[0].name, Math.max(1, together.get(partners[0].id)?.count ?? 1))
            : 'Counted for each of them.'}
        </span>
      </span>
    </div>
  )
}

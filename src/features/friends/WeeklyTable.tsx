import { useMemo } from 'react'
import { Avatar } from '../../components/ui'
import { tableLine, weeklyTable, type TableRow } from '../../lib/friends'
import { startOfWeek, toISODate } from '../../lib/schedule'
import { avatarPhotoUrl } from '../avatar/api'
import { useAuth } from '../auth/auth-context'
import { useProfile } from '../auth/useProfile'
import { useLoggedSets } from '../progress/api'
import { useFriends } from './api'

interface Row extends TableRow {
  avatarKey: string
  avatarPath: string | null
}

/** This week's ranking of the user and their friends. null until loaded or without friends. */
function useWeeklyTable(): { rows: Row[]; line: string } | null {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const friends = useFriends()
  const sets = useLoggedSets()
  const today = toISODate(new Date())

  return useMemo(() => {
    const accepted = friends.data?.filter((f) => f.status === 'accepted') ?? []
    if (!user || !profile || !sets.data || accepted.length === 0) return null
    const weekStart = startOfWeek(today)
    const mine = sets.data.filter((s) => s.date >= weekStart)
    const avatars = new Map([[user.id, profile], ...accepted.map((f) => [f.id, { avatar_key: f.avatarKey, avatar_path: f.avatarPath }] as const)])
    const table = weeklyTable([
      { id: user.id, name: 'You', days: new Set(mine.map((s) => s.date)).size, sets: mine.length, me: true },
      ...accepted.map((f) => ({ id: f.id, name: f.name, days: f.weekDays, sets: f.weekSets })),
    ])
    return {
      rows: table.map((r) => ({ ...r, avatarKey: avatars.get(r.id)!.avatar_key, avatarPath: avatars.get(r.id)!.avatar_path })),
      line: tableLine(table, today),
    }
  }, [user, profile, friends.data, sets.data, today])
}

/** The weekly table on Friends: who logged the most sets since Monday. */
export function WeeklyTable({ className = '' }: { className?: string }) {
  const table = useWeeklyTable()
  if (!table) return null

  return (
    <section className={`rounded-3xl border border-line bg-surface p-4 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-bold">This week</h2>
        <span className="text-xs font-semibold tracking-widest text-muted uppercase">Sets</span>
      </div>
      {table.line && <p className="mt-1 text-sm text-muted">🦍 {table.line}</p>}
      <ol className="mt-3 flex flex-col gap-1.5">
        {table.rows.map((r) => (
          <li
            key={r.id}
            className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 ${r.me ? 'border border-accent/40 bg-accent/10' : 'bg-surface-2'}`}
          >
            <span className="w-6 text-center text-sm font-black text-muted tabular-nums">
              {r.place === 1 && r.sets > 0 ? (
                <span className="crown-bob text-base" role="img" aria-label="First place">
                  👑
                </span>
              ) : (
                r.place
              )}
            </span>
            <Avatar avatarKey={r.avatarKey} photoUrl={avatarPhotoUrl(r.avatarPath)} className="size-8 shrink-0" />
            <span className="min-w-0 flex-1 truncate font-semibold">{r.name}</span>
            <span className="text-xs text-muted">
              {r.days} {r.days === 1 ? 'day' : 'days'}
            </span>
            <span className={`w-9 text-right text-lg font-black tabular-nums ${r.me ? 'text-accent' : ''}`}>{r.sets}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

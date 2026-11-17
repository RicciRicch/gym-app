import type { CSSProperties } from 'react'
import { durationLabel } from '../../lib/feed'

export interface PostStats {
  dayName: string
  durationSeconds: number
  sets: number
  exercises: number
  prCount: number
}

const statLine = (s: PostStats) =>
  `${durationLabel(s.durationSeconds)} · ${s.sets} ${s.sets === 1 ? 'set' : 'sets'} · ${s.exercises} ${s.exercises === 1 ? 'exercise' : 'exercises'}`

/** A workout photo as an instant print: picture on top, the workout written underneath. */
export function Polaroid({
  photoUrl,
  stats,
  develop = false,
  className = '',
  style,
}: {
  photoUrl: string
  stats: PostStats
  /** Let the picture develop from white (right after it was taken). */
  develop?: boolean
  className?: string
  style?: CSSProperties
}) {
  return (
    <figure className={`rounded-md bg-[#f3f0e8] p-2.5 pb-3 text-left shadow-[0_18px_40px_-12px_rgb(0_0_0/0.7)] ${className}`} style={style}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-[3px] bg-neutral-300">
        <img src={photoUrl} alt={`Photo after ${stats.dayName}`} className={`size-full object-cover ${develop ? 'photo-develop' : ''}`} />
        {stats.prCount > 0 && <PrStamp count={stats.prCount} className="absolute top-3 right-3" />}
      </div>
      <figcaption className="px-1 pt-2.5">
        <span className="block truncate text-lg leading-tight font-black text-neutral-900">{stats.dayName}</span>
        <span className="block truncate text-sm text-neutral-500">{statLine(stats)}</span>
      </figcaption>
    </figure>
  )
}

/** The same workout without a photo: a quiet stats card. */
export function StatsCard({ stats, className = '', style }: { stats: PostStats; className?: string; style?: CSSProperties }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-surface-2 px-5 py-5 text-left ${className}`} style={style}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 size-44 rounded-full bg-accent/15 blur-2xl"
      />
      <span className="relative block text-2xl leading-tight font-black">{stats.dayName}</span>
      <span className="relative mt-1 block text-muted">{statLine(stats)}</span>
      {stats.prCount > 0 && <PrStamp count={stats.prCount} className="relative mt-3 inline-block" />}
    </div>
  )
}

function PrStamp({ count, className = '' }: { count: number; className?: string }) {
  return (
    <span className={`rotate-6 rounded-lg bg-accent px-2.5 py-1 text-sm font-black text-accent-ink italic shadow-lg ${className}`}>
      {count > 1 ? `${count} NEW PRs` : 'NEW PR'}
    </span>
  )
}

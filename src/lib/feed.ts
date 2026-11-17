// Pure logic for the friends feed: post photos (crop and size), reactions,
// what a post card says, and the unread count.

import { pick } from './gorilla'

/** Friends see posts for this many days; the owner's app deletes older ones. */
export const POST_DAYS = 30
/** Post photos are portrait 4:5, at most this wide. */
export const PHOTO_WIDTH = 1080
export const PHOTO_ASPECT = 4 / 5

export const REACTIONS = ['fire', 'bump', 'crown'] as const
export type ReactionKind = (typeof REACTIONS)[number]
export const REACTION_LABELS: Record<ReactionKind, string> = { fire: 'Fire', bump: 'Fist bump', crown: 'Beast' }

export const isReaction = (kind: string): kind is ReactionKind => (REACTIONS as readonly string[]).includes(kind)

/** The largest centred rectangle of `aspect` (width / height) inside a frame: source rect for drawImage. */
export function coverCrop(width: number, height: number, aspect = PHOTO_ASPECT) {
  const sw = Math.min(width, height * aspect)
  const sh = sw / aspect
  return { sx: Math.round((width - sw) / 2), sy: Math.round((height - sh) / 2), sw: Math.round(sw), sh: Math.round(sh) }
}

/** Output size for a crop: never upscaled, at most PHOTO_WIDTH wide. */
export function photoSize(cropWidth: number, aspect = PHOTO_ASPECT) {
  const width = Math.max(1, Math.min(PHOTO_WIDTH, Math.round(cropWidth)))
  return { width, height: Math.round(width / aspect) }
}

/** Storage path in the user's own folder (required by the storage policies). */
export function workoutPhotoPath(userId: string, mimeType: string, id: string): string {
  return `${userId}/${id}.${mimeType === 'image/webp' ? 'webp' : 'jpg'}`
}

const DAY_MS = 86_400_000

/** True once a post is older than POST_DAYS. */
export function isExpired(createdAt: string, now: Date): boolean {
  return now.getTime() - new Date(createdAt).getTime() > POST_DAYS * DAY_MS
}

/** "just now", "25 min ago", "3 h ago", "yesterday", "4 days ago", "12 Nov". */
export function postAgo(createdAt: string, now: Date): string {
  const then = new Date(createdAt)
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 24 * 60 && then.getDate() === now.getDate()) return `${Math.floor(minutes / 60)} h ago`
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((midnight(now) - midnight(then)) / DAY_MS)
  if (days <= 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** "New PR: Bench Press", "New PRs: Bench Press, Squat", "New PRs: Bench Press, Squat +2". */
export function prLine(names: readonly string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return `New PR: ${names[0]}`
  const shown = names.slice(0, 2).join(', ')
  return `New PRs: ${shown}${names.length > 2 ? ` +${names.length - 2}` : ''}`
}

export interface ReactionRow {
  postId: string
  userId: string
  kind: string
}

export interface PostReactions {
  counts: Record<ReactionKind, number>
  mine: ReactionKind | null
  /** Who reacted, in the order the rows came. */
  userIds: string[]
}

/** Reactions per post: counts per kind, the viewer's own pick and who reacted. Unknown kinds are ignored. */
export function groupReactions(rows: readonly ReactionRow[], me: string): Map<string, PostReactions> {
  const map = new Map<string, PostReactions>()
  for (const row of rows) {
    if (!isReaction(row.kind)) continue
    let entry = map.get(row.postId)
    if (!entry) {
      entry = { counts: { fire: 0, bump: 0, crown: 0 }, mine: null, userIds: [] }
      map.set(row.postId, entry)
    }
    entry.counts[row.kind] += 1
    entry.userIds.push(row.userId)
    if (row.userId === me) entry.mine = row.kind
  }
  return map
}

/** "Ana reacted", "Ana and Marko reacted", "Ana, Marko and 2 others reacted". */
export function reactedLine(names: readonly string[]): string {
  if (names.length === 0) return ''
  if (names.length === 1) return `${names[0]} reacted`
  if (names.length === 2) return `${names[0]} and ${names[1]} reacted`
  const others = names.length - 2
  return `${names[0]}, ${names[1]} and ${others} ${others === 1 ? 'other' : 'others'} reacted`
}

/** Friends' posts newer than the last time the feed was opened. */
export function unseenCount(posts: readonly { userId: string; createdAt: string }[], me: string, seenAt: string | null): number {
  if (!seenAt) return 0
  return posts.filter((p) => p.userId !== me && p.createdAt > seenAt).length
}

/** The gorilla on the photo step, picked per day. */
export function proofLine(seed: string, hasPr: boolean): string {
  return pick(
    hasPr
      ? ['A PR without a photo? Never happened.', 'Records like this need evidence.', 'Smile. The record books are watching.']
      : ['Proof or it didn’t happen.', 'Post-workout glow. Capture it.', 'Show them you showed up.'],
    seed,
  )
}

/** "45 min", "1 h 05 min": workout length on a post. */
export function durationLabel(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`
}

import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Sheet } from '../../components/Sheet'
import { Avatar, Button } from '../../components/ui'
import { REACTIONS, REACTION_LABELS, postAgo, prLine, reactedLine, type PostReactions, type ReactionKind } from '../../lib/feed'
import { useDeletePost, useReact, type Post } from './api'
import { Polaroid, StatsCard } from './Polaroid'

export interface PostAuthor {
  name: string
  avatarKey: string
  photoUrl: string | null
}

const svg = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const REACTION_ICONS: Record<ReactionKind, ReactNode> = {
  fire: svg(<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 1.6 1.2 2.6 2.5 3-1-2.8-.6-5.6 0-8Z" />),
  bump: svg(
    <path d="M6 11V8.5a1.5 1.5 0 0 1 3 0V10m0-.5v-2a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V10m0-.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1a5 5 0 0 1-5-5v-4h5.5a2 2 0 0 1 0 4H9" />,
  ),
  crown: svg(<path d="M4 19h16M5 16 3.5 7.5l5 3.5L12 5l3.5 6 5-3.5L19 16H5Z" />),
}

/** One post in the feed: who and when, the print (or a stats card), PRs by name, reactions. */
export function PostCard({
  post,
  author,
  mine,
  reactions,
  reactorNames,
  tilt,
}: {
  post: Post
  author: PostAuthor
  mine: boolean
  reactions: PostReactions | undefined
  /** Names of the people who reacted (only shown to the author). */
  reactorNames: string[]
  /** Slight alternating tilt so the prints look like a pile, not a grid. */
  tilt: number
}) {
  const [confirm, setConfirm] = useState(false)
  const stats = {
    dayName: post.dayName,
    durationSeconds: post.durationSeconds,
    sets: post.sets,
    exercises: post.exercises,
    prCount: post.prNames.length,
  }
  const header = (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <Avatar avatarKey={author.avatarKey} photoUrl={author.photoUrl} className="size-10 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate font-bold">{mine ? 'You' : author.name}</span>
        <span className="block truncate text-sm text-muted">{postAgo(post.createdAt, new Date())}</span>
      </span>
    </span>
  )

  return (
    <article className="flex flex-col">
      <div className="flex items-center gap-2">
        {mine ? header : <Link to={`/friends/${post.userId}`} className="flex min-w-0 flex-1 transition active:scale-[0.98]">{header}</Link>}
        {mine && (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            aria-label="Delete post"
            className="grid size-11 shrink-0 place-items-center rounded-full text-muted transition active:scale-90"
          >
            {svg(<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />)}
          </button>
        )}
      </div>

      <div className="mt-3 flex justify-center">
        {post.photoUrl ? (
          <Polaroid photoUrl={post.photoUrl} stats={stats} className="w-[92%]" style={{ transform: `rotate(${tilt}deg)` }} />
        ) : (
          <StatsCard stats={stats} className="w-full" />
        )}
      </div>

      {post.prNames.length > 0 && (
        <p className="mt-4 flex items-center gap-2 font-bold text-accent">
          {svg(<path d="M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 20h8" />)}
          <span className="min-w-0 truncate">{prLine(post.prNames)}</span>
        </p>
      )}

      <ReactionBar post={post} mine={mine} reactions={reactions} />
      {mine && reactorNames.length > 0 && <p className="mt-1.5 text-sm text-muted">{reactedLine(reactorNames)}</p>}

      {confirm && <DeletePostSheet post={post} onClose={() => setConfirm(false)} />}
    </article>
  )
}

function ReactionBar({ post, mine, reactions }: { post: Post; mine: boolean; reactions: PostReactions | undefined }) {
  const react = useReact()
  const current = reactions?.mine ?? null
  return (
    <div className="mt-3 flex gap-2" role={mine ? undefined : 'group'} aria-label={mine ? undefined : 'React'}>
      {REACTIONS.map((kind) => {
        const count = reactions?.counts[kind] ?? 0
        const selected = current === kind
        if (mine && count === 0) return null
        const content = (
          <>
            {REACTION_ICONS[kind]}
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </>
        )
        return mine ? (
          <span key={kind} className="flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-3.5 text-sm font-bold text-muted" aria-label={`${REACTION_LABELS[kind]}: ${count}`}>
            {content}
          </span>
        ) : (
          <button
            key={kind}
            type="button"
            aria-pressed={selected}
            aria-label={`${REACTION_LABELS[kind]}${count ? `, ${count}` : ''}`}
            onClick={() => react.mutate({ postId: post.id, kind: selected ? null : kind, previous: current })}
            className={`flex min-h-11 min-w-14 items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-bold transition active:scale-90 ${
              selected ? 'bg-accent text-accent-ink' : 'bg-surface text-muted'
            }`}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}

function DeletePostSheet({ post, onClose }: { post: Post; onClose: () => void }) {
  const remove = useDeletePost()
  return (
    <Sheet title="Delete this post?" onClose={onClose}>
      <p className="text-muted">Your friends will no longer see it{post.photoPath ? ', and the photo is deleted' : ''}. The workout itself stays.</p>
      {remove.isError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          Could not delete it. Try again.
        </p>
      )}
      <div className="mt-5 flex flex-col gap-2 pb-2">
        <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(post, { onSuccess: onClose })}>
          Delete post
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Keep it
        </Button>
      </div>
    </Sheet>
  )
}

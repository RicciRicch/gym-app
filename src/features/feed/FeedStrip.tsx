import { Link } from 'react-router-dom'
import { Avatar } from '../../components/ui'
import { latestPerAuthor, postAgo } from '../../lib/feed'
import { useFeed, useFeedSeenAt, type Post } from './api'
import type { PostAuthor } from './PostCard'

/**
 * The feed's doorway on the Friends page: a row of tiny prints, each friend's
 * newest post (unseen ones lifted and dotted). A print opens the feed at that
 * post; the last tile opens the whole feed.
 */
export function FeedStrip({ authors, me, className = '' }: { authors: ReadonlyMap<string, PostAuthor>; me: string | undefined; className?: string }) {
  const feed = useFeed()
  const seenAt = useFeedSeenAt()
  const posts = (feed.data?.posts ?? []).filter((p) => authors.has(p.userId))
  const latest = latestPerAuthor(posts)
  const isNew = (p: Post) => p.userId !== me && !!seenAt && p.createdAt > seenAt
  const fresh = posts.filter(isNew).length

  return (
    <section className={className} aria-label="Feed">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold tracking-widest text-muted uppercase">Feed</h2>
        {fresh > 0 && <span className="rounded-full bg-accent px-2 text-xs leading-5 font-black text-accent-ink">{fresh} new</span>}
        <Link to="/feed" className="ml-auto flex min-h-11 items-center gap-0.5 text-sm font-semibold text-accent">
          See all
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </Link>
      </div>

      {feed.isPending ? (
        <div className="mt-1 flex gap-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-32 w-[5.5rem] animate-pulse rounded-md bg-surface" />
          ))}
        </div>
      ) : latest.length === 0 ? (
        <Link to="/feed" className="mt-1 flex min-h-14 items-center gap-3 rounded-2xl bg-surface px-4 text-sm text-muted transition active:scale-[0.98]">
          <CameraIcon />
          <span className="min-w-0 flex-1">No posts yet. Finish a workout and post the proof.</span>
        </Link>
      ) : (
        <ul className="-mx-5 mt-1 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pt-2 pb-3 [scrollbar-width:none]">
          {latest.map((post, i) => (
            <li key={post.id} className="snap-start">
              <MiniPrint post={post} author={authors.get(post.userId)!} mine={post.userId === me} fresh={isNew(post)} tilt={i % 2 === 0 ? -2 : 2} />
            </li>
          ))}
          <li className="snap-start">
            <Link
              to="/feed"
              className="flex h-[7.6rem] w-[5.5rem] flex-col items-center justify-center gap-1.5 rounded-md bg-surface text-sm font-semibold text-muted transition active:scale-95"
            >
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
              All posts
            </Link>
          </li>
        </ul>
      )}
    </section>
  )
}

function MiniPrint({ post, author, mine, fresh, tilt }: { post: Post; author: PostAuthor; mine: boolean; fresh: boolean; tilt: number }) {
  const name = mine ? 'You' : author.name
  return (
    <Link
      to={`/feed#post-${post.id}`}
      aria-label={`${name}: ${post.dayName}, ${postAgo(post.createdAt, new Date())}${fresh ? ', new' : ''}`}
      className={`block w-[5.5rem] transition active:scale-95 ${fresh ? '-translate-y-1' : ''}`}
    >
      <span className="relative block">
        <span
          className={`block rounded-[4px] bg-[#f3f0e8] p-1 pb-3 shadow-[0_10px_20px_-10px_rgb(0_0_0/0.8)] ${fresh ? '' : 'opacity-80'}`}
          style={{ transform: `rotate(${tilt}deg)` }}
        >
          {post.photoUrl ? (
            <img src={post.photoUrl} alt="" className="aspect-[4/5] w-full rounded-[2px] object-cover" loading="lazy" />
          ) : (
            <span className="flex aspect-[4/5] w-full flex-col justify-end rounded-[2px] bg-surface-2 p-1.5 text-left">
              <span className="truncate text-xs leading-tight font-black text-text">{post.dayName}</span>
              <span className="text-[10px] text-muted">{post.sets} sets</span>
            </span>
          )}
          {post.prNames.length > 0 && (
            <span className="absolute top-2 left-1.5 -rotate-6 rounded bg-accent px-1 text-[9px] leading-4 font-black text-accent-ink italic">PR</span>
          )}
        </span>
        <Avatar avatarKey={author.avatarKey} photoUrl={author.photoUrl} className="absolute -bottom-2 -left-1 size-7 ring-2 ring-bg" />
        {fresh && <span className="absolute -top-1 -right-1 size-3 rounded-full bg-accent ring-2 ring-bg" aria-hidden="true" />}
      </span>
      <span className={`mt-3 block truncate text-center text-xs font-bold ${fresh ? 'text-text' : 'text-muted'}`}>{name}</span>
      <span className="block truncate text-center text-[11px] text-muted">{postAgo(post.createdAt, new Date())}</span>
    </Link>
  )
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.6l1.4-2h7l1.4 2h1.6A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-9Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

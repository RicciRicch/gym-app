import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Mascot } from '../components/Mascot'
import { PageLoader } from '../components/ui'
import { useAuth } from '../features/auth/auth-context'
import { markFeedSeen, useFeed } from '../features/feed/api'
import { usePostAuthors } from '../features/feed/authors'
import { PostCard } from '../features/feed/PostCard'
import { useFriends } from '../features/friends/api'
import { POST_DAYS } from '../lib/feed'

/** Your friends' posted workouts (and yours) from the last 30 days, newest first. */
export function FeedPage() {
  const { user } = useAuth()
  const friends = useFriends()
  const feed = useFeed()
  const authors = usePostAuthors()
  const { hash } = useLocation()
  const accepted = (friends.data ?? []).filter((f) => f.status === 'accepted')

  // Opening the feed reads it: clears the dot on the header icon.
  const newest = feed.data?.posts[0]?.createdAt
  useEffect(() => {
    if (user) markFeedSeen(user.id)
  }, [user, newest])

  // Posts of people who are no longer friends drop out on the next fetch; hide them meanwhile.
  const posts = (feed.data?.posts ?? []).filter((p) => authors.has(p.userId))

  // Opened from a print on the Friends page: jump to that post (after the layout's scroll to top).
  const ready = posts.length > 0
  useEffect(() => {
    if (!ready || !hash.startsWith('#post-')) return
    const timer = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }), 60)
    return () => clearTimeout(timer)
  }, [ready, hash])

  return (
    <div className="animate-fade-up">
      <Link to="/friends" className="-ml-1 inline-flex min-h-11 items-center gap-1 pt-2 font-semibold text-muted">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m15 6-6 6 6 6" />
        </svg>
        Friends
      </Link>
      <h1 className="text-3xl font-black tracking-tight">Feed</h1>

      {feed.isPending || friends.isPending ? (
        <PageLoader label="Loading the feed" />
      ) : feed.isError ? (
        <div className="pt-10 text-center">
          <p className="font-bold">Could not load the feed</p>
          <button className="mt-2 min-h-11 px-4 font-semibold text-accent" onClick={() => feed.refetch()}>
            Try again
          </button>
        </div>
      ) : accepted.length === 0 && posts.length === 0 ? (
        <Empty
          pose="sad"
          title="Nobody to show off to"
          text="Add a gym buddy and you will see each other's workouts here."
          action={{ to: '/friends', label: 'Add friends' }}
        />
      ) : posts.length === 0 ? (
        <Empty pose="coach" title="Quiet in here" text="Finish a workout and post the proof. Your friends' posts show up here too." />
      ) : (
        <>
          <ul className="mt-6 flex flex-col gap-10">
            {posts.map((post, i) => (
              <li key={post.id} id={`post-${post.id}`} className="scroll-mt-24">
                <PostCard
                  post={post}
                  author={authors.get(post.userId)!}
                  mine={post.userId === user?.id}
                  reactions={feed.data?.reactions[post.id]}
                  reactorNames={(feed.data?.reactions[post.id]?.userIds ?? []).flatMap((id) => {
                    const name = authors.get(id)?.name
                    return name && id !== user?.id ? [name] : []
                  })}
                  tilt={i % 2 === 0 ? -1.2 : 1}
                />
              </li>
            ))}
          </ul>
          <p className="mt-10 text-center text-sm text-muted">Posts disappear after {POST_DAYS} days.</p>
        </>
      )}
    </div>
  )
}

function Empty({ pose, title, text, action }: { pose: 'sad' | 'coach'; title: string; text: string; action?: { to: string; label: string } }) {
  return (
    <div className="mt-10 flex flex-col items-center text-center">
      <Mascot pose={pose} className="h-32" />
      <p className="mt-3 text-lg font-bold">{title}</p>
      <p className="mt-1 text-balance text-muted">{text}</p>
      {action && (
        <Link to={action.to} className="mt-5 inline-flex min-h-12 items-center rounded-2xl bg-accent px-5 font-bold text-accent-ink active:scale-[0.97]">
          {action.label}
        </Link>
      )}
    </div>
  )
}

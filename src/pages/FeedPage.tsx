import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Mascot } from '../components/Mascot'
import { PageLoader } from '../components/ui'
import { useAuth } from '../features/auth/auth-context'
import { useProfile } from '../features/auth/useProfile'
import { avatarPhotoUrl } from '../features/avatar/api'
import { markFeedSeen, useFeed } from '../features/feed/api'
import { PostCard, type PostAuthor } from '../features/feed/PostCard'
import { SocialTabs } from '../features/feed/SocialTabs'
import { useFriends } from '../features/friends/api'
import { POST_DAYS } from '../lib/feed'

/** Your friends' posted workouts (and yours) from the last 30 days, newest first. */
export function FeedPage() {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const friends = useFriends()
  const feed = useFeed()
  const all = friends.data ?? []
  const incoming = all.filter((f) => f.status === 'incoming')
  const accepted = all.filter((f) => f.status === 'accepted')

  const authors = useMemo(() => {
    const map = new Map<string, PostAuthor>()
    for (const f of accepted) map.set(f.id, { name: f.name, avatarKey: f.avatarKey, photoUrl: avatarPhotoUrl(f.avatarPath) })
    if (user && profile) map.set(user.id, { name: profile.display_name, avatarKey: profile.avatar_key, photoUrl: avatarPhotoUrl(profile.avatar_path) })
    return map
  }, [accepted, user, profile])

  // Opening the feed reads it: clears the dot on the header icon.
  const newest = feed.data?.posts[0]?.createdAt
  useEffect(() => {
    if (user) markFeedSeen(user.id)
  }, [user, newest])

  // Posts of people who are no longer friends drop out on the next fetch; hide them meanwhile.
  const posts = (feed.data?.posts ?? []).filter((p) => authors.has(p.userId))

  return (
    <div className="animate-fade-up">
      <SocialTabs active="feed" requests={incoming.length} />

      {incoming.length > 0 && (
        <Link to="/friends" className="mt-4 flex min-h-14 items-center gap-3 rounded-2xl bg-accent/10 px-4 font-semibold transition active:scale-[0.98]">
          <span className="min-w-0 flex-1 truncate">
            {incoming.length === 1 ? `${incoming[0].name} wants to train with you` : `${incoming.length} friend requests`}
          </span>
          <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </Link>
      )}

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
              <li key={post.id}>
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

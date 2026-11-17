import { useEffect, useSyncExternalStore } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { POST_DAYS, groupReactions, isExpired, unseenCount, workoutPhotoPath, type PostReactions, type ReactionKind } from '../../lib/feed'
import { supabase } from '../../lib/supabase'
import type { WorkoutSummary } from '../../lib/summary'
import { useAuth } from '../auth/auth-context'

const BUCKET = 'workout-photos'
/** Signed photo links last this long; the feed refreshes well before. */
const LINK_SECONDS = 2 * 60 * 60

export interface Post {
  id: string
  userId: string
  workoutId: string
  dayName: string
  durationSeconds: number
  sets: number
  exercises: number
  prNames: string[]
  photoPath: string | null
  photoUrl: string | null
  createdAt: string
}

export interface Feed {
  posts: Post[]
  /** By post id. A plain object, not a Map: the query cache is saved as JSON for offline use. */
  reactions: Record<string, PostReactions>
}

const feedKey = (userId: string | undefined) => ['feed', userId] as const
const since = () => new Date(Date.now() - POST_DAYS * 86_400_000).toISOString()

/** Posts of the last 30 days from you and your friends (RLS decides who), newest first, with reactions. */
export function useFeed() {
  const { user } = useAuth()
  return useQuery({
    queryKey: [...feedKey(user?.id), 'posts'],
    enabled: !!user,
    staleTime: 0,
    // Signed links expire: never show a copy older than the links in it.
    gcTime: 30 * 60 * 1000,
    queryFn: async (): Promise<Feed> => {
      const { data, error } = await supabase
        .from('workout_posts')
        .select('*')
        .gt('created_at', since())
        .order('created_at', { ascending: false })
        .limit(60)
      if (error) throw error
      const ids = data.map((p) => p.id)
      const paths = data.flatMap((p) => (p.photo_path ? [p.photo_path] : []))
      const [reactions, links] = await Promise.all([
        ids.length
          ? supabase.from('post_reactions').select('post_id, user_id, kind').in('post_id', ids)
          : Promise.resolve({ data: [], error: null }),
        paths.length ? supabase.storage.from(BUCKET).createSignedUrls(paths, LINK_SECONDS) : Promise.resolve({ data: [], error: null }),
      ])
      if (reactions.error) throw reactions.error
      const urls = new Map((links.data ?? []).flatMap((l) => (l.path && l.signedUrl ? [[l.path, l.signedUrl] as const] : [])))
      return {
        posts: data.map((p) => ({
          id: p.id,
          userId: p.user_id,
          workoutId: p.workout_id,
          dayName: p.day_name,
          durationSeconds: p.duration_seconds,
          sets: p.sets,
          exercises: p.exercises,
          prNames: p.pr_names,
          photoPath: p.photo_path,
          photoUrl: p.photo_path ? (urls.get(p.photo_path) ?? null) : null,
          createdAt: p.created_at,
        })),
        reactions: Object.fromEntries(
          groupReactions(
            (reactions.data ?? []).map((r) => ({ postId: r.post_id, userId: r.user_id, kind: r.kind })),
            user!.id,
          ),
        ),
      }
    },
  })
}

/** Posts the finished workout (and its photo). Nothing is posted without this call. */
export function usePublishPost() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ workoutId, summary, photo }: { workoutId: string; summary: WorkoutSummary; photo: Blob | null }) => {
      let photoPath: string | null = null
      if (photo) {
        photoPath = workoutPhotoPath(user!.id, photo.type, crypto.randomUUID())
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(photoPath, photo, { contentType: photo.type, cacheControl: '86400', upsert: false })
        if (error) throw error
      }
      const { error } = await supabase.from('workout_posts').insert({
        workout_id: workoutId,
        day_name: summary.dayName,
        duration_seconds: Math.round(summary.durationSeconds),
        sets: summary.sets,
        exercises: summary.exercises,
        pr_names: summary.prs.map((pr) => pr.name).slice(0, 20),
        photo_path: photoPath,
      })
      if (error) {
        if (photoPath) await supabase.storage.from(BUCKET).remove([photoPath])
        throw error
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: feedKey(user?.id) }),
  })
}

export function useDeletePost() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (post: Pick<Post, 'id' | 'photoPath'>) => {
      const { error } = await supabase.from('workout_posts').delete().eq('id', post.id)
      if (error) throw error
      if (post.photoPath) await supabase.storage.from(BUCKET).remove([post.photoPath])
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: feedKey(user?.id) }),
  })
}

/** Sets (or with null, removes) your reaction to a friend's post. Optimistic. */
export function useReact() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = [...feedKey(user?.id), 'posts']
  return useMutation({
    mutationFn: async ({ postId, kind, previous }: { postId: string; kind: ReactionKind | null; previous: ReactionKind | null }) => {
      const mine = { post_id: postId, user_id: user!.id }
      const { error } =
        kind === null
          ? await supabase.from('post_reactions').delete().match(mine)
          : previous
            ? await supabase.from('post_reactions').update({ kind }).match(mine)
            : await supabase.from('post_reactions').insert({ post_id: postId, kind })
      if (error) throw error
    },
    onMutate: async ({ postId, kind, previous }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const before = queryClient.getQueryData<Feed>(key)
      if (before) {
        const entry = before.reactions[postId] ?? { counts: { fire: 0, bump: 0, crown: 0 }, mine: null, userIds: [] }
        const counts = { ...entry.counts }
        if (previous) counts[previous] -= 1
        if (kind) counts[kind] += 1
        const others = entry.userIds.filter((id) => id !== user!.id)
        const next = { counts, mine: kind, userIds: kind ? [...others, user!.id] : others }
        queryClient.setQueryData<Feed>(key, { ...before, reactions: { ...before.reactions, [postId]: next } })
      }
      return { before }
    },
    onError: (_error, _vars, context) => {
      if (context?.before) queryClient.setQueryData(key, context.before)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

// -------------------------------------------------------------- unread count
const seenKey = (userId: string) => `gym-app:feed-seen:${userId}`
const listeners = new Set<() => void>()

function readSeen(userId: string | undefined): string | null {
  if (!userId) return null
  try {
    return localStorage.getItem(seenKey(userId))
  } catch {
    return null
  }
}

/** Marks the feed as read up to now. */
export function markFeedSeen(userId: string) {
  try {
    localStorage.setItem(seenKey(userId), new Date().toISOString())
  } catch {
    /* the badge is a convenience */
  }
  listeners.forEach((fn) => fn())
}

/** Friends' posts since the feed was last opened (light query for the header). */
export function useUnseenPosts(): number {
  const { user } = useAuth()
  const seenAt = useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => readSeen(user?.id),
  )
  const latest = useQuery({
    queryKey: [...feedKey(user?.id), 'latest'],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_posts')
        .select('user_id, created_at')
        .gt('created_at', since())
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return data.map((p) => ({ userId: p.user_id, createdAt: p.created_at }))
    },
  })
  // First visit ever: start counting from now instead of showing a month of posts as new.
  useEffect(() => {
    if (user && latest.isSuccess && readSeen(user.id) === null) markFeedSeen(user.id)
  }, [user, latest.isSuccess])
  return user ? unseenCount(latest.data ?? [], user.id, seenAt) : 0
}

/** Deletes your own posts (and photos) older than 30 days. Once per app start, best effort. */
let cleaned = false
export function useCleanUpOldPosts() {
  const { user } = useAuth()
  useEffect(() => {
    if (!user || cleaned) return
    cleaned = true
    void (async () => {
      const { data } = await supabase
        .from('workout_posts')
        .select('id, photo_path, created_at')
        .eq('user_id', user.id)
        .lte('created_at', since())
      const old = (data ?? []).filter((p) => isExpired(p.created_at, new Date()))
      if (old.length === 0) return
      const photos = old.flatMap((p) => (p.photo_path ? [p.photo_path] : []))
      if (photos.length) await supabase.storage.from(BUCKET).remove(photos)
      await supabase.from('workout_posts').delete().in('id', old.map((p) => p.id))
    })()
  }, [user])
}

import { useMemo } from 'react'
import { useAuth } from '../auth/auth-context'
import { useProfile } from '../auth/useProfile'
import { avatarPhotoUrl } from '../avatar/api'
import { useFriends } from '../friends/api'
import type { PostAuthor } from './PostCard'

/** Who can appear in the feed: you and your accepted friends, by user id. */
export function usePostAuthors(): ReadonlyMap<string, PostAuthor> {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const friends = useFriends()
  return useMemo(() => {
    const map = new Map<string, PostAuthor>()
    for (const f of friends.data ?? []) {
      if (f.status === 'accepted') map.set(f.id, { name: f.name, avatarKey: f.avatarKey, photoUrl: avatarPhotoUrl(f.avatarPath) })
    }
    if (user && profile) map.set(user.id, { name: profile.display_name, avatarKey: profile.avatar_key, photoUrl: avatarPhotoUrl(profile.avatar_path) })
    return map
  }, [friends.data, user, profile])
}

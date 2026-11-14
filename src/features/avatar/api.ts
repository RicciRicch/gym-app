import { useMutation, useQueryClient } from '@tanstack/react-query'
import { avatarPhotoPath } from '../../lib/avatar'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/auth-context'

const BUCKET = 'avatars'

/** What the user picked: a preset, or their own photo (already uploaded, or new and still local). */
export interface AvatarChoice {
  preset: string
  photo: { path: string; url: string } | { blob: Blob; url: string } | null
  usePhoto: boolean
}

/** Public URL of an uploaded photo (no request; files are immutable, one name per upload). */
export function avatarPhotoUrl(path: string | null | undefined): string | null {
  return path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null
}

export function choiceFromProfile(profile: { avatar_key: string; avatar_path: string | null }): AvatarChoice {
  const url = avatarPhotoUrl(profile.avatar_path)
  return {
    preset: profile.avatar_key,
    photo: profile.avatar_path && url ? { path: profile.avatar_path, url } : null,
    usePhoto: !!profile.avatar_path,
  }
}

/** Uploads a new photo if one was picked; returns the columns to store on the profile. */
export async function resolveAvatarChoice(
  userId: string,
  choice: AvatarChoice,
): Promise<{ avatar_key: string; avatar_path: string | null; uploaded: string | null }> {
  if (!choice.usePhoto || !choice.photo) return { avatar_key: choice.preset, avatar_path: null, uploaded: null }
  if ('path' in choice.photo) return { avatar_key: choice.preset, avatar_path: choice.photo.path, uploaded: null }
  const { blob } = choice.photo
  const path = avatarPhotoPath(userId, blob.type, crypto.randomUUID())
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false })
  if (error) throw error
  return { avatar_key: choice.preset, avatar_path: path, uploaded: path }
}

/** Best effort: an orphaned file is harmless, so failures are ignored. */
export async function removeAvatarPhoto(path: string | null | undefined) {
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path])
}

export function useUpdateAvatar() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ choice, previousPath }: { choice: AvatarChoice; previousPath: string | null }) => {
      const { uploaded, ...columns } = await resolveAvatarChoice(user!.id, choice)
      const { data, error } = await supabase.from('profiles').update(columns).eq('id', user!.id).select().single()
      if (error) {
        await removeAvatarPhoto(uploaded)
        throw error
      }
      if (previousPath && previousPath !== columns.avatar_path) await removeAvatarPhoto(previousPath)
      return data
    },
    onSuccess: (profile) => queryClient.setQueryData(['profile', user?.id], profile),
  })
}

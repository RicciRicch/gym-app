import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from './auth-context'

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/

export const AVATAR_KEYS = ['avatar-1', 'avatar-2', 'avatar-3', 'avatar-4'] as const

const profileKey = (userId: string | undefined) => ['profile', userId] as const

export function useProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: profileKey(user?.id),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export class UsernameTakenError extends Error {
  constructor() {
    super('That username is already taken')
  }
}

export function useCreateProfile() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { username: string; display_name: string; avatar_key: string }) => {
      const { data, error } = await supabase
        .from('profiles')
        .insert({ id: user!.id, ...input })
        .select()
        .single()
      // 23505 = unique_violation on profiles.username
      if (error?.code === '23505') throw new UsernameTakenError()
      if (error) throw error
      return data
    },
    onSuccess: (profile) => queryClient.setQueryData(profileKey(user?.id), profile),
  })
}

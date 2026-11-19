import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Database } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/auth-context'

type Profile = Database['public']['Tables']['profiles']['Row']

export type PrivacySetting =
  | 'share_activity'
  | 'share_streak'
  | 'share_badges'
  | 'accept_requests'
  | 'accept_nudges'
  | 'ask_proof'
  | 'notify_nudges'
  | 'notify_friends'
  | 'notify_reactions'
  | 'notify_streak'

/** Flips one privacy switch; the screen updates at once and goes back if saving fails. */
export function useUpdatePrivacy() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = ['profile', user?.id]
  return useMutation({
    networkMode: 'always',
    mutationFn: async ({ setting, value }: { setting: PrivacySetting; value: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ [setting]: value } as Partial<Record<PrivacySetting, boolean>>)
        .eq('id', user!.id)
      if (error) throw error
    },
    onMutate: ({ setting, value }) => {
      const before = queryClient.getQueryData<Profile | null>(key)
      if (before) queryClient.setQueryData<Profile>(key, { ...before, [setting]: value })
      return { before }
    },
    onError: (_err, _vars, context) => {
      if (context?.before) queryClient.setQueryData(key, context.before)
    },
  })
}

/** The workout reminder time ('HH:MM' in the phone's time zone), or null to turn it off. */
export function useUpdateRemindTime() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = ['profile', user?.id]
  return useMutation({
    networkMode: 'always',
    mutationFn: async (time: string | null) => {
      const { error } = await supabase.from('profiles').update({ remind_time: time }).eq('id', user!.id)
      if (error) throw error
    },
    onMutate: (time) => {
      const before = queryClient.getQueryData<Profile | null>(key)
      if (before) queryClient.setQueryData<Profile>(key, { ...before, remind_time: time && `${time}:00` })
      return { before }
    },
    onError: (_err, _vars, context) => {
      if (context?.before) queryClient.setQueryData(key, context.before)
    },
  })
}

/** A new friend code: old invite links and QR codes stop working, friends stay. */
export function useRegenerateFriendCode() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = ['profile', user?.id]
  return useMutation({
    networkMode: 'always',
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('regenerate_friend_code')
      if (error) throw error
      return data
    },
    onSuccess: (code) => {
      const before = queryClient.getQueryData<Profile | null>(key)
      if (before) queryClient.setQueryData<Profile>(key, { ...before, friend_code: code })
    },
  })
}

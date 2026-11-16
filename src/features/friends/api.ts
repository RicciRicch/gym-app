import { useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { nudgeLine } from '../../lib/friends'
import { progressByExercise, prsByWorkout } from '../../lib/progress'
import { addDays, startOfWeek, toISODate, type ISODate } from '../../lib/schedule'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/auth-context'
import { useBadges } from '../badges/api'
import { useLoggedSets } from '../progress/api'
import { useStreak } from '../streak/api'

export interface Friend {
  friendshipId: string
  id: string
  name: string
  avatarKey: string
  avatarPath: string | null
  /** accepted = a friend; incoming = they asked; outgoing = waiting for them. */
  status: 'accepted' | 'incoming' | 'outgoing'
  since: string
  lastDate: ISODate | null
  lastDay: string | null
  weekDays: number
  weekSets: number
  /** Workout dates of the last four weeks. */
  recentDates: ISODate[]
  streakWeeks: number | null
  streakWeek: ISODate | null
  badgeIds: string[]
  prCount: number
}

const friendsKey = (userId: string | undefined) => ['friends', userId] as const
const nudgesKey = (userId: string | undefined) => ['friends', userId, 'nudges'] as const

/** Friends and open requests, with this week's activity for friends. */
export function useFriends() {
  const { user } = useAuth()
  const weekStart = startOfWeek(toISODate(new Date()))
  return useQuery({
    queryKey: [...friendsKey(user?.id), 'overview', weekStart],
    enabled: !!user,
    // Requests and friends' workouts come from other people: always check for news.
    staleTime: 0,
    queryFn: async (): Promise<Friend[]> => {
      const { data, error } = await supabase.rpc('friends_overview', { p_week_start: weekStart })
      if (error) throw error
      return data
        .map((r) => ({
          friendshipId: r.friendship_id,
          id: r.user_id,
          name: r.display_name,
          avatarKey: r.avatar_key,
          avatarPath: r.avatar_path,
          status: r.status,
          since: r.since,
          lastDate: r.last_workout_date,
          lastDay: r.last_workout_day,
          weekDays: r.week_days ?? 0,
          weekSets: r.week_sets ?? 0,
          recentDates: r.recent_dates ?? [],
          streakWeeks: r.streak_weeks,
          streakWeek: r.streak_week,
          badgeIds: r.badge_ids ?? [],
          prCount: r.pr_count ?? 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    },
  })
}

/** Who owns a friend code and how they relate to the user. null = nobody has that code. */
export function useFriendPreview(code: string | null) {
  const { user } = useAuth()
  return useQuery({
    queryKey: [...friendsKey(user?.id), 'preview', code],
    enabled: !!user && !!code,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('friend_preview', { p_code: code! })
      if (error) throw error
      return data[0] ?? null
    },
  })
}

function useFriendsCache() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: friendsKey(user?.id) })
}

/** Sends a request to the owner of a code. Resolves to 'accepted' when they had already asked. */
export function useSendFriendRequest() {
  const refresh = useFriendsCache()
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('send_friend_request', { p_code: code })
      if (error) throw error
      return data
    },
    onSuccess: refresh,
  })
}

export function useAcceptFriendRequest() {
  const refresh = useFriendsCache()
  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase.rpc('accept_friend_request', { p_id: friendshipId })
      if (error) throw error
    },
    onSuccess: refresh,
  })
}

/** Declines or cancels a request, or removes a friend. */
export function useRemoveFriendship() {
  const refresh = useFriendsCache()
  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
      if (error) throw error
    },
    onSuccess: refresh,
  })
}

/** Nudges from the last two days, sent and received. */
function useNudgeRows() {
  const { user } = useAuth()
  const today = toISODate(new Date())
  return useQuery({
    queryKey: [...nudgesKey(user?.id), today],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('nudges').select('*').gte('day', addDays(today, -1))
      if (error) throw error
      return data
    },
  })
}

/** Ids of the friends the user already nudged today. */
export function useNudgedToday(): ReadonlySet<string> {
  const { user } = useAuth()
  const { data } = useNudgeRows()
  const today = toISODate(new Date())
  return useMemo(
    () => new Set((data ?? []).filter((n) => n.from_id === user?.id && n.day === today).map((n) => n.to_id)),
    [data, user?.id, today],
  )
}

export function useSendNudge() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (friendId: string) => {
      const { error } = await supabase.from('nudges').insert({ to_id: friendId, day: toISODate(new Date()) })
      // 23505 = already nudged today: fine.
      if (error && error.code !== '23505') throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: nudgesKey(user?.id) }),
  })
}

/**
 * What the gorilla passes on from friends who nudged the user: a line for today,
 * or '' when there is nothing. Showing it marks the nudges as seen; a nudge keeps
 * showing for the rest of the day it was first seen.
 */
export function useNudgeLine(): string {
  const { user } = useAuth()
  const { data } = useNudgeRows()
  const friends = useFriends()
  const queryClient = useQueryClient()
  const today = toISODate(new Date())

  const received = useMemo(
    () => (data ?? []).filter((n) => n.to_id === user?.id && (!n.seen_at || toISODate(new Date(n.seen_at)) === today)),
    [data, user?.id, today],
  )
  const unseen = received.some((n) => !n.seen_at)

  useEffect(() => {
    if (!unseen || !user) return
    void supabase
      .from('nudges')
      .update({ seen_at: new Date().toISOString() })
      .eq('to_id', user.id)
      .is('seen_at', null)
      .then(() => queryClient.invalidateQueries({ queryKey: nudgesKey(user.id) }))
  }, [unseen, user, queryClient])

  return useMemo(() => {
    const names = [...new Set(received.map((n) => friends.data?.find((f) => f.id === n.from_id)?.name).filter((n): n is string => !!n))]
    return nudgeLine(names, today)
  }, [received, friends.data, today])
}

const publishedKey = (userId: string) => `gym-app:friend-stats:${userId}`

/**
 * Keeps the stats friends see (streak, badges, record count) up to date. They are
 * computed on the phone, so the app publishes them whenever they change.
 */
export function usePublishFriendStats() {
  const { user } = useAuth()
  const streak = useStreak()
  const badges = useBadges()
  const sets = useLoggedSets()

  const stats = useMemo(() => {
    if (!streak || !badges || !sets.data) return null
    let prCount = 0
    for (const ids of prsByWorkout(progressByExercise(sets.data)).values()) prCount += ids.size
    return {
      streak_weeks: streak.weeks,
      streak_week: startOfWeek(toISODate(new Date())),
      badge_ids: badges.filter((b) => b.earnedOn).map((b) => b.badge.id),
      pr_count: prCount,
    }
  }, [streak, badges, sets.data])

  useEffect(() => {
    if (!user || !stats) return
    const signature = JSON.stringify(stats)
    try {
      if (localStorage.getItem(publishedKey(user.id)) === signature) return
    } catch {
      /* storage blocked: publish every time */
    }
    void supabase
      .from('friend_stats')
      .upsert({ user_id: user.id, ...stats, updated_at: new Date().toISOString() })
      .then(({ error }) => {
        if (error) return
        try {
          localStorage.setItem(publishedKey(user.id), signature)
        } catch {
          /* ignore */
        }
      })
  }, [user, stats])
}

// Mirrors supabase/migrations. Regenerate with the Supabase MCP
// (generate_typescript_types) after every schema change.

type Rel<Name extends string, Col extends string, Ref extends string> = {
  foreignKeyName: Name
  columns: [Col]
  isOneToOne: false
  referencedRelation: Ref
  referencedColumns: ['id']
}

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' }
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string
          avatar_key: string
          avatar_path: string | null
          friend_code: string
          bodyweight_kg: number | null
          strength_sex: 'male' | 'female' | null
          share_activity: boolean
          share_streak: boolean
          share_badges: boolean
          accept_requests: boolean
          accept_nudges: boolean
          ask_proof: boolean
          notify_nudges: boolean
          notify_friends: boolean
          notify_reactions: boolean
          notify_streak: boolean
          /** Local 'HH:MM:SS'; null = no workout reminder. */
          remind_time: string | null
          created_at: string
        }
        Insert: {
          id: string
          username: string
          display_name: string
          avatar_key: string
          avatar_path?: string | null
          created_at?: string
        }
        Update: {
          username?: string
          display_name?: string
          avatar_key?: string
          avatar_path?: string | null
          bodyweight_kg?: number | null
          strength_sex?: 'male' | 'female' | null
          share_activity?: boolean
          share_streak?: boolean
          share_badges?: boolean
          accept_requests?: boolean
          accept_nudges?: boolean
          ask_proof?: boolean
          notify_nudges?: boolean
          notify_friends?: boolean
          notify_reactions?: boolean
          notify_streak?: boolean
          remind_time?: string | null
        }
        Relationships: []
      }
      exercise_units: {
        Row: {
          exercise_id: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          exercise_id: string
          unit: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          exercise_id?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_units_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          id: string
          user_id: string | null
          slug: string | null
          name: string
          muscles: string[]
          cues: string[]
          image_key: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          slug?: string | null
          name: string
          muscles?: string[]
          cues?: string[]
          image_key?: string | null
        }
        Update: {
          name?: string
          muscles?: string[]
          cues?: string[]
        }
        Relationships: []
      }
      splits: {
        Row: {
          id: string
          user_id: string
          name: string
          preset_key: string | null
          is_active: boolean
          mode: 'weekly' | 'rotating'
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          preset_key?: string | null
          is_active?: boolean
          mode?: 'weekly' | 'rotating'
        }
        Update: {
          name?: string
          is_active?: boolean
          mode?: 'weekly' | 'rotating'
        }
        Relationships: []
      }
      split_days: {
        Row: {
          id: string
          split_id: string
          user_id: string
          name: string
          weekday: number | null
          position: number
          rest_after: number
          created_at: string
        }
        Insert: {
          id?: string
          split_id: string
          user_id?: string
          name: string
          weekday?: number | null
          position?: number
          rest_after?: number
        }
        Update: {
          name?: string
          weekday?: number | null
          position?: number
          rest_after?: number
        }
        Relationships: [Rel<'split_days_split_id_fkey', 'split_id', 'splits'>]
      }
      split_day_exercises: {
        Row: {
          id: string
          split_day_id: string
          user_id: string
          exercise_id: string
          position: number
          target_sets: number
          target_reps: number
          created_at: string
        }
        Insert: {
          id?: string
          split_day_id: string
          user_id?: string
          exercise_id: string
          position?: number
          target_sets?: number
          target_reps?: number
        }
        Update: {
          position?: number
          target_sets?: number
          target_reps?: number
        }
        Relationships: [
          Rel<'split_day_exercises_exercise_id_fkey', 'exercise_id', 'exercises'>,
          Rel<'split_day_exercises_split_day_id_fkey', 'split_day_id', 'split_days'>,
        ]
      }
      schedule_overrides: {
        Row: {
          id: string
          user_id: string
          date: string
          split_day_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          date: string
          split_day_id?: string | null
        }
        Update: {
          date?: string
          split_day_id?: string | null
        }
        Relationships: [Rel<'schedule_overrides_split_day_id_fkey', 'split_day_id', 'split_days'>]
      }
      streak_freezes: {
        Row: {
          id: string
          user_id: string
          week_start: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          week_start: string
        }
        Update: {
          week_start?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          id: string
          user_id: string
          split_day_id: string | null
          day_name: string
          date: string
          started_at: string
          finished_at: string
          fuel: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          split_day_id?: string | null
          day_name: string
          date: string
          started_at: string
          finished_at: string
          fuel?: string[] | null
        }
        Update: {
          day_name?: string
          date?: string
          fuel?: string[] | null
        }
        Relationships: [Rel<'workouts_split_day_id_fkey', 'split_day_id', 'split_days'>]
      }
      workout_sets: {
        Row: {
          id: string
          workout_id: string
          user_id: string
          exercise_id: string
          exercise_position: number
          set_number: number
          reps: number
          weight_kg: number
          created_at: string
        }
        Insert: {
          id?: string
          workout_id: string
          user_id?: string
          exercise_id: string
          exercise_position?: number
          set_number: number
          reps: number
          weight_kg: number
        }
        Update: {
          reps?: number
          weight_kg?: number
        }
        Relationships: [
          Rel<'workout_sets_exercise_id_fkey', 'exercise_id', 'exercises'>,
          Rel<'workout_sets_workout_id_fkey', 'workout_id', 'workouts'>,
        ]
      }
      friendships: {
        Row: {
          id: string
          requester_id: string
          addressee_id: string
          status: 'pending' | 'accepted'
          created_at: string
          accepted_at: string | null
        }
        Insert: never
        Update: never
        Relationships: []
      }
      workout_posts: {
        Row: {
          id: string
          user_id: string
          workout_id: string
          day_name: string
          duration_seconds: number
          sets: number
          exercises: number
          pr_names: string[]
          photo_path: string | null
          created_at: string
        }
        Insert: {
          workout_id: string
          day_name: string
          duration_seconds: number
          sets: number
          exercises: number
          pr_names?: string[]
          photo_path?: string | null
        }
        Update: Record<string, never>
        Relationships: []
      }
      post_reactions: {
        Row: {
          post_id: string
          user_id: string
          kind: string
          created_at: string
        }
        Insert: {
          post_id: string
          kind: string
        }
        Update: {
          kind?: string
        }
        Relationships: []
      }
      workout_partners: {
        Row: {
          workout_id: string
          user_id: string
          friend_id: string
          day: string
          created_at: string
        }
        Insert: {
          workout_id: string
          friend_id: string
          day: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      rest_alarms: {
        Row: {
          user_id: string
          endpoint: string
          fires_at: string
          created_at: string
        }
        Insert: {
          user_id?: string
          endpoint: string
          fires_at: string
        }
        Update: {
          endpoint?: string
          fires_at?: string
        }
        Relationships: []
      }
      push_plans: {
        Row: {
          user_id: string
          time_zone: string
          mode: 'weekly' | 'rotating'
          days: { date: string; name: string }[]
          weekly_target: number
          updated_at: string
        }
        Insert: {
          user_id?: string
          time_zone: string
          mode: 'weekly' | 'rotating'
          days: { date: string; name: string }[]
          weekly_target: number
        }
        Update: {
          time_zone?: string
          mode?: 'weekly' | 'rotating'
          days?: { date: string; name: string }[]
          weekly_target?: number
        }
        Relationships: []
      }
      nudges: {
        Row: {
          id: string
          from_id: string
          to_id: string
          day: string
          created_at: string
          seen_at: string | null
        }
        Insert: {
          to_id: string
          day: string
        }
        Update: {
          seen_at?: string | null
        }
        Relationships: []
      }
      friend_stats: {
        Row: {
          user_id: string
          streak_weeks: number
          streak_week: string
          badge_ids: string[]
          pr_count: number
          updated_at: string
        }
        Insert: {
          user_id?: string
          streak_weeks: number
          streak_week: string
          badge_ids: string[]
          pr_count: number
          updated_at?: string
        }
        Update: {
          streak_weeks?: number
          streak_week?: string
          badge_ids?: string[]
          pr_count?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      friend_preview: {
        Args: { p_code: string }
        Returns: {
          id: string
          display_name: string
          avatar_key: string
          avatar_path: string | null
          relation: 'self' | 'friends' | 'sent' | 'received' | 'closed' | 'none'
        }[]
      }
      send_friend_request: {
        Args: { p_code: string }
        Returns: 'sent' | 'accepted' | 'friends'
      }
      accept_friend_request: {
        Args: { p_id: string }
        Returns: undefined
      }
      friends_overview: {
        Args: { p_week_start: string }
        Returns: {
          friendship_id: string
          user_id: string
          display_name: string
          avatar_key: string
          avatar_path: string | null
          status: 'accepted' | 'incoming' | 'outgoing'
          since: string
          last_workout_date: string | null
          last_workout_day: string | null
          week_days: number | null
          week_sets: number | null
          recent_dates: string[] | null
          streak_weeks: number | null
          streak_week: string | null
          badge_ids: string[] | null
          pr_count: number | null
          shares_activity: boolean
          shares_streak: boolean
          shares_badges: boolean
          accepts_nudges: boolean
        }[]
      }
      save_push_subscription: {
        Args: { p_endpoint: string; p_p256dh: string; p_auth: string }
        Returns: undefined
      }
      regenerate_friend_code: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

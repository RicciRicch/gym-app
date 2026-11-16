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
        }
        Relationships: []
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
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          preset_key?: string | null
          is_active?: boolean
        }
        Update: {
          name?: string
          is_active?: boolean
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
          created_at: string
        }
        Insert: {
          id?: string
          split_id: string
          user_id?: string
          name: string
          weekday?: number | null
          position?: number
        }
        Update: {
          name?: string
          weekday?: number | null
          position?: number
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
          relation: 'self' | 'friends' | 'sent' | 'received' | 'none'
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
        }[]
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

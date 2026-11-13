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
          created_at: string
        }
        Insert: {
          id: string
          username: string
          display_name: string
          avatar_key: string
          created_at?: string
        }
        Update: {
          username?: string
          display_name?: string
          avatar_key?: string
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
      workouts: {
        Row: {
          id: string
          user_id: string
          split_day_id: string | null
          day_name: string
          date: string
          started_at: string
          finished_at: string
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
        }
        Update: {
          day_name?: string
          date?: string
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
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

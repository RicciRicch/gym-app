# Architecture

## Planned structure
```
gym-app/
  app/                  # Expo Router routes (thin: import from features)
  src/
    features/<track>/   # components, hooks, screens, logic for ONE track
    ui/                 # shared design system (Phase 0 only; changes need a PR note)
    lib/                # supabase client, data helpers, utils
    types/db.ts         # generated from Supabase, never hand-edited
  supabase/
    migrations/         # timestamped SQL, one file per change
    seed.sql            # exercise library seed
  docs/
```

## Conventions
- TypeScript strict. No `any` without a comment.
- A feature imports from `ui/`, `lib/`, `types/`, never from another feature's internals. Cross-feature needs go through that feature's `index.ts` exports.
- Server state with TanStack Query; local UI state with React state or Zustand.
- Units: store everything in **kg and cm** in the DB; convert for display (user preference).
- Every table has `user_id` with Row Level Security: users read and write only their own rows.

## Data model outline (to be finalized in 0.6)
- `profiles` (user_id, display_name, unit_pref)
- `exercises` (id, name, muscle_group, equipment, is_custom, user_id nullable)
- `workouts` (id, user_id, started_at, ended_at, name, notes, template_id nullable)
- `workout_exercises` (id, workout_id, exercise_id, position)
- `sets` (id, workout_exercise_id, set_number, weight_kg, reps, rpe nullable, is_warmup)
- `templates`, `template_exercises`
- `body_metrics` (user_id, date, weight_kg, measurements jsonb)
- `goals`
- Later: `achievements`, `user_achievements`, `xp_events`, `friendships`, `challenges`

## Event hooks for the fun layer
Tracking code emits domain events (`workout_completed`, `pr_set`, `goal_reached`) through one small event module in `src/lib/events.ts`. Phase 2 features subscribe to these; Phase 1 never imports Phase 2.

## Schema changes
Schema is the main collision risk. Rules in WORKFLOW.md.

# Architecture

## Planned structure
```
gym-app/
  app/                  # Expo Router routes (thin: import from features)
  src/
    features/<track>/   # components, hooks, screens, logic for ONE track
    ui/                 # shared design system (Foundation only; changes need a PR note)
    lib/                # supabase client, data helpers, events, utils
    types/db.ts         # generated from Supabase, never hand-edited
  supabase/
    migrations/         # timestamped SQL, one file per change
    seed.sql            # exercise library seed
  docs/
    tracks/             # one doc per feature track
```

## Conventions
- TypeScript strict. No `any` without a comment.
- A feature imports from `ui/`, `lib/`, `types/`, never from another feature's internals. Cross-feature needs go through that feature's `index.ts` exports.
- Server state with TanStack Query; local UI state with React state or Zustand.
- Units: store everything in **kg and cm**; convert for display (user preference).
- Every user-owned table has `user_id` and Row Level Security: users read and write only their own rows.

## Data model outline (finalised in Foundation)
Core (MVP):
- `profiles` (user_id, display_name, unit_pref)
- `exercises` (id, name, muscle_group, equipment, user_id nullable for built-ins)
- `workouts` (id, user_id, started_at, ended_at, name, notes, plan_day_id nullable)
- `workout_exercises` (id, workout_id, exercise_id, position)
- `sets` (id, workout_exercise_id, set_number, weight_kg, reps, rpe nullable, is_warmup)
- `plans` (id, user_id, name)
- `plan_days` (id, plan_id, name, position)
- `plan_day_exercises` (id, plan_day_id, exercise_id, position, target_sets, target_reps)
- `calendar_pattern` (user_id, weekday, plan_day_id nullable, effective_from)
- `calendar_overrides` (user_id, date, plan_day_id nullable, note)
- `personal_records` (derived from sets; table or view, decided in Track D)

Later: `body_metrics`, `goals`, then fun-layer tables (`achievements`, `user_achievements`, `xp_events`, `friendships`, `challenges`).

## Events
Tracking code emits domain events (`workout_completed`, `pr_set`, `goal_reached`) through `src/lib/events.ts`. The fun layer subscribes. Tracking never imports from the fun layer.

## Schema changes
Schema is the main collision risk. Rules are in WORKFLOW.md.

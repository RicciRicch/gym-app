# gym-app — Plan

Mobile-first workout tracker. Polished MVP for real gym use and a portfolio piece.

## Milestones

| #  | Scope                                                        | Status      |
|----|--------------------------------------------------------------|-------------|
| M1 | Higgsfield style checkpoint (mascot + 1 exercise, 2–3 tests) | blocked (sign-in) |
| M2 | App shell, schema, RLS, auth, onboarding                     | done |
| M3 | Split (presets / scratch), calendar (week + month), Today    | done |
| M4 | Workout logging, rest timer, localStorage draft              | todo        |
| M5 | Remaining assets, exercise library, progress + PRs           | todo        |
| M6 | Polish, GitHub Pages deploy, README                          | todo        |

After every milestone: build + typecheck + lint, mobile-viewport browser test,
schedule unit tests, clean commit + push.

## Key decisions

- **Stack**: Vite, React, TypeScript, Tailwind CSS, React Router, TanStack Query, Recharts,
  `@supabase/supabase-js`. Dev-only: Vitest (required unit tests), ESLint.
- **Look**: dark-first (`#0B0D10` base), electric-lime accent, 44px+ tap targets, subtle motion.
- **Hosting**: GitHub Pages at `https://ricciricch.github.io/gym-app/` (Vite `base: '/gym-app/'`,
  `BrowserRouter` basename, `404.html` copy of `index.html` for SPA deep links).
- **Supabase project**: `gym-app` (`htusmfdhiynexupzyabb`, eu-central-1).
- **Assets**: generated with Higgsfield, stored locally in `public/assets/` as WebP.
  Prompts + models logged in `docs/prompts.md`.

## Data model

```
profiles(id = auth.users.id, username unique, display_name, avatar_key)
exercises(id, user_id NULL = core / set = custom, slug, name, muscles[], cues[], image_key)
splits(id, user_id, name, preset_key, is_active)
split_days(id, split_id, user_id, name, weekday 0–6 NULL, position)
split_day_exercises(id, split_day_id, user_id, exercise_id, position, target_sets, target_reps)
schedule_overrides(id, user_id, date, split_day_id NULL = rest)   -- unique (user_id, date)
workouts(id, user_id, split_day_id NULL, day_name, date, started_at, finished_at)
workout_sets(id, workout_id, user_id, exercise_id, exercise_position, set_number, reps, weight_kg, done)
```

- Every table carries `user_id` and has RLS: owner-only. Core exercises (`user_id IS NULL`)
  are read-only for all authenticated users.
- Weekday → day mapping lives on `split_days.weekday` (Mon = 0). Days without a weekday are rest.
- A swap for the current week = two `schedule_overrides` rows (one per date).

### Ready for social features (not built now)

- `profiles` is separate from auth, has a unique `username` → friend lookup later.
- Ownership is always an explicit `user_id` column, so friend/feed visibility can be added
  as *additional* `SELECT` policies plus a `friendships` table — no changes to existing tables.
- `workouts` snapshots `day_name`, so history stays readable after split edits.

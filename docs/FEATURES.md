# Feature Tracks

Work is split into tracks. Each track owns one folder under `src/features/<track>/` so tracks can run in parallel with minimal merge conflicts. Anything shared goes through the contracts built in Phase 0.

## Phase 0: Foundation (must finish first, done by one session)
Everything else depends on this. It defines the contracts the parallel tracks build against.

| # | Item | Output |
|---|------|--------|
| 0.1 | Expo + TypeScript scaffold, lint, format, test setup | Runnable empty app |
| 0.2 | Navigation shell (tabs: Workout, Progress, Library, Profile) with placeholder screens | Each track has a screen slot |
| 0.3 | Theme and shared UI kit (colors, type, Button, Card, Input) | `src/ui/` |
| 0.4 | Supabase project, client, env config | `src/lib/supabase.ts` |
| 0.5 | Auth (sign up, sign in, session) | `src/features/auth/` |
| 0.6 | **Database schema v1 + RLS + generated types** | `supabase/migrations/`, `src/types/db.ts` |
| 0.7 | Data-access conventions (query hooks, error handling) | `src/lib/data/` |

## Phase 1: Core tracking (parallel tracks, start after Phase 0)

| Track | Folder | Scope | Depends on |
|-------|--------|-------|------------|
| **A. Exercise library** | `features/exercises` | Seed exercises (muscle group, equipment), search/filter, custom exercises | 0.6 |
| **B. Workout logging** | `features/workout` | Start session, add exercises, log sets (weight/reps/RPE), rest timer, finish and save, history list | 0.6, A (exercise picker; stub until ready) |
| **C. Templates and programs** | `features/templates` | Save a workout as a template, start from a template, simple weekly plan | 0.6, A |
| **D. Progress and analytics** | `features/progress` | Per-exercise charts, PR detection, volume trends, estimated 1RM, calendar heatmap | 0.6, B data |
| **E. Body metrics** | `features/body` | Bodyweight log, measurements, progress photos, trend chart | 0.6 |
| **F. Goals and streaks** | `features/goals` | Weekly workout target, streak counter, goal per lift | B |

A, B, E can start the moment Phase 0 lands. C and D can start with mock data and wire up as B lands.

## Phase 2: Fun layer (later)
Built on events emitted by tracking (e.g. `workout_completed`, `pr_set`), so Phase 1 must emit them cleanly.

| Track | Folder | Idea |
|-------|--------|------|
| G. Achievements | `features/achievements` | Badges for milestones (first workout, 100 sets, bodyweight PR) |
| H. XP and levels | `features/xp` | Points per workout, levels, weekly quests |
| I. Social | `features/social` | Friends, activity feed, share a workout |
| J. Challenges and leaderboards | `features/challenges` | Time-boxed challenges with friends |

## Status board
| Item | Owner | Branch | Status |
|------|-------|--------|--------|
| Phase 0 | unassigned | `feat/foundation` | Not started |
| A Exercise library | unassigned | `feat/exercises` | Blocked on Phase 0 |
| B Workout logging | unassigned | `feat/workout` | Blocked on Phase 0 |
| C Templates | unassigned | `feat/templates` | Blocked on Phase 0 |
| D Progress | unassigned | `feat/progress` | Blocked on Phase 0 |
| E Body metrics | unassigned | `feat/body` | Blocked on Phase 0 |
| F Goals and streaks | unassigned | `feat/goals` | Blocked on Phase 0 |

Update this table in your PR when you start or finish a track.

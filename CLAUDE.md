# Gym App: instructions for Claude sessions

Several Claude sessions may work on this repo at the same time, each on one track.

## Before you start
1. Read `PRODUCT.md`, then `docs/WORKFLOW.md` and `docs/ARCHITECTURE.md`.
2. Read the doc for your track in `docs/tracks/`. It defines your scope and "done when".
3. Work only on your track's branch/worktree and in your track's folder under `src/features/`.
4. If you need a change outside your track (shared UI, schema, navigation), keep it minimal, put it in its own commit, and call it out in the PR.

## Project facts
- Audience: me and friends. Tracking first (logging, progress, plans and calendar); fun features later.
- Stack: Expo (React Native) + TypeScript, Supabase (Postgres, Auth, RLS).
- Supabase project: `gym-app-main` (ref `blzabigkmmaxbgziouvc`). Keys go in `.env`, never in the repo.
- Units stored in kg and cm; convert only for display.
- Never hand-edit `src/types/db.ts`; regenerate it.
- Never edit merged migrations; add new ones.
- Editing a plan never changes past workouts or past calendar days.
- Tracking code emits domain events through `src/lib/events.ts`; it never imports from fun-layer features.

## Done means
Type-check, lint and tests pass; the status board in `docs/FEATURES.md` updated; PR opened with a short description.

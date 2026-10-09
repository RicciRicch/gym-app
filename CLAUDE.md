# Gym App: instructions for Claude sessions

Several Claude sessions may work on this repo at the same time, each on one feature track.

## Before you start
1. Read `docs/FEATURES.md`, `docs/ARCHITECTURE.md` and `docs/WORKFLOW.md`.
2. Confirm which track you own. Work only in that track's branch/worktree and in `src/features/<track>/`.
3. If you need a change outside your track (shared UI, schema, navigation), keep it minimal, put it in its own commit, and call it out in the PR.

## Project facts
- App focus: progress tracking first, fun features later.
- Stack: Expo (React Native) + TypeScript, Supabase (Postgres, Auth, RLS).
- Units stored in kg and cm; convert only for display.
- Never hand-edit `src/types/db.ts`; regenerate it.
- Never edit merged migrations; add new ones.
- Tracking code emits domain events through `src/lib/events.ts`; it never imports from Phase 2 (fun) features.

## Done means
Type-check, lint and tests pass; FEATURES.md status updated; PR opened with a short description.

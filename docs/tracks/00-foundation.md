# Track 0: Foundation

**Branch:** `feat/foundation` · **Status:** not started · **Blocks:** everything else
**Folder:** `src/ui/`, `src/lib/`, `src/features/auth/`, `supabase/`

## Goal
Build the shared base the other tracks rely on, so they can work in parallel without touching each other's files.

## Scope
1. Expo + TypeScript scaffold, lint, format, test setup.
2. Navigation shell with tabs: **Workout**, **Calendar**, **Progress**, **Library**, **Profile**. Each tab is a placeholder screen so tracks have a slot.
3. Theme and small UI kit (colors, type, Button, Card, Input).
4. Supabase client and env config (`.env`, never committed; `.env.example` committed).
5. Auth: sign up, sign in, sign out, session persistence.
6. **Database schema v1**, RLS policies and generated types (see ARCHITECTURE.md for the model).
7. Data-access conventions (TanStack Query hooks, error handling).
8. Event module `src/lib/events.ts` for domain events (`workout_completed`, `pr_set`).

## Done when
- App runs on a phone (Expo Go) and shows the tab shell.
- A friend can sign up and sign in.
- Migrations apply cleanly and every table has RLS.
- Other tracks can add screens without editing shared files.

## Supabase
Project: `gym-app-main` (`https://blzabigkmmaxbgziouvc.supabase.co`, region eu-west-1). Keys live in `.env`, never in the repo.

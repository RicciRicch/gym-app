# CLAUDE.md

Mobile-first workout tracker (Vite + React + TS + Tailwind + Supabase). See `PLAN.md` for scope.

## Conventions

- Talk to the user in **Serbian**; code, comments, commits in **English**.
- Build only the MVP scope in `PLAN.md`. No extra dependencies without a clear reason.
- Structure: `src/pages` (routes), `src/components` (shared UI), `src/features/<area>`
  (queries + logic per area), `src/lib` (supabase client, pure helpers).
- Pure logic (schedule, PRs) lives in `src/lib/*.ts` with unit tests next to it (`*.test.ts`).
- Server state via TanStack Query hooks; no global state library.
- Dates are local `YYYY-MM-DD` strings; weekdays are `0 = Monday … 6 = Sunday`.
- Weights are stored in kg.
- UI: dark-first, tokens in `src/index.css` (`@theme`), tap targets ≥ 44px.
- Every schema change = a new file in `supabase/migrations/`, applied via the Supabase MCP,
  followed by the security advisors (fix every warning). RLS on every table.
- Only the publishable key goes in the client (`.env`, never committed; keep `.env.example` current).
- Assets live in `public/assets/` as WebP; never hot-link. Log prompts in `docs/prompts.md`.

## Commands

```bash
npm run dev        # dev server (http://localhost:5173/gym-app/)
npm run build      # typecheck + production build
npm run typecheck
npm run lint
npm test           # vitest (schedule logic etc.)
```

## Status

- M1 art: DONE. Style B (soft 3D clay), chosen by the user. 8 exercises + mascot + 4 avatars +
  icon with `z_image` (0.15/image); deadlift, dumbbell curl, triceps pushdown and leg press with
  `nano_banana` (1 credit each, user-approved) using the squat as a style reference, because
  z_image kept drawing arms overhead and its queue kept failing (failed jobs are refunded).
  ~2.1 credits left. Convert approved PNGs with `python scripts/process-assets.py <dir>`;
  prompts, models and job ids in `docs/prompts.md`.
- M2 app shell + auth: code done. Schema + RLS applied (`init_schema`), security advisors clean.
  Browser-verified: auth screen, wrong-credentials error, signed-in shell. The user signed up
  and onboarded themselves (account + profile exist), so that flow works end to end.
- M3 split + calendar + Today: code done (presets, split editor, weekly layout, week/month
  calendar, current-week swaps via overrides, Today screen). Build, typecheck, lint and unit
  tests pass. Browser-verified at 375px with the user's account: preset creation, weekday
  trade, sets stepper, week swap + reset, month view, Today. Not exercised: from-scratch split,
  add/rename/delete day, add/remove exercise. `/workout` is still a placeholder until M4.
- M4 workout logging: code done (start from Today or /workout, prefill from last session,
  reps x weight, one-tap done, add/remove sets and exercises, rest timer with auto-start,
  +/-15s, vibration, localStorage draft per user, "Update default for [day]?" on finish).
  Browser-verified at 375px: start, set logging (comma decimals), rest timer +15/skip and
  survival across reload, add/remove exercise, finish -> "Update default" prompt (kept old),
  saved rows in DB, prefill from last session, discard. Not exercised: the "Update default"
  write path, rest duration picker, vibration (needs a real phone).
- M5 library + progress: code done. Library (12 core + custom text-only exercises, duplicate
  names rejected), exercise detail with cues, Progress history with per-workout PR badges,
  per-exercise chart (lazy-loaded Recharts; first session is baseline, PR = strictly heavier
  top set, or more reps for bodyweight). Browser-verified at 375px with seeded sample
  workouts (since deleted). Images fall back to a gradient icon until M1 assets land in
  `public/assets/exercises/<slug>.webp`, `public/assets/mascot.webp`.
- M6 (partial, while waiting for M1 art): every route except Today/Auth is lazy-loaded
  (main chunk ~285 kB, no size warning); `.github/workflows/deploy.yml` builds (lint, test,
  build) and deploys to Pages, reading `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`
  from repository *variables*. README drafted (screenshots pending). Split editor add /
  rename / delete day and add / remove exercise browser-verified (net-zero on the user's split).
  Repo variables set and Pages source = GitHub Actions (user approved); first deploy green,
  live at https://ricciricch.github.io/gym-app/ (deep links work via 404.html, served with
  HTTP 404 status, which is expected). Still to do: auth redirect URLs in the Supabase
  dashboard (user), README screenshots. PWA manifest + icons done.
- Fixed overlays: Sheet and RestTimer render via portal into <body>; page wrappers use
  animate-fade-up (a transform), which traps position: fixed.
- Auth redirect URLs (localhost + GitHub Pages) still have to be set in the Supabase dashboard
  (no MCP tool for auth config) — do in M6 at the latest.
- GitHub Actions deploy workflow: `.github/workflows/deploy.yml`, deploys on every push to main.

## Future features (NOT in MVP — do not build yet)

- Friends (requests, friend list)
- Feed (friends' finished workouts)
- Privacy settings (per-profile / per-workout visibility)
- Rolling cycle (split not tied to weekdays)
- Optimal schedule suggestion
- Streaks

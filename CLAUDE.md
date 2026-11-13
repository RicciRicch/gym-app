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

- M1 style checkpoint: NOT STARTED, waiting on Higgsfield auth. Findings:
  - The claude.ai "Higgsfield AI" connector points at `claude-mcp.higgsfield.ai` and is read-only.
  - The trial only generates through the MCP: the website and `@higgsfield/cli` both refuse
    (`only_mcp_usage_on_trial_is_available`).
  - The user added the full server as claude.ai custom connector "Higgsfield"
    (https://mcp.higgsfield.ai/mcp, connected). It only loads in sessions started after it was
    added. Unverified: whether it exposes generate tools and accepts the trial.
  - Budget: 10 credits. CLI cost estimates per image: z_image 0.15, nano_banana / flux_2 1,
    nano_banana_pro 2. Prompts for the 3 style tests are in `docs/prompts.md`.
  - Next step once tools load: generate the 3 style tests, inspect, show the user, wait for choice.
- M2 app shell + auth: code done. Schema + RLS applied (`init_schema`), security advisors clean.
  Browser-verified: auth screen, wrong-credentials error, signed-in shell. The user signed up
  and onboarded themselves (account + profile exist), so that flow works end to end.
- M3 split + calendar + Today: code done (presets, split editor, weekly layout, week/month
  calendar, current-week swaps via overrides, Today screen). Build, typecheck, lint and unit
  tests pass. Browser-verified at 375px with the user's account: preset creation, weekday
  trade, sets stepper, week swap + reset, month view, Today. Not exercised: from-scratch split,
  add/rename/delete day, add/remove exercise. `/workout` is still a placeholder until M4.
- Auth redirect URLs (localhost + GitHub Pages) still have to be set in the Supabase dashboard
  (no MCP tool for auth config) — do in M6 at the latest.
- GitHub Actions deploy workflow: not added yet (M6).

## Future features (NOT in MVP — do not build yet)

- Friends (requests, friend list)
- Feed (friends' finished workouts)
- Privacy settings (per-profile / per-workout visibility)
- Rolling cycle (split not tied to weekdays)
- Optimal schedule suggestion
- Streaks

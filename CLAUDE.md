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

- M1 style checkpoint: BLOCKED — the Higgsfield MCP connector is read-only (no generate tool).
  Generation must go through higgsfield.ai in the browser pane, which needs the user's sign-in.
  Account showed 10 credits (ultra plan; nano_banana_2 / nano_banana_pro / gpt_image_2 are "unlim").
- M2 app shell + auth: code done. Schema + RLS applied (`init_schema`), security advisors clean.
  Browser-verified: auth screen, wrong-credentials error. NOT yet browser-verified: sign-up
  confirmation, onboarding, signed-in shell (needs a real/test account).
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

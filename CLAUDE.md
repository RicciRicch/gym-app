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
  Two more mascot poses (sad on the couch, proud chest-beating) with `nano_banana`, 1 credit
  each, user-approved on 2026-11-15. ~0.1 credits left: no more generations without a top-up. Convert approved PNGs with `python scripts/process-assets.py <dir>`;
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
  HTTP 404 status, which is expected). Still to do: README screenshots. PWA manifest + icons done.
- Auth extras: "Keep me logged in" checkbox (default on) picks localStorage vs sessionStorage
  for the Supabase session via `src/lib/auth-storage.ts` (unit-tested). First-run guide
  (`src/features/guide/`): 5 steps, queued per user in localStorage when a new profile is
  created, closed with Skip/finish, reopenable from Profile ("How to use the app").
  Browser-verified: checkbox, guide from profile, first-run flag on reload, close clears flag.
- Password reset: "Forgot password?" on the login screen sends a reset email
  (`redirectTo` = app URL); the link signs the user in and `NewPasswordPage` asks for a new
  password (`recovering` in AuthProvider, from `type=recovery` in the URL hash or the
  PASSWORD_RECOVERY event). Expired-link errors show on the login screen. Browser-verified:
  reset form, expired-link message. Not exercised: a real reset email end to end.
- Delete account: Profile -> "Delete account" sheet calls the `delete-account` Edge Function
  (`supabase/functions/delete-account`, verify_jwt on, service role inside, deletes the
  caller via `auth.admin.deleteUser`; all tables cascade). Deploy it with the Supabase MCP
  `deploy_edge_function`. Verified: CORS preflight, 401 without a user. Not exercised: a real
  deletion in the UI.
- Offline: `src/sw/service-worker.js` is the worker template; `scripts/service-worker-plugin.mjs`
  (Vite, build only) emits `dist/sw.js` with VERSION (hash of all files + template) and
  PRECACHE (every built file + public/). Navigations get the cached shell; assets cache-first
  with `ignoreVary` (servers send `Vary: Origin`). Registered in `main.tsx` in production only.
  Query cache persisted to localStorage (`src/features/offline/query-cache.ts`, unit-tested),
  cleared on sign-out; mutations use networkMode 'always' so they fail fast offline; starting
  a workout offline skips the last-session prefill. Test with the `gym-app-preview` launch
  config (`npm run build` first). Browser-verified: precache (39 files), deep link with the
  server stopped, offline banner. Not exercised: a real phone in airplane mode.
- Stale deploys: lazy routes use `lazyPage` (`src/lib/lazy-page.ts`) and main.tsx handles
  `vite:preloadError`: a missing chunk reloads the page once (30 s guard in sessionStorage).
  `ErrorBoundary` wraps the app (full screen) and the routed outlet (resets on route change),
  so errors show "Something went wrong / Reload" instead of a black page. Browser-verified
  by renaming a built chunk. No Prettier config in the repo: don't run `npx prettier` with
  defaults (style = single quotes, no semicolons, width 120).
- Workout summary + PR celebration: finishing a workout shows `WorkoutSummaryScreen`
  (`src/features/workout/`): totals (time, volume, sets, exercises, count-up), PR cards with
  the gain over the previous best (`src/lib/summary.ts`, unit-tested; measured against the
  sets loaded before the finish), the streak, then the "Update default" prompt if needed.
  With PRs: canvas confetti (`src/components/Confetti.tsx`, no dependency), sunburst,
  shockwaves, "NEW PR!" stamp, flash, screen shake, vibration. Without: small confetti.
  Reduced motion: no confetti, static end states.
- Streak (user asked for it, so no longer a future feature): weekly, `src/lib/streak.ts`
  (unit-tested). A week counts when days trained >= the split's training days; the running
  week counts once met and never breaks the streak early. `Flame` (CSS-animated SVG, levels
  0-3) + `StreakCard` on Today and on the summary. `useWorkoutDates` feeds it.
- Dev playground: `/dev/celebration` (dev server only, no sign-in; `?prs=0|1|2` opens the
  summary directly). The Browser pane is often hidden, where requestAnimationFrame does not
  run, so check canvas/RAF animations with headless Chrome over CDP instead.
  Browser-verified end to end: finish with a heavier squat -> "NEW PR!", gain, stats, streak
  card on Today (test rows deleted). Not exercised: vibration, a real phone.
- Profile photos: onboarding and Profile (tap the avatar -> "Change avatar" sheet) offer the 4
  presets or your own photo (`src/features/avatar/`). The photo is centre-cropped and shrunk on
  the phone to <= 320px WebP (JPEG where the browser can't encode WebP; `src/lib/avatar.ts`,
  unit-tested) and uploaded to the public `avatars` bucket at `<user id>/<uuid>.<ext>`
  (migration `avatar_photos`: `profiles.avatar_path`, owner-folder-only storage policies, 512 KB,
  webp/jpeg only). Old files are removed on change; `delete-account` removes the folder first.
  Browser-verified: upload, header + profile photo, switch back to a preset (file deleted),
  RLS blocks other folders / root / SVG / pointing at another user's path. Not exercised:
  onboarding with a photo (needs a new account), a real phone camera / HEIC.
- "What you lifted": `src/lib/lifted.ts` (unit-tested) turns volume into the biggest thing it
  covers at least twice (watermelon ... Titanic). `LiftedCard` shows it on the workout summary
  ("Today") and at the top of Progress history (this year, plus all time). Browser-verified.
- Voice input: mic button on each exercise in a workout opens `VoiceSheet`; the Web Speech API
  (`src/features/workout/voice.ts`, hidden where unsupported, e.g. Firefox) listens in sr-RS /
  hr-HR / en-US (saved in localStorage). `src/lib/voice-set.ts` (unit-tested) parses Serbian
  (Latin or Cyrillic), Croatian and English number words or digits, "i po" / "and a half",
  "zarez" / "point", kg / reps / "puta" / "x", "bez tega". The result fills and completes the
  first unfinished set (or a new one) and starts the rest timer; reps only keeps the set's
  weight. Browser-verified with a mocked recognizer (the Browser pane blocks the mic; the
  blocked-mic message shows). Not exercised: a real microphone / phone. Chrome sends audio
  to Google for recognition.
- Gorilla on Today (`src/features/gorilla/GorillaCard.tsx`, logic in `src/lib/gorilla.ts`,
  unit-tested): mascot + speech bubble above the week strip. Moods: coach (default pose),
  proud (`mascot-proud.webp`, PR in a workout from today/yesterday), sad (`mascot-sad.webp`,
  a planned day in the last 3 days was skipped and nothing was trained since; never before the
  split's created_at, never in a frozen week), sleepy (rest day / frozen week, "Zzz"). Lines
  are English, picked per day (stable hash of the date). Teases when the latest workout moved
  10%+ less than the previous one of the same day. The summary screen uses the proud pose on a PR.
- Coach + ghost in a workout (`src/lib/coach.ts`, unit-tested; `useLoggedSets` now carries
  `setNumber`): until an exercise's first set is done, `CoachTip` says what to aim for from the
  last session (reps held on every top-weight set -> +2.5 kg, +1 kg under 20 kg; reps dropped
  -> same weight, all sets to the first set's reps; bodyweight -> +1 rep) with Apply (fills the
  open sets). Each set row shows last time's set ("👻 80 × 8") and, once done, beat / matched /
  ghost wins; the card shows the score "You 2 : 1 👻 last time".
- Streak freeze: table `streak_freezes` (migration `streak_freezes`; week_start = Monday, one
  per user per calendar month via a unique index, RLS: insert only the running week, delete
  only the running week). `weeklyStreak(..., frozenWeeks)`: a frozen week neither counts nor
  breaks the streak; `Streak.frozen` = running week frozen and target not met (ice-blue flame
  and card). `FreezeControl` (🧊 on the Today streak card) shows only when there is a streak
  to protect and the week is not done; frozen weeks can be thawed. RLS verified with SQL as
  the user (running week ok; old week, non-Monday, other user blocked; undo ok; net zero).
- Verification of the three items above: visuals in `/dev/celebration` (all four moods, frozen
  streak card) via headless Chrome; pure logic unit-tested. Browser-verified signed in at 375px
  with a seeded test workout (since deleted): Today gorilla line, coach tips (hold / add
  weight / first time), Apply, ghost rows and score. Not exercised in the UI: the freeze sheet
  (needs a streak at risk), the sad/proud moods with real data.
- Badges (`src/lib/badges.ts`, unit-tested): 17 badges (workout counts 1/10/50/100, volume
  10/100/1000 t, PRs 1/10/50, best streak 4/12 weeks with frozen weeks bridging, 10 leg days by
  day name, early bird < 7:00, night owl >= 22:00, 90+ min, Saturday + Sunday), all derived from
  history with the date each was earned (no table). Medals drawn in code (`Medal.tsx`, tier
  rosette + emoji). "Seen" ids in localStorage `gym-app:badges-seen:<uid>`; the first run stores
  what is already earned so old accounts get no pile of pop-ups. `BadgeUnlock` (AppLayout, not
  on /workout or /badges): coin-spin drop, rays, confetti, queue "1 of N", "Put it on my shelf"
  -> `/badges` (lazy) where `BadgeShelf` flies each medal from the unlock screen into its slot
  (WAAPI FLIP arc, spark burst, count ticks up, NEW pill). Reduced motion: no flight, NEW only.
  Profile has a `BadgeShelfCard`. Playground: `/dev/celebration?badge=2` and `?shelf=1`.
  Browser-verified signed in with a seeded 6:30 workout (since deleted): pop-up, Later, Profile
  card, shelf, detail sheet, hidden on /workout; the flight via headless Chrome in the playground
  (the Browser pane has reduced motion on and is frozen while hidden).
- Pre-workout coach (`src/lib/fuel.ts`, unit-tested): `PreWorkoutCard` under today's workout on
  Today (not once started/done). Half-ironic hard-core lines, sane advice underneath: snack 30-60
  min before in the morning, a meal 2-3 h before otherwise, fruit on light days (<= 8 sets),
  "carb load" on leg days / 18+ sets, coffee 30 min before ("not a bathtub"), none from 16:00.
  No brand names. The summary asks "What did you have before?" (`FuelCheck`: coffee / energy
  drink / carbs / pre-workout / nothing) -> `workouts.fuel text[]` (migration `workout_fuel`,
  check constraint on the values, null = not answered) and the gorilla reacts. After 6 answered
  workouts `fuelInsight` compares volume against the same day's average, with vs without each
  item (3+ each side, >= 3% difference): "With coffee you lift 8% more". Playground: `?fuel=1`.
  Verified: cards and chips in headless Chrome, Today card signed in, fuel update / empty /
  invalid value via RLS (test row deleted). Not exercised: saving from a real finished workout.
- Muscle map (`src/lib/muscles.ts`, unit-tested): `MuscleMapCard` at the top of Progress history
  (under the lifted card). 13 regions; exercise muscle names (free text, English or Serbian) map
  to regions by keyword; a set counts 1 for the first listed muscle, 0.5 for the others. Heat by
  sets per week (>0 warm, 5+ hot, 10+ on fire, glowing), toggle This week (Mon-today) / 30 days.
  `MuscleMap.tsx` is a hand-drawn SVG (front + back, left half mirrored). The gorilla teases one
  cold region (big muscles first, changes per day), drawn with a blinking dashed red outline;
  below: bars with set counts and the cold list. Playground: `?muscles=1`. Browser-verified
  signed in with a seeded workout (since deleted) and in headless Chrome.
- Fixed overlays: Sheet and RestTimer render via portal into <body>; page wrappers use
  animate-fade-up (a transform), which traps position: fixed.
- Supabase Auth dashboard (no MCP tool for auth config), set by the user on 2026-11-14: Site URL
  + redirect URLs (localhost + GitHub Pages), email confirmation handled, leaked password
  protection toggled (the security advisor still reported it off right after; may need the Pro
  plan or a refresh).
- GitHub Actions deploy workflow: `.github/workflows/deploy.yml`, deploys on every push to main.

## Future features (NOT in MVP — do not build yet)

- Friends (requests, friend list)
- Feed (friends' finished workouts)
- Privacy settings (per-profile / per-workout visibility)
- Rolling cycle (split not tied to weekdays)
- Optimal schedule suggestion

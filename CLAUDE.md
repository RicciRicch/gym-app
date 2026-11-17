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
  `public/assets/mascot.webp` (the exercise images were later replaced by movement figures).
- M6 (partial, while waiting for M1 art): every route except Today/Auth is lazy-loaded
  (main chunk ~285 kB, no size warning); `.github/workflows/deploy.yml` builds (lint, test,
  build) and deploys to Pages, reading `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`
  from repository *variables*. README drafted (screenshots pending). Split editor add /
  rename / delete day and add / remove exercise browser-verified (net-zero on the user's split).
  Repo variables set and Pages source = GitHub Actions (user approved); first deploy green,
  live at https://ricciricch.github.io/gym-app/ (deep links work via 404.html, served with
  HTTP 404 status, which is expected). README screenshots done (2026-11-17): 10 WebP shots in
  `docs/screenshots/` (585 px wide), taken in headless Chrome over CDP at 390x844 from a seeded
  throwaway demo account (deleted afterwards); the summary shot is the `/dev/celebration` playground.
  In Git Bash run such scripts with `MSYS_NO_PATHCONV=1`, or "/progress" turns into a Windows path. PWA manifest + icons done. The icon (favicon + PWA) is
  the flat lime `DumbbellMark` on the app's dark, drawn by `python scripts/make-icons.py` (user
  found the clay icon too playful on 2026-11-16).
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
  0-3) + `StreakCard` on Today (`variant="bare"`: no frame, straight on the page, lit by a soft
  glow behind the flame; user's pick on 2026-11-17) and on the summary (framed card). `useWorkoutDates` feeds it.
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
  covers at least twice (watermelon ... Titanic); `nextMilestone` = kg left until it moves up to
  2 of the next thing. `LiftedCard` (small, with a thin bar) on the workout summary ("Today");
  `LiftedStrip` (one quiet line) at the top of the Progress training log. Browser-verified.
- Progress History layout (user's picks, 2026-11-16): muscle map first (its period switch is
  underlined text tabs, deliberately unlike the page's pill), then a separate "Training log":
  sessions grouped by week (`src/lib/history.ts`, unit-tested: `groupByWeek`, `weekLabel`),
  on a thin timeline. Each session shows its trend vs the last session with the same day name
  (`sessionTrends`: total weight x reps, ▲/▼ %, "≈ same" within 2%, "First"); the dot is lime /
  red / grey, PR sessions glow and get a lime border. No kg line on the card (user removed it).
  The explanation sits in an `InfoBubble` (ⓘ next to the heading; tap outside / Esc closes).
  Weight-plate markers were tried and rejected. Up/down cards only covered by unit tests so far.
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
- Pre-workout coach (`src/lib/fuel.ts`, unit-tested): `PreWorkoutCard` (removed from Today
  by the user on 2026-11-16; kept for the playground). Half-ironic hard-core lines, sane advice underneath: snack 30-60
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
  `MuscleMap.tsx` is a hand-drawn anatomical SVG (200 x 440, front + back, left half mirrored,
  gradient fills, rim filter; tap a muscle -> white outline + its sets in the pill below). The gorilla teases one
  cold region (big muscles first, changes per day), drawn with a blinking dashed red outline;
  below: bars with set counts and the cold list. Playground: `?muscles=1`. Browser-verified
  signed in with a seeded workout (since deleted) and in headless Chrome.
- Library: 83 core exercises (12 with images + 44 text-only from migration `more_exercises` +
  27 machine / Smith exercises from `machine_exercises`, first muscle = main one). Muscle
  keywords also know adductors (-> quads region) and abductors (-> glutes). Search
  (`matchesSearch` in `src/lib/muscles.ts`: every word in name / muscles / group, accents
  stripped, đ = dj) and muscle group chips with counts (`exerciseGroup` by the main muscle:
  Chest, Back, Shoulders, Arms, Legs, Core). Shared `SearchField` / `GroupChips`
  (`src/features/library/ExerciseFilter.tsx`, hook in `filter.ts`) are used by the Library (state
  in the URL: `?q=&group=`) and by `ExercisePicker` (split editor + workout "Add exercise").
  Library layout (user's pick, after rejecting muscle-figure thumbnails): search, "Yours" (last
  logged, then the split; `yourExerciseIds`, max 4), 2x3 muscle group tiles (count + example
  names; a group pushes `?group=` so the phone's back button leaves it), custom exercises.
  Compact rows without images: name, main muscle · gear, gear icon on the right
  (`EquipmentIcon`; gear guessed from the name by `equipmentOf` in `src/lib/library.ts`,
  unit-tested on all 83 core names, no DB column). Exercise page: hero only with art, gear line.
  Browser-verified signed in: chips/counts, Legs + "squat", picker Core filter.
- Friends (user asked for it on 2026-11-16, so no longer a future feature). Migrations `friends`
  + `friends_grants`: `profiles.friend_code` (GORILA-XXXX, set by the DB; clients have column
  grants only), `friendships` (pending/accepted, one row per pair, select/delete via RLS,
  created/accepted only through functions), `nudges` (one per friend per day; insert
  (to_id, day), receiver updates seen_at only), `friend_stats` (streak, badge ids, PR count,
  published by the owner's app from `usePublishFriendStats` in AppLayout; friends may read).
  Cross-user reads go through SECURITY DEFINER functions in the unexposed `private` schema with
  SECURITY INVOKER wrappers in `public` (`friend_preview`, `send_friend_request`,
  `accept_friend_request`, `friends_overview`), so the advisors stay clean and nobody can list
  profiles. New public tables get ALL for anon/authenticated by default: revoke first, then grant.
  Friends never see weights. Client: `src/lib/friends.ts` (unit-tested: code parsing, invite
  link, stale streak, weekly table, gorilla lines), `src/features/friends/` (`GymPass` card with
  QR via `qrcode-generator`, the one new dependency; `AddFriendPrompt` in AppLayout for
  `?add=CODE` links, kept in localStorage across sign-in by `invite-store.ts`; `FistBump`
  overlay when two users become friends; `WeeklyTable` by sets since Monday, only on /friends;
  `NudgeButton`), pages `/friends` and `/friends/:id` (lazy), header icon with a request count,
  Profile card. A received nudge makes the Today gorilla say "X says get off the couch" until
  the workout starts (only shown when the user has a split). AppLayout now scrolls to the top on
  every non-back navigation. Playground: `?bump=1`.
  Browser-verified at 375px with two throwaway accounts (since deleted): link while signed out
  -> sign in -> prompt, own code, request sent, incoming request + header count, accept ->
  fist bump, table, friend page, nudge both ways, remove, typed code. RLS/grants checked with
  SQL as friend / stranger / anon. Not exercised: the share sheet and QR scan on a real phone,
  two real accounts, the user's own account (the pane was signed out).
- Rest before a workout: `RestPicker` (`src/features/workout/RestPicker.tsx`: −/+ in 15 s steps
  from 15 s to 10 min via `stepRest`, plus quick picks 45s-3:00; `formatRest` in
  `src/lib/workout.ts`, unit-tested) sits on the /workout start screen and in the running
  workout's "Rest" sheet (removed from Today's card by the user on 2026-11-16: too big). The value lives in localStorage
  (`useRestSeconds`, re-renders on change) and a new workout copies it into the draft.
  Browser-verified at 375px with a throwaway account (deleted): pick 2:00 on Today -> workout
  shows "Rest 2 min", change to 1:45 mid-workout -> the timer counts 1:45 after a set.
- Training together (user asked on 2026-11-16): table `workout_partners` (migration
  `workout_partners`: workout_id, user_id, friend_id, day; RLS: both sides read, insert only on
  your own workout with its real date and only an accepted friend, delete own; narrow grants).
  `PartnerPicker` (`src/features/friends/Partners.tsx`, hidden without friends) on Today's
  workout card (above Start) and the /workout start screen; the pick lives in memory (`usePartnerIds` in
  draft-store) and is copied into the draft (`partnerIds`) at start. In the workout:
  `PartnerChip` (small avatars + "with Ana", or "+ Buddy") next to the Rest button opens a
  sheet to change it. Finish inserts one row per partner (never fatal). `workoutsTogether`
  (`src/lib/friends.ts`, unit-tested) counts distinct days per friend from both directions;
  shown on the summary (`TrainedWith`: "Workout #5 with Ana"), the friend's page ("Trained
  together") and the Friends list ("🤝 3 together"). Browser-verified at 375px with two
  throwaway accounts (deleted): pick on Today, chip + sheet in the workout, summary, both
  sides see the count; the friend cannot insert a fake row or delete the owner's.
- Estimated 1RM (`src/lib/one-rep-max.ts`, unit-tested): Epley, a single = its weight, sets over
  10 reps ignored, best estimate per workout (`maxProgress`, PR = strictly higher estimate).
  `MaxCard` on the exercise page (weighted exercises with sessions; replaces the plain "Your
  progress" link and keeps it as its footer): best estimate rounded to 0.5 kg, the set it came
  from, growth vs the best 30+ days ago, 95-60% table rounded to 2.5 kg (1 kg under a 30 kg max).
  The progress page has "Top set / Est. 1RM" text tabs over one chart (`ProgressChart` takes a
  `ChartSeries`, built in `src/features/progress/series.ts`). Browser-verified at 375px with a
  temporary October bench workout on the user's account (deleted, badge "seen" state restored).
- Strength levels (user's pick on 2026-11-17): migration `body_stats` adds `profiles.bodyweight_kg`
  (25-350) and `profiles.strength_sex` ('male' / 'female'), both nullable, owner-only (profiles RLS
  is select-own; column update grant). `src/lib/strength.ts` (unit-tested): `liftOf` matches only the
  four core lifts by exact name (Bench Press, Back Squat, Deadlift, Overhead Press), `strengthLevel`
  puts est. 1RM / body weight on rounded common standards (Beginner, Novice, Intermediate,
  Advanced, Elite; lower for women), `position` 0..5 for the bar, kg to the next level.
  `src/features/strength/`: `BodyStatsSheet` (weight + Men / Women), `BodyStatsButton` chip,
  `StrengthBar`, `StrengthCard` on Profile (four lifts + weakest lift line). `MaxCard` shows a
  "Strength level" section for the four lifts and lost its borders. Design rule from the user:
  no emojis, no strong borders in new UI. Browser-verified at 375px on the user's account with
  a temporary 85 kg (reset to null afterwards).
- Movement figures (user's pick on 2026-11-16, replacing the 12 clay exercise images, which were
  removed from `public/assets/exercises/`): `src/lib/movement.ts` (unit-tested) maps every exercise
  name to one of 25 patterns (`movementOf`, all 83 core names + Serbian words; unknown -> null) and
  builds two poses (start / end) from joint angles with fixed limb lengths, side or front view,
  plus scenery (bench, seat, bar) and gear props from `equipmentOf` (plate, dumbbells, cable).
  `MovementFigure` (`src/components/`) animates between the poses with SMIL `points` animations
  (dots are zero-length round-capped lines so they never drift from the limbs); reduced motion
  shows the still glyph pose. Used as the exercise page hero, as `MovementGlyph` in the Progress
  exercise list and in the first-run guide. The mascot moved to `src/components/Mascot.tsx`.
  Playground: `/dev/celebration?figures=1` (animated), `?figures=still` (both frames).
  The `exercises.image_key` column is now unused.
- Rotating cycle (user asked on 2026-11-17, so no longer a future feature): migration
  `rotating_cycle` adds `splits.mode` ('weekly' | 'rotating') and `split_days.rest_after` (0-6).
  Rotating = days loop in `position` order, each followed by `rest_after` rest days; weekdays are
  kept so switching back restores the week. The plan waits for you: `src/lib/cycle.ts`
  (unit-tested) projects from the last workout on one of the split's days (`projectCycle`; a
  skipped day moves everything later, nothing is lost), `cycleWeeklyTarget` = floor(workouts x 7 /
  length) for the streak, `cycleMissed` for the sad gorilla, `cycleFromWeek` turns the weekly
  layout into a cycle with the same rhythm on the first switch. `usePlan(from, to)`
  (`src/features/schedule/plan.ts`) is the one plan for Today, Calendar, the workout start screen
  and the gorilla in both modes; `weeklyTarget(split)` feeds streak, badges and the summary.
  Split page: `ModeSwitch`, `CycleSection` (order with up/down, rest stepper, `CycleStrip`);
  presets "Push / Pull / Legs rotation" and "Upper / Lower rotation". Today: "Next up · day 2 of
  4", "Planned for Sunday. Your cycle waited for you.", "Do another day instead" (both modes).
  Calendar: projection for future days, "No workout" for past ones, no swaps in rotating mode.
  Browser-verified at 375px with a throwaway account (deleted): switch, rest/order edits saved,
  Today next-up and waiting line, sad gorilla, another day, finish -> calendar projection,
  rotating preset, switch back to weekly.
- Fixed overlays: Sheet and RestTimer render via portal into <body>; page wrappers use
  animate-fade-up (a transform), which traps position: fixed.
- Supabase Auth dashboard (no MCP tool for auth config), set by the user on 2026-11-14: Site URL
  + redirect URLs (localhost + GitHub Pages), email confirmation handled, leaked password
  protection toggled (the security advisor still reported it off right after; may need the Pro
  plan or a refresh).
- GitHub Actions deploy workflow: `.github/workflows/deploy.yml`, deploys on every push to main.

## Future features (NOT in MVP — do not build yet)

- Feed (friends' finished workouts)
- Privacy settings (per-profile / per-workout visibility; friends see no weights until then)
- Optimal schedule suggestion

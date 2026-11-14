# Gym App

A mobile-first workout tracker: pick a split, see your week, log sets with a rest timer,
and watch your top sets climb.

**Live:** https://ricciricch.github.io/gym-app/

<!-- Screenshots: added once the generated art set (M1) lands. -->

## Features

- **Splits** – start from a preset (Push/Pull/Legs, Upper/Lower, Full Body, Bro Split) or
  from scratch. Move days between weekdays, set default exercises with sets × reps.
- **Calendar** – week and month views, completed workouts marked, swap two days for the
  current week only (stored as overrides, your split stays untouched).
- **Today** – one big "Start workout" button for whatever is scheduled, or "Train anyway"
  on a rest day.
- **Workout logging** – prefilled from your last session, reps × weight, one tap to mark
  a set done, add/remove sets and exercises, and an offer to update the day's defaults
  when you finish. The draft survives reloads (localStorage).
- **Rest timer** – starts automatically after a set, ±15 s, adjustable default, vibrates
  when done.
- **Works offline** – a small hand-written service worker precaches the whole app (the
  file list is generated at build time), and the last loaded data is kept on the phone, so
  the app opens and shows your split and history with no signal. Log the workout
  offline and tap Finish once you are back online.
- **Celebrations** – finishing a workout shows a summary; beating a record sets off
  confetti, a "NEW PR!" stamp and the gain over your previous best.
- **Streak** – a burning flame for every week in a row that you hit all your planned
  workouts; rest days never break it.
- **Progress** – workout history, and a top-set chart per exercise with PR markers.
- **Exercise library** – 12 core lifts with target muscles and three form cues each,
  plus your own custom exercises.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · React Router · TanStack Query ·
Recharts · Supabase (Postgres, Auth, Row Level Security) · Vitest · GitHub Pages.

## Run locally

```bash
npm install
cp .env.example .env   # fill in your Supabase URL + publishable key
npm run dev            # http://localhost:5173/gym-app/
```

Other scripts: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`.

The database schema lives in `supabase/migrations/`. Apply it to a fresh Supabase project
before running the app.

## Security

- Row Level Security is enabled on every table; each user can only read and write their
  own rows (core exercises are read-only for everyone signed in).
- Only the publishable key ships to the browser. `.env` is never committed; CI reads the
  public URL and key from repository variables.
- Supabase security advisors are run after every schema change.
- Account deletion runs in an Edge Function with the service role, which never reaches the
  client; it deletes only the user identified by the request's JWT.

## How I built it

Built with [Claude Code](https://claude.com/claude-code) as a pair, milestone by milestone
(see [`PLAN.md`](PLAN.md)):

1. **Plan first.** `PLAN.md` fixed the MVP scope and a data model that leaves room for
   friends and a feed later (every row has an explicit `user_id`), without building them.
2. **Schema + RLS before UI.** One migration with policies on every table, then the
   Supabase security advisors until they came back clean.
3. **Pure logic, tested.** Scheduling (weekday layout, swaps, month grid), workout parsing
   and PR detection live in `src/lib/` as plain functions with Vitest tests.
4. **Verify in a real browser.** Every milestone was clicked through at a 375 px phone
   viewport before committing. That's how a `position: fixed` bug inside a transformed
   page wrapper turned up (fixed by portalling sheets and the rest timer to `<body>`).
5. **Art direction.** Exercise images, avatars, the icon and the mascot are generated with
   Higgsfield from a single chosen style, checked for form and anatomy, and stored locally
   as WebP. Prompts are logged in [`docs/prompts.md`](docs/prompts.md).

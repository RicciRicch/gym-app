# Product

## What we're building
A gym app for tracking progress. You log workouts, see your strength and consistency improve over time, and plan your training split on a calendar. Fun features (achievements, XP, social, challenges) come later, on top of that tracking core.

## Who it's for
Me and my friends, for now. A small, private group, not a public launch.
- Everyone has their own account and their own data.
- No need to design for scale, app-store polish or monetisation yet.
- Later, friends may see each other's progress (social layer), so data design should not block that.

## What it must do well
Everything in the core loop, in this order of priority:
1. **Log a workout fast.** Few taps per set. This is used mid-workout, with sweaty hands.
2. **Show progress clearly.** Charts per exercise, personal records (PRs), volume trends.
3. **Plan the split.** Choose a training split (e.g. Push/Pull/Legs), see it on a calendar, and edit it whenever we want.

## MVP (first version)
| In MVP | Track |
|--------|-------|
| Foundation: app shell, auth, database | [0 Foundation](docs/tracks/00-foundation.md) |
| Exercise library | [A](docs/tracks/a-exercises.md) |
| Workout logging (sets, reps, weight) | [B](docs/tracks/b-workout.md) |
| Plans (splits) and calendar | [C](docs/tracks/c-plans-calendar.md) |
| Progress charts and PRs | [D](docs/tracks/d-progress.md) |

## After the MVP
| Later | Track |
|-------|-------|
| Bodyweight and measurements | [E](docs/tracks/e-body.md) |
| Goals and streaks | [F](docs/tracks/f-goals.md) |
| Fun layer: achievements, XP, social, challenges | [G+](docs/tracks/g-fun-layer.md) |

## Principles
- **Tracking first, fun later.** Fun features are built from events the tracking code emits; they never complicate logging.
- **Editable plans.** Changing the split never rewrites past workouts. History is a record of what actually happened.
- **Your data is yours.** Each user can see and edit only their own data (Supabase Row Level Security).
- **Keep it simple.** If a feature needs a manual, redesign it.

## Out of scope for now
Public launch, app-store release, payments, nutrition tracking, wearable integrations, coach/trainer accounts.

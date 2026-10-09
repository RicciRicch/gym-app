# Track B: Workout logging

**Branch:** `feat/workout` · **Status:** blocked on Foundation · **MVP, highest priority**
**Folder:** `src/features/workout/`

## Goal
Log a workout as fast as possible, mid-session, with minimal taps.

## Scope
- Start a workout: empty, or from today's planned day (from Track C), or repeat a past workout.
- Add exercises (via the Track A picker), then log sets: weight, reps, optional RPE, warm-up flag.
- Pre-fill each set from the last time the user did that exercise.
- Rest timer between sets.
- Finish and save; edit or delete past workouts.
- Workout history list and detail view.
- On finish, emit `workout_completed`; when a set is a new best, emit `pr_set` (detection logic lives in Track D).

## Data
`workouts`, `workout_exercises`, `sets`. Weight stored in kg.

## Rules
- A workout in progress must survive the app being closed (save drafts locally and sync).
- Past workouts are never changed by edits to the plan.

## Done when
A full workout can be logged in under a minute of tapping, saved, and found again in history.

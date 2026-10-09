# Track D: Progress and PRs

**Branch:** `feat/progress` · **Status:** blocked on Foundation · **MVP**
**Folder:** `src/features/progress/`

## Goal
Make improvement obvious: for each exercise and overall.

## Scope
- Per-exercise chart: best weight, estimated 1RM, and volume over time.
- PR detection: heaviest weight, best estimated 1RM, most reps at a weight. Detect on workout save and emit `pr_set`.
- PR list and recent-PR highlights.
- Overall trends: weekly volume, workouts per week.
- Date-range filters (4 weeks, 3 months, 1 year, all).

## Data
Reads `workouts`, `workout_exercises`, `sets`. May add a derived `personal_records` table or view.

## Rules
- Estimated 1RM uses one documented formula (Epley), defined in one place.
- Warm-up sets are excluded from PRs and volume.
- Can be built against mock data until Track B lands.

## Done when
After logging a few workouts, the user sees correct charts and PRs per exercise.

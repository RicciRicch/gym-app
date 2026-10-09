# Track C: Plans (splits) and calendar

**Branch:** `feat/plans` · **Status:** blocked on Foundation · **MVP**
**Folder:** `src/features/plans/` (calendar screen lives here too)

## Goal
Choose a training split, see it on a calendar, and change it whenever we want, without losing history.

## Concepts
- **Split / plan:** a named set of training days, e.g. "Push / Pull / Legs" or "Upper / Lower".
- **Plan day:** one day of a split (e.g. "Push") with its exercises and target sets/reps.
- **Calendar entry:** what is planned for a specific date, and (once done) the workout that happened.

## Scope
- Create, edit and delete splits and their days; pick exercises via the Track A picker.
- Assign a split to the calendar: a repeating weekly pattern (e.g. Mon Push, Tue Pull, Wed rest) that the user can change at any time.
- Override a single day (swap, skip, move) without touching the pattern.
- Calendar view: shows each date's planned day, and marks days with a completed workout.
- "Start today's workout" hands the planned day to Track B.
- Show which split was active on past dates (history of choices).

## Data (draft, finalised in Foundation)
`plans`, `plan_days`, `plan_day_exercises`, `calendar_pattern` (weekday to plan day), `calendar_overrides` (date to plan day or rest). Completed workouts link back to `plan_day_id` when started from a plan.

## Rules
- Editing a plan changes the future only. Past calendar days keep what was planned and done.
- Changing the weekly pattern records an effective-from date.

## Done when
A user can create a split, put it on the calendar, edit it later, and the calendar correctly shows past and future days.

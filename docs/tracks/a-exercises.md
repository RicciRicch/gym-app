# Track A: Exercise library

**Branch:** `feat/exercises` · **Status:** blocked on Foundation · **MVP**
**Folder:** `src/features/exercises/`

## Goal
A searchable list of exercises that logging and plans can pick from.

## Scope
- Seed data: a starter set of common exercises (name, primary muscle group, equipment).
- Browse, search and filter by muscle group and equipment.
- Create custom exercises (private to the user).
- Exercise picker component, exported for other tracks.

## Data
`exercises` table: built-in rows have no owner; custom rows have `user_id`.

## Exports other tracks use
`ExercisePicker`, `useExercises()`, `useExercise(id)`.

## Done when
Seeded library works offline-safe in the UI, search is fast, custom exercises can be added and edited, picker is usable from the workout screen.

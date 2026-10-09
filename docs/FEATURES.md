# Feature Tracks

Work is split into tracks. Each track has its own doc in `docs/tracks/` and owns one folder under `src/features/<track>/`, so tracks run in parallel with minimal merge conflicts. The product context is in [PRODUCT.md](../PRODUCT.md).

## Order of work
1. **Foundation** first, by one session. Everything depends on it.
2. **MVP tracks** A, B, C, D in parallel once Foundation lands.
3. **After MVP:** E, F, then the fun layer.

## Status board
Update your row in the PR when you start or finish a track.

| Track | Doc | Branch | In MVP | Status |
|-------|-----|--------|--------|--------|
| 0 Foundation | [00-foundation](tracks/00-foundation.md) | `feat/foundation` | Yes | Not started |
| A Exercise library | [a-exercises](tracks/a-exercises.md) | `feat/exercises` | Yes | Blocked on 0 |
| B Workout logging | [b-workout](tracks/b-workout.md) | `feat/workout` | Yes | Blocked on 0 |
| C Plans and calendar | [c-plans-calendar](tracks/c-plans-calendar.md) | `feat/plans` | Yes | Blocked on 0 |
| D Progress and PRs | [d-progress](tracks/d-progress.md) | `feat/progress` | Yes | Blocked on 0 |
| E Body metrics | [e-body](tracks/e-body.md) | `feat/body` | Later | Not started |
| F Goals and streaks | [f-goals](tracks/f-goals.md) | `feat/goals` | Later | Not started |
| G+ Fun layer | [g-fun-layer](tracks/g-fun-layer.md) | per feature | Later | Not started |

## Dependencies
- A, B, C, D all need Foundation (schema, auth, UI kit).
- B and C use the Track A exercise picker. Until A lands, use a simple stub.
- C hands "today's planned day" to B.
- D reads data written by B. It can start with mock data.
- E and F come after the MVP; the fun layer after those.

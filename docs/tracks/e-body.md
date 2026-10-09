# Track E: Body metrics (after MVP)

**Branch:** `feat/body` · **Status:** later
**Folder:** `src/features/body/`

## Scope
- Bodyweight log with a trend chart.
- Optional measurements (chest, waist, arms, etc.).
- Optional progress photos (Supabase Storage, private).

## Data
`body_metrics` (date, weight_kg, measurements jsonb). Photos in a private storage bucket.

## Done when
Logging bodyweight takes a few seconds and the trend is visible.

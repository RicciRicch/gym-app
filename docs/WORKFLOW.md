# Parallel Workflow

## Branching
- `main` is always runnable. Never commit to it directly.
- One branch per track: `feat/<track>` (see the status board in FEATURES.md).
- Each parallel session works in its **own git worktree** so sessions never touch the same files on disk:
  ```
  git worktree add ../gym-app-workout feat/workout
  ```
- Small PRs, merged often. Rebase on `main` daily to keep conflicts small.

## Ownership rules (avoid collisions)
1. Stay inside your `src/features/<track>/` folder.
2. Shared files (`src/ui/`, `src/lib/`, navigation, `package.json`) are touched rarely. Keep such changes in a separate small PR and merge it first.
3. New dependencies: add in their own commit and mention it in the PR.
4. Don't edit another track's folder. Ask for what you need, or add an export to its `index.ts` via a PR.

## Database changes
- Only via a new file in `supabase/migrations/`, named `YYYYMMDDHHMMSS_<description>.sql`.
- Never edit a migration that has been merged.
- Make migrations additive where possible (new tables or columns).
- After a schema change, regenerate `src/types/db.ts` in the same PR.
- Use a Supabase **dev branch** per feature when testing migrations, never the main project.

## PR checklist
- Type-check, lint and tests pass
- Status board in FEATURES.md updated
- Screenshots for UI changes
- Migration (if any) is additive and has RLS

## Commit style
Conventional commits: `feat(workout): add rest timer`, `fix(progress): ...`, `docs: ...`.

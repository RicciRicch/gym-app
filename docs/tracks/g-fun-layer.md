# Track G+: Fun layer (later)

Built only after the MVP works. All of it listens to events from the tracking code (`workout_completed`, `pr_set`, `goal_reached`) through `src/lib/events.ts`. Tracking code never imports from these features.

| Feature | Folder | Idea |
|---------|--------|------|
| G. Achievements | `features/achievements` | Badges for milestones (first workout, 100 sets, a new PR) |
| H. XP and levels | `features/xp` | Points per workout, levels, weekly quests |
| I. Social | `features/social` | Friends, activity feed, see each other's PRs |
| J. Challenges | `features/challenges` | Time-boxed challenges and leaderboards among friends |

Each will get its own track doc when it is picked up.

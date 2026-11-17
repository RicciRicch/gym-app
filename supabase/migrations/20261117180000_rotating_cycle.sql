-- Rotating cycle: a split can follow the week (weekday per day) or rotate through
-- its days in order (position), with rest days after each one. The weekdays are
-- kept in rotating mode, so switching back restores the weekly layout.

alter table public.splits
  add column mode text not null default 'weekly' check (mode in ('weekly', 'rotating'));

alter table public.split_days
  add column rest_after smallint not null default 0 check (rest_after between 0 and 6);

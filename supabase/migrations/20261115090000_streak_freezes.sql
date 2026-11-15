-- Streak freezes: a frozen week (sick, travelling) neither counts nor breaks the
-- weekly streak. One row per frozen week; week_start is that week's Monday.
-- At most one freeze per user per calendar month (by the Monday's month).

create table public.streak_freezes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create unique index streak_freezes_one_per_month
  on public.streak_freezes (user_id, (extract(year from week_start) * 12 + extract(month from week_start)));

alter table public.streak_freezes enable row level security;

create policy "streak_freezes_select_own" on public.streak_freezes for select to authenticated
  using (user_id = (select auth.uid()));

-- Only the running week can be frozen (one day of slack either side for time zones):
-- no back-filling old gaps and no stockpiling future weeks.
create policy "streak_freezes_insert_own" on public.streak_freezes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and week_start between current_date - 7 and current_date + 1
  );

-- Undo is allowed for the running week only; past freezes are history.
create policy "streak_freezes_delete_own" on public.streak_freezes for delete to authenticated
  using (
    user_id = (select auth.uid())
    and week_start >= current_date - 7
  );

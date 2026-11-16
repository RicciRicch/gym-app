-- Training together: before (or during) a workout the user tags the friends
-- they train with. One row per workout and friend; both sides can read it, so
-- each of them sees how many workouts they did together. No weights involved.

create table public.workout_partners (
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  -- The workout's date, copied so the friend can count days without reading the workout.
  day date not null,
  created_at timestamptz not null default now(),
  primary key (workout_id, friend_id),
  check (user_id <> friend_id)
);
create index workout_partners_user on public.workout_partners (user_id);
create index workout_partners_friend on public.workout_partners (friend_id);

alter table public.workout_partners enable row level security;

create policy "workout_partners_select_mine" on public.workout_partners for select to authenticated
  using ((select auth.uid()) in (user_id, friend_id));
-- Only on the user's own workout, with its real date, and only a friend.
create policy "workout_partners_insert_own" on public.workout_partners for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.are_friends(user_id, friend_id)
    and exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.user_id = (select auth.uid()) and w.date = day
    )
  );
create policy "workout_partners_delete_own" on public.workout_partners for delete to authenticated
  using (user_id = (select auth.uid()));

-- New tables get full privileges by default: start from nothing.
revoke all on public.workout_partners from anon, authenticated;
grant select, delete on public.workout_partners to authenticated;
grant insert (workout_id, friend_id, day) on public.workout_partners to authenticated;

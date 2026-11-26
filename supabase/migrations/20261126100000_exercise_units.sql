-- Pounds for machines that only show lb: which unit each user types an
-- exercise's weights in. Weights stay stored in kg (workout_sets.weight_kg);
-- this only decides input and display. No row = kg.

create table public.exercise_units (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  unit text not null check (unit in ('kg', 'lb')),
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);
create index exercise_units_exercise_id_idx on public.exercise_units (exercise_id);

alter table public.exercise_units enable row level security;

create policy "exercise_units_select_own" on public.exercise_units for select to authenticated
  using (user_id = (select auth.uid()));
-- Only exercises you can see: the core library or your own.
create policy "exercise_units_insert_own" on public.exercise_units for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.exercises e
      where e.id = exercise_units.exercise_id and (e.user_id is null or e.user_id = (select auth.uid()))
    )
  );
create policy "exercise_units_update_own" on public.exercise_units for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.exercises e
      where e.id = exercise_units.exercise_id and (e.user_id is null or e.user_id = (select auth.uid()))
    )
  );
create policy "exercise_units_delete_own" on public.exercise_units for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.exercise_units from anon, authenticated;
grant select, delete on public.exercise_units to authenticated;
grant insert (user_id, exercise_id, unit, updated_at), update (user_id, exercise_id, unit, updated_at)
  on public.exercise_units to authenticated;

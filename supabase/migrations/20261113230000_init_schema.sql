-- gym-app initial schema.
-- Every table has an explicit owner column (user_id) and owner-only RLS.
-- Social features later = additional SELECT policies + new tables, no changes here.

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique
    check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null
    check (char_length(display_name) between 1 and 40),
  avatar_key text not null,
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------- exercises
-- user_id IS NULL  -> core library exercise (read-only for everyone signed in)
-- user_id NOT NULL -> custom exercise owned by that user
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  slug text,
  name text not null check (char_length(name) between 1 and 60),
  muscles text[] not null default '{}',
  cues text[] not null default '{}',
  image_key text,
  created_at timestamptz not null default now()
);
create unique index exercises_core_slug_key on public.exercises (slug) where user_id is null;
create index exercises_user_id_idx on public.exercises (user_id);

-- ------------------------------------------------------------------ splits
create table public.splits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  preset_key text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index splits_user_id_idx on public.splits (user_id);
create unique index splits_one_active_per_user on public.splits (user_id) where is_active;

-- -------------------------------------------------------------- split_days
-- weekday: 0 = Monday ... 6 = Sunday. NULL = day not placed on the week.
-- Weekdays with no split_day are rest days.
create table public.split_days (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references public.splits (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  weekday smallint check (weekday between 0 and 6),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  -- deferred so two days can trade weekdays inside one statement
  constraint split_days_split_weekday_key unique (split_id, weekday) deferrable initially deferred
);
create index split_days_user_id_idx on public.split_days (user_id);

-- ----------------------------------------------------- split_day_exercises
create table public.split_day_exercises (
  id uuid primary key default gen_random_uuid(),
  split_day_id uuid not null references public.split_days (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  position integer not null default 0,
  target_sets smallint not null default 3 check (target_sets between 1 and 20),
  target_reps smallint not null default 10 check (target_reps between 1 and 100),
  created_at timestamptz not null default now()
);
create index split_day_exercises_split_day_id_idx on public.split_day_exercises (split_day_id);
create index split_day_exercises_user_id_idx on public.split_day_exercises (user_id);
create index split_day_exercises_exercise_id_idx on public.split_day_exercises (exercise_id);

-- ------------------------------------------------------ schedule_overrides
-- One row = "on this date do split_day_id instead of the weekly plan".
-- split_day_id NULL = rest. A swap is two rows.
create table public.schedule_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  split_day_id uuid references public.split_days (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
create index schedule_overrides_split_day_id_idx on public.schedule_overrides (split_day_id);

-- ---------------------------------------------------------------- workouts
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  split_day_id uuid references public.split_days (id) on delete set null,
  day_name text not null, -- snapshot, survives split edits
  date date not null,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index workouts_user_date_idx on public.workouts (user_id, date desc);
create index workouts_split_day_id_idx on public.workouts (split_day_id);

-- ------------------------------------------------------------ workout_sets
create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  exercise_position integer not null default 0,
  set_number smallint not null check (set_number >= 1),
  reps smallint not null check (reps between 0 and 1000),
  weight_kg numeric(6, 2) not null check (weight_kg >= 0),
  created_at timestamptz not null default now()
);
create index workout_sets_workout_id_idx on public.workout_sets (workout_id);
create index workout_sets_user_exercise_idx on public.workout_sets (user_id, exercise_id);
create index workout_sets_exercise_id_idx on public.workout_sets (exercise_id);

-- --------------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.splits enable row level security;
alter table public.split_days enable row level security;
alter table public.split_day_exercises enable row level security;
alter table public.schedule_overrides enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;

-- profiles: own row only
create policy "profiles_select_own" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- exercises: read core + own, write own only
create policy "exercises_select_core_or_own" on public.exercises for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
create policy "exercises_insert_own" on public.exercises for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "exercises_update_own" on public.exercises for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "exercises_delete_own" on public.exercises for delete to authenticated
  using (user_id = (select auth.uid()));

-- splits
create policy "splits_select_own" on public.splits for select to authenticated
  using (user_id = (select auth.uid()));
create policy "splits_insert_own" on public.splits for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "splits_update_own" on public.splits for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "splits_delete_own" on public.splits for delete to authenticated
  using (user_id = (select auth.uid()));

-- split_days (child rows must also point at a parent the user owns)
create policy "split_days_select_own" on public.split_days for select to authenticated
  using (user_id = (select auth.uid()));
create policy "split_days_insert_own" on public.split_days for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.splits s where s.id = split_id and s.user_id = (select auth.uid()))
  );
create policy "split_days_update_own" on public.split_days for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.splits s where s.id = split_id and s.user_id = (select auth.uid()))
  );
create policy "split_days_delete_own" on public.split_days for delete to authenticated
  using (user_id = (select auth.uid()));

-- split_day_exercises
create policy "split_day_exercises_select_own" on public.split_day_exercises for select to authenticated
  using (user_id = (select auth.uid()));
create policy "split_day_exercises_insert_own" on public.split_day_exercises for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.split_days d where d.id = split_day_id and d.user_id = (select auth.uid()))
  );
create policy "split_day_exercises_update_own" on public.split_day_exercises for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.split_days d where d.id = split_day_id and d.user_id = (select auth.uid()))
  );
create policy "split_day_exercises_delete_own" on public.split_day_exercises for delete to authenticated
  using (user_id = (select auth.uid()));

-- schedule_overrides
create policy "schedule_overrides_select_own" on public.schedule_overrides for select to authenticated
  using (user_id = (select auth.uid()));
create policy "schedule_overrides_insert_own" on public.schedule_overrides for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      split_day_id is null
      or exists (select 1 from public.split_days d where d.id = split_day_id and d.user_id = (select auth.uid()))
    )
  );
create policy "schedule_overrides_update_own" on public.schedule_overrides for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      split_day_id is null
      or exists (select 1 from public.split_days d where d.id = split_day_id and d.user_id = (select auth.uid()))
    )
  );
create policy "schedule_overrides_delete_own" on public.schedule_overrides for delete to authenticated
  using (user_id = (select auth.uid()));

-- workouts
create policy "workouts_select_own" on public.workouts for select to authenticated
  using (user_id = (select auth.uid()));
create policy "workouts_insert_own" on public.workouts for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "workouts_update_own" on public.workouts for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "workouts_delete_own" on public.workouts for delete to authenticated
  using (user_id = (select auth.uid()));

-- workout_sets
create policy "workout_sets_select_own" on public.workout_sets for select to authenticated
  using (user_id = (select auth.uid()));
create policy "workout_sets_insert_own" on public.workout_sets for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid()))
  );
create policy "workout_sets_update_own" on public.workout_sets for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid()))
  );
create policy "workout_sets_delete_own" on public.workout_sets for delete to authenticated
  using (user_id = (select auth.uid()));

-- ------------------------------------------------------------------ grants
-- Signed-out visitors get nothing; signed-in users go through RLS.
revoke all on all tables in schema public from anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on
  public.exercises, public.splits, public.split_days, public.split_day_exercises,
  public.schedule_overrides, public.workouts, public.workout_sets
  to authenticated;

-- ------------------------------------------------------- core exercise seed
insert into public.exercises (user_id, slug, name, muscles, cues, image_key) values
  (null, 'bench-press', 'Bench Press', '{Chest,Triceps,Front delts}',
   '{"Shoulder blades pinched back and down","Lower the bar to mid-chest, elbows ~45°","Feet planted, drive the bar up and slightly back"}', 'bench-press'),
  (null, 'squat', 'Back Squat', '{Quads,Glutes,Core}',
   '{"Brace your core before every rep","Knees track over toes, hips below parallel","Drive up through mid-foot, chest tall"}', 'squat'),
  (null, 'deadlift', 'Deadlift', '{Hamstrings,Glutes,Lower back}',
   '{"Bar over mid-foot, shins close","Flat back, lats tight, pull the slack out","Push the floor away, lock out with hips"}', 'deadlift'),
  (null, 'overhead-press', 'Overhead Press', '{Shoulders,Triceps,Upper chest}',
   '{"Squeeze glutes and brace, no leaning back","Forearms vertical, bar starts at collarbone","Press straight up, head through at the top"}', 'overhead-press'),
  (null, 'barbell-row', 'Barbell Row', '{Lats,Upper back,Biceps}',
   '{"Hinge to ~45° with a flat back","Pull the bar to your lower ribs","Control the way down, no jerking"}', 'barbell-row'),
  (null, 'pull-up', 'Pull-Up', '{Lats,Biceps,Upper back}',
   '{"Start from a dead hang, shoulders engaged","Drive elbows down to your sides","Chin over the bar, lower under control"}', 'pull-up'),
  (null, 'lat-pulldown', 'Lat Pulldown', '{Lats,Biceps,Rear delts}',
   '{"Slight lean back, chest up","Pull the bar to your upper chest","Lead with elbows, slow return"}', 'lat-pulldown'),
  (null, 'dumbbell-curl', 'Dumbbell Curl', '{Biceps,Forearms}',
   '{"Elbows pinned to your sides","Curl without swinging the torso","Lower slowly to full extension"}', 'dumbbell-curl'),
  (null, 'triceps-pushdown', 'Triceps Pushdown', '{Triceps}',
   '{"Elbows locked at your sides","Push down to full lockout","Control the return to 90°"}', 'triceps-pushdown'),
  (null, 'leg-press', 'Leg Press', '{Quads,Glutes,Hamstrings}',
   '{"Feet shoulder-width, mid-platform","Lower until knees reach ~90°","Lower back stays on the pad, do not lock knees hard"}', 'leg-press'),
  (null, 'romanian-deadlift', 'Romanian Deadlift', '{Hamstrings,Glutes,Lower back}',
   '{"Soft knees, push hips straight back","Bar slides close to your legs","Stop at a deep hamstring stretch, squeeze glutes up"}', 'romanian-deadlift'),
  (null, 'lateral-raise', 'Lateral Raise', '{Side delts}',
   '{"Slight bend in the elbows","Raise to shoulder height, lead with elbows","No shrugging, lower slowly"}', 'lateral-raise');

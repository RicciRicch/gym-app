-- Push notifications, part two: a workout reminder at a time you pick (only on a
-- planned day you have not trained yet) and "streak at risk" (you need every day
-- left this week to keep your streak).
--
-- What is planned when lives in the app (weekly layout, swaps, rotating cycle), so
-- the app publishes the next 14 days plus its time zone and weekly target into
-- push_plans. pg_cron runs private.push_reminders() every 5 minutes; it finds who is
-- due in their own local time and queues one notification per user per day through
-- private.queue_push (part one).

create extension if not exists pg_cron;

-- -------------------------------------------------------------- settings
alter table public.profiles
  add column remind_time time check (remind_time is null or extract(second from remind_time) = 0),
  add column notify_streak boolean not null default true;

grant update (remind_time, notify_streak) on public.profiles to authenticated;

-- ------------------------------------------------------------------ plan
create table public.push_plans (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  time_zone text not null check (length(time_zone) between 1 and 64),
  mode text not null check (mode in ('weekly', 'rotating')),
  -- Training days ahead, oldest first: [{ "date": "2026-11-20", "name": "Push" }, ...]
  days jsonb not null default '[]' check (jsonb_typeof(days) = 'array' and jsonb_array_length(days) <= 31),
  weekly_target smallint not null check (weekly_target between 1 and 7),
  updated_at timestamptz not null default now()
);

alter table public.push_plans enable row level security;

create policy "push_plans_select_own" on public.push_plans for select to authenticated
  using (user_id = (select auth.uid()));
create policy "push_plans_insert_own" on public.push_plans for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "push_plans_update_own" on public.push_plans for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "push_plans_delete_own" on public.push_plans for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.push_plans from anon, authenticated;
grant select, delete on public.push_plans to authenticated;
grant insert (user_id, time_zone, mode, days, weekly_target, updated_at),
  update (time_zone, mode, days, weekly_target, updated_at) on public.push_plans to authenticated;

-- An unknown time zone would break the reminder job for everyone: reject it here.
create function private.check_push_plan() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.time_zone) then
    raise exception 'unknown time zone' using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function private.check_push_plan() from public, anon, authenticated;

create trigger push_plans_check before insert or update on public.push_plans
  for each row execute function private.check_push_plan();

-- ------------------------------------------------------------------ logic
-- Weeks in a row (before the running one) that met the target. Same rules as
-- src/lib/streak.ts: a frozen week neither counts nor breaks the streak.
create function private.streak_before(p_user uuid, p_monday date, p_target int) returns int
language plpgsql stable set search_path = '' as $$
declare
  weeks int := 0;
  week date := p_monday - 7;
  trained int;
begin
  for i in 1..520 loop
    select count(distinct w.date) into trained from public.workouts w
      where w.user_id = p_user and w.date >= week and w.date < week + 7;
    if trained >= p_target then
      weeks := weeks + 1;
    elsif not exists (select 1 from public.streak_freezes f where f.user_id = p_user and f.week_start = week) then
      exit;
    end if;
    week := week - 7;
  end loop;
  return weeks;
end $$;

-- Sent today (local date), so nobody gets more than one reminder a day.
create table private.reminder_log (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);
revoke all on private.reminder_log from public, anon, authenticated;

-- Everyone who should get a reminder right now, and what it says. `p_now` is a
-- parameter so the rules can be checked with any time.
create function private.due_reminders(p_now timestamptz default now())
returns table (user_id uuid, local_day date, kind text, day_name text, waiting_since date,
  streak_weeks int, needed int, days_left int)
language plpgsql stable set search_path = '' as $$
declare
  r record;
  local_ts timestamp;
  today date;
  monday date;
  first_day jsonb;
  trained_week int;
  at_time time;
  streak int;
begin
  for r in
    select p.id, p.remind_time, p.notify_streak, pp.time_zone, pp.mode, pp.days, pp.weekly_target
    from public.profiles p
    join public.push_plans pp on pp.user_id = p.id
    where (p.remind_time is not null or p.notify_streak)
      and exists (select 1 from public.push_subscriptions s where s.user_id = p.id)
  loop
    local_ts := p_now at time zone r.time_zone;
    today := local_ts::date;
    -- The reminder time, or 18:00 for streak warnings alone; up to two hours late
    -- (a missed run still sends), never twice a day, never once you trained.
    at_time := coalesce(r.remind_time, time '18:00');
    continue when local_ts < today + at_time or local_ts >= today + at_time + interval '2 hours';
    continue when exists (select 1 from private.reminder_log l where l.user_id = r.id and l.day = today);
    continue when exists (select 1 from public.workouts w where w.user_id = r.id and w.date = today);

    user_id := r.id;
    local_day := today;
    day_name := null;
    waiting_since := null;
    streak_weeks := 0;
    needed := 0;
    days_left := 0;

    -- Planned today? Weekly: today is in the plan. Rotating: the plan waits, so the
    -- first day ahead is due once its date has come and nothing was trained since
    -- (for a week at most, so a break does not mean a daily nag).
    first_day := r.days -> 0;
    if r.mode = 'weekly' then
      select d ->> 'name' into day_name from jsonb_array_elements(r.days) d where (d ->> 'date')::date = today limit 1;
    elsif first_day is not null and (first_day ->> 'date')::date between today - 7 and today
      and not exists (select 1 from public.workouts w where w.user_id = r.id and w.date >= (first_day ->> 'date')::date) then
      day_name := first_day ->> 'name';
      if (first_day ->> 'date')::date < today then waiting_since := (first_day ->> 'date')::date; end if;
    end if;

    -- Streak at risk: there is a streak, this week is not frozen or done, and it
    -- takes a workout on every day that is left (today included).
    monday := today - (extract(isodow from today)::int - 1);
    if r.notify_streak and not exists (select 1 from public.streak_freezes f where f.user_id = r.id and f.week_start = monday) then
      select count(distinct w.date) into trained_week from public.workouts w
        where w.user_id = r.id and w.date >= monday and w.date < monday + 7;
      if trained_week < r.weekly_target and r.weekly_target - trained_week = (monday + 7) - today then
        streak := private.streak_before(r.id, monday, r.weekly_target);
        if streak > 0 then
          streak_weeks := streak;
          needed := r.weekly_target - trained_week;
          days_left := (monday + 7) - today;
        end if;
      end if;
    end if;

    if streak_weeks > 0 then
      kind := 'streak';
    elsif day_name is not null and r.remind_time is not null then
      kind := 'reminder';
    else
      continue;
    end if;
    return next;
  end loop;
end $$;

create function private.push_reminders() returns int
language plpgsql security definer set search_path = '' as $$
declare
  due record;
  sent int := 0;
begin
  delete from private.reminder_log where day < current_date - 3;
  for due in select * from private.due_reminders() loop
    insert into private.reminder_log (user_id, day) values (due.user_id, due.local_day) on conflict do nothing;
    continue when not found;
    perform private.queue_push(jsonb_build_object(
      'kind', due.kind,
      'user_id', due.user_id,
      'day_name', due.day_name,
      'waiting_since', due.waiting_since,
      'streak_weeks', due.streak_weeks,
      'needed', due.needed,
      'days_left', due.days_left
    ));
    sent := sent + 1;
  end loop;
  return sent;
end $$;

revoke all on function private.streak_before(uuid, date, int), private.due_reminders(timestamptz),
  private.push_reminders() from public, anon, authenticated;

select cron.schedule('push-reminders', '*/5 * * * *', 'select private.push_reminders()');

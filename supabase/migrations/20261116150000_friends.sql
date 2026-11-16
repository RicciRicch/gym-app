-- Friends: a personal code to add each other, requests, a daily nudge, and the
-- few stats friends may see (never weights).
--
-- Nobody can read another user's profile directly. Everything that crosses
-- users goes through functions in the `private` schema (not exposed by the
-- API), reached via thin SECURITY INVOKER wrappers in `public`.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- ------------------------------------------------------------ friend codes
create function private.new_friend_code() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    select 'GORILA-' || string_agg(substr(alphabet, 1 + floor(random() * 32)::int, 1), '')
      into code from generate_series(1, 4);
    exit when not exists (select 1 from public.profiles where friend_code = code);
  end loop;
  return code;
end $$;

alter table public.profiles add column friend_code text unique
  check (friend_code ~ '^GORILA-[A-Z2-9]{4}$');
update public.profiles set friend_code = private.new_friend_code();
alter table public.profiles
  alter column friend_code set not null,
  alter column friend_code set default private.new_friend_code();

-- The code is handed out by the database: clients may only write their own fields.
revoke insert, update on public.profiles from authenticated;
grant insert (id, username, display_name, avatar_key, avatar_path) on public.profiles to authenticated;
grant update (username, display_name, avatar_key, avatar_path) on public.profiles to authenticated;

-- ------------------------------------------------------------- friendships
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (requester_id <> addressee_id)
);
-- One row per pair, whoever asked first.
create unique index friendships_pair
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_requester on public.friendships (requester_id);
create index friendships_addressee on public.friendships (addressee_id);

alter table public.friendships enable row level security;

create policy "friendships_select_mine" on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));
-- Decline, cancel or unfriend: either side may remove the row.
create policy "friendships_delete_mine" on public.friendships for delete to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));
-- Rows are created and accepted only through the functions below.
grant select, delete on public.friendships to authenticated;

create function private.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and least(f.requester_id, f.addressee_id) = least(a, b)
      and greatest(f.requester_id, f.addressee_id) = greatest(a, b)
  )
$$;

-- ------------------------------------------------------------------ nudges
-- "Get off the couch": one per friend per day. The receiver's gorilla says it.
create table public.nudges (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  unique (from_id, to_id, day)
);
create index nudges_to on public.nudges (to_id);

alter table public.nudges enable row level security;

create policy "nudges_select_mine" on public.nudges for select to authenticated
  using ((select auth.uid()) in (from_id, to_id));
-- Only to a friend, only for today (one day of slack either side for time zones).
create policy "nudges_insert_to_friend" on public.nudges for insert to authenticated
  with check (
    from_id = (select auth.uid())
    and seen_at is null
    and day between current_date - 1 and current_date + 1
    and private.are_friends(from_id, to_id)
  );
-- The receiver marks it as seen; nothing else can change.
create policy "nudges_update_received" on public.nudges for update to authenticated
  using (to_id = (select auth.uid())) with check (to_id = (select auth.uid()));
grant select on public.nudges to authenticated;
grant insert (to_id, day) on public.nudges to authenticated;
grant update (seen_at) on public.nudges to authenticated;

-- ------------------------------------------------------------ friend stats
-- What a user shows their friends, published by their own app (streak and
-- badges are computed on the phone). No weights.
create table public.friend_stats (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  streak_weeks int not null default 0 check (streak_weeks between 0 and 5000),
  -- Monday of the week the streak was published in; older than last week = stale.
  streak_week date not null check (extract(isodow from streak_week) = 1),
  badge_ids text[] not null default '{}' check (cardinality(badge_ids) <= 100),
  pr_count int not null default 0 check (pr_count between 0 and 100000),
  updated_at timestamptz not null default now()
);

alter table public.friend_stats enable row level security;

create policy "friend_stats_select_own_or_friend" on public.friend_stats for select to authenticated
  using (user_id = (select auth.uid()) or private.are_friends(user_id, (select auth.uid())));
create policy "friend_stats_insert_own" on public.friend_stats for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "friend_stats_update_own" on public.friend_stats for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update on public.friend_stats to authenticated;

-- --------------------------------------------------------------- functions
-- Who is behind a code, and how the caller relates to them. Knowing the code
-- reveals only the name and avatar.
create function private.friend_preview(p_code text)
returns table (id uuid, display_name text, avatar_key text, avatar_path text, relation text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name, p.avatar_key, p.avatar_path,
    case
      when p.id = auth.uid() then 'self'
      when f.status = 'accepted' then 'friends'
      when f.requester_id = auth.uid() then 'sent'
      when f.addressee_id = auth.uid() then 'received'
      else 'none'
    end
  from public.profiles p
  left join public.friendships f
    on least(f.requester_id, f.addressee_id) = least(p.id, auth.uid())
   and greatest(f.requester_id, f.addressee_id) = greatest(p.id, auth.uid())
  where auth.uid() is not null and p.friend_code = upper(trim(p_code))
$$;

-- Asks the owner of a code to be friends. If they already asked the caller,
-- that request is accepted instead. Returns 'sent', 'accepted' or 'friends'.
create function private.send_friend_request(p_code text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  target uuid;
  existing public.friendships;
begin
  if me is null or not exists (select 1 from public.profiles where id = me) then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select id into target from public.profiles where friend_code = upper(trim(p_code));
  if target is null then
    raise exception 'friend code not found' using errcode = 'P0002';
  end if;
  if target = me then
    raise exception 'that is your own code' using errcode = '22023';
  end if;

  select * into existing from public.friendships f
    where least(f.requester_id, f.addressee_id) = least(me, target)
      and greatest(f.requester_id, f.addressee_id) = greatest(me, target);
  if existing.id is not null then
    if existing.status = 'accepted' then return 'friends'; end if;
    if existing.requester_id = me then return 'sent'; end if;
    update public.friendships set status = 'accepted', accepted_at = now() where id = existing.id;
    return 'accepted';
  end if;

  if (select count(*) from public.friendships where requester_id = me and status = 'pending') >= 30 then
    raise exception 'too many open requests' using errcode = '54000';
  end if;
  insert into public.friendships (requester_id, addressee_id) values (me, target);
  return 'sent';
end $$;

create function private.accept_friend_request(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.friendships set status = 'accepted', accepted_at = now()
    where id = p_id and addressee_id = auth.uid() and status = 'pending';
  if not found then
    raise exception 'request not found' using errcode = 'P0002';
  end if;
end $$;

-- The caller's friends and open requests. Stats and activity only for accepted
-- friends: last workout, this week's days and sets, the last four weeks of dates.
create function private.friends_overview(p_week_start date)
returns table (
  friendship_id uuid, user_id uuid, display_name text, avatar_key text, avatar_path text,
  status text, since timestamptz,
  last_workout_date date, last_workout_day text, week_days int, week_sets int, recent_dates date[],
  streak_weeks int, streak_week date, badge_ids text[], pr_count int
)
language sql stable security definer set search_path = '' as $$
  select f.id, p.id, p.display_name, p.avatar_key, p.avatar_path,
    case when f.status = 'accepted' then 'accepted'
         when f.requester_id = auth.uid() then 'outgoing' else 'incoming' end,
    coalesce(f.accepted_at, f.created_at),
    lw.date, lw.day_name, wk.days, wk.sets, rd.dates,
    s.streak_weeks, s.streak_week, s.badge_ids, s.pr_count
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  left join lateral (
    select w.date, w.day_name from public.workouts w
    where f.status = 'accepted' and w.user_id = p.id
    order by w.date desc, w.finished_at desc limit 1
  ) lw on true
  left join lateral (
    select count(distinct w.date)::int as days, count(ws.id)::int as sets
    from public.workouts w left join public.workout_sets ws on ws.workout_id = w.id
    where f.status = 'accepted' and w.user_id = p.id
      and w.date >= p_week_start and w.date < p_week_start + 7
  ) wk on true
  left join lateral (
    select array_agg(distinct w.date order by w.date) as dates from public.workouts w
    where f.status = 'accepted' and w.user_id = p.id and w.date >= p_week_start - 21
  ) rd on true
  left join public.friend_stats s on f.status = 'accepted' and s.user_id = p.id
  where auth.uid() in (f.requester_id, f.addressee_id)
$$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- Public entry points: run as the caller, only forward to the functions above.
create function public.friend_preview(p_code text)
returns table (id uuid, display_name text, avatar_key text, avatar_path text, relation text)
language sql stable security invoker set search_path = '' as $$
  select * from private.friend_preview(p_code)
$$;

create function public.send_friend_request(p_code text) returns text
language sql security invoker set search_path = '' as $$
  select private.send_friend_request(p_code)
$$;

create function public.accept_friend_request(p_id uuid) returns void
language sql security invoker set search_path = '' as $$
  select private.accept_friend_request(p_id)
$$;

create function public.friends_overview(p_week_start date)
returns table (
  friendship_id uuid, user_id uuid, display_name text, avatar_key text, avatar_path text,
  status text, since timestamptz,
  last_workout_date date, last_workout_day text, week_days int, week_sets int, recent_dates date[],
  streak_weeks int, streak_week date, badge_ids text[], pr_count int
)
language sql stable security invoker set search_path = '' as $$
  select * from private.friends_overview(p_week_start)
$$;

revoke all on function public.friend_preview(text), public.send_friend_request(text),
  public.accept_friend_request(uuid), public.friends_overview(date) from public, anon;
grant execute on function public.friend_preview(text), public.send_friend_request(text),
  public.accept_friend_request(uuid), public.friends_overview(date) to authenticated;

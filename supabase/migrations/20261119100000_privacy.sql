-- Privacy settings: what friends see, who may ask to be friends or nudge, and a
-- fresh friend code. Defaults keep today's behaviour. Weights are never shared,
-- so there is no switch for them.
--
-- Enforced here, not in the app: friends read everything through
-- private.friends_overview, which blanks what the owner keeps private, and
-- friend_stats is no longer readable by friends directly.

alter table public.profiles
  add column share_activity boolean not null default true,
  add column share_streak boolean not null default true,
  add column share_badges boolean not null default true,
  add column accept_requests boolean not null default true,
  add column accept_nudges boolean not null default true,
  add column ask_proof boolean not null default true;

grant update (share_activity, share_streak, share_badges, accept_requests, accept_nudges, ask_proof)
  on public.profiles to authenticated;

-- ------------------------------------------------------------ friend stats
-- Friends get streak, badges and PR count only through the overview below.
drop policy "friend_stats_select_own_or_friend" on public.friend_stats;
create policy "friend_stats_select_own" on public.friend_stats for select to authenticated
  using (user_id = (select auth.uid()));

-- ------------------------------------------------------------------ nudges
create function private.accepts_nudges(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select accept_nudges from public.profiles where id = p_user), false)
$$;

drop policy "nudges_insert_to_friend" on public.nudges;
create policy "nudges_insert_to_friend" on public.nudges for insert to authenticated
  with check (
    from_id = (select auth.uid())
    and seen_at is null
    and day between current_date - 1 and current_date + 1
    and private.are_friends(from_id, to_id)
    and private.accepts_nudges(to_id)
  );

-- ------------------------------------------------------- friend requests
-- 'closed' = the code's owner takes no new requests (an existing one still shows).
create or replace function private.friend_preview(p_code text)
returns table (id uuid, display_name text, avatar_key text, avatar_path text, relation text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name, p.avatar_key, p.avatar_path,
    case
      when p.id = auth.uid() then 'self'
      when f.status = 'accepted' then 'friends'
      when f.requester_id = auth.uid() then 'sent'
      when f.addressee_id = auth.uid() then 'received'
      when not p.accept_requests then 'closed'
      else 'none'
    end
  from public.profiles p
  left join public.friendships f
    on least(f.requester_id, f.addressee_id) = least(p.id, auth.uid())
   and greatest(f.requester_id, f.addressee_id) = greatest(p.id, auth.uid())
  where auth.uid() is not null and p.friend_code = upper(trim(p_code))
$$;

create or replace function private.send_friend_request(p_code text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  target uuid;
  target_open boolean;
  existing public.friendships;
begin
  if me is null or not exists (select 1 from public.profiles where id = me) then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select id, accept_requests into target, target_open from public.profiles where friend_code = upper(trim(p_code));
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

  if not target_open then
    raise exception 'not accepting friend requests' using errcode = '42501';
  end if;
  if (select count(*) from public.friendships where requester_id = me and status = 'pending') >= 30 then
    raise exception 'too many open requests' using errcode = '54000';
  end if;
  insert into public.friendships (requester_id, addressee_id) values (me, target);
  return 'sent';
end $$;

-- A new code for the caller: old invite links and QR codes stop working.
create function private.regenerate_friend_code() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  code text := private.new_friend_code();
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  update public.profiles set friend_code = code where id = auth.uid();
  if not found then
    raise exception 'no profile' using errcode = 'P0002';
  end if;
  return code;
end $$;

-- ---------------------------------------------------------------- overview
-- Same as before, plus what each friend shares; hidden values come back null.
drop function public.friends_overview(date);
drop function private.friends_overview(date);

create function private.friends_overview(p_week_start date)
returns table (
  friendship_id uuid, user_id uuid, display_name text, avatar_key text, avatar_path text,
  status text, since timestamptz,
  last_workout_date date, last_workout_day text, week_days int, week_sets int, recent_dates date[],
  streak_weeks int, streak_week date, badge_ids text[], pr_count int,
  shares_activity boolean, shares_streak boolean, shares_badges boolean, accepts_nudges boolean
)
language sql stable security definer set search_path = '' as $$
  select f.id, p.id, p.display_name, p.avatar_key, p.avatar_path,
    case when f.status = 'accepted' then 'accepted'
         when f.requester_id = auth.uid() then 'outgoing' else 'incoming' end,
    coalesce(f.accepted_at, f.created_at),
    lw.date, lw.day_name, wk.days, wk.sets, rd.dates,
    case when p.share_streak then s.streak_weeks end,
    case when p.share_streak then s.streak_week end,
    case when p.share_badges then s.badge_ids end,
    case when p.share_badges then s.pr_count end,
    p.share_activity, p.share_streak, p.share_badges, p.accept_nudges
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  left join lateral (
    select w.date, w.day_name from public.workouts w
    where f.status = 'accepted' and p.share_activity and w.user_id = p.id
    order by w.date desc, w.finished_at desc limit 1
  ) lw on true
  left join lateral (
    select count(distinct w.date)::int as days, count(ws.id)::int as sets
    from public.workouts w left join public.workout_sets ws on ws.workout_id = w.id
    where f.status = 'accepted' and p.share_activity and w.user_id = p.id
      and w.date >= p_week_start and w.date < p_week_start + 7
  ) wk on p.share_activity
  left join lateral (
    select array_agg(distinct w.date order by w.date) as dates from public.workouts w
    where f.status = 'accepted' and p.share_activity and w.user_id = p.id and w.date >= p_week_start - 21
  ) rd on true
  left join public.friend_stats s on f.status = 'accepted' and s.user_id = p.id
  where auth.uid() in (f.requester_id, f.addressee_id)
$$;

revoke all on function private.friends_overview(date), private.accepts_nudges(uuid),
  private.regenerate_friend_code() from public, anon;
grant execute on function private.friends_overview(date), private.accepts_nudges(uuid),
  private.regenerate_friend_code() to authenticated;

create function public.friends_overview(p_week_start date)
returns table (
  friendship_id uuid, user_id uuid, display_name text, avatar_key text, avatar_path text,
  status text, since timestamptz,
  last_workout_date date, last_workout_day text, week_days int, week_sets int, recent_dates date[],
  streak_weeks int, streak_week date, badge_ids text[], pr_count int,
  shares_activity boolean, shares_streak boolean, shares_badges boolean, accepts_nudges boolean
)
language sql stable security invoker set search_path = '' as $$
  select * from private.friends_overview(p_week_start)
$$;

create function public.regenerate_friend_code() returns text
language sql volatile security invoker set search_path = '' as $$
  select private.regenerate_friend_code()
$$;

revoke all on function public.friends_overview(date), public.regenerate_friend_code() from public, anon;
grant execute on function public.friends_overview(date), public.regenerate_friend_code() to authenticated;

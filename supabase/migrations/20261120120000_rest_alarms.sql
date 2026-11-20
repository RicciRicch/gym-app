-- "Rest is over" from the server. A page cannot buzz once the phone sleeps it
-- (iPhones do that at once), so when a rest starts the app also leaves an alarm
-- here: when it ends and which of the user's push subscriptions (this phone)
-- should hear it. pg_cron checks every 5 seconds and sends the due ones through
-- private.queue_push -> send-push (kind 'rest').

create table public.rest_alarms (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null,
  fires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index rest_alarms_fires_at on public.rest_alarms (fires_at);

alter table public.rest_alarms enable row level security;

-- Only your own alarm, and only for a phone that is subscribed to your account.
create policy "rest_alarms_select_own" on public.rest_alarms for select to authenticated
  using (user_id = (select auth.uid()));
create policy "rest_alarms_insert_own" on public.rest_alarms for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.push_subscriptions s where s.endpoint = rest_alarms.endpoint and s.user_id = (select auth.uid()))
  );
create policy "rest_alarms_update_own" on public.rest_alarms for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.push_subscriptions s where s.endpoint = rest_alarms.endpoint and s.user_id = (select auth.uid()))
  );
create policy "rest_alarms_delete_own" on public.rest_alarms for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.rest_alarms from anon, authenticated;
grant select, delete on public.rest_alarms to authenticated;
grant insert (user_id, endpoint, fires_at), update (user_id, endpoint, fires_at) on public.rest_alarms to authenticated;

-- A rest lasts at most 10 minutes (plus +15 s taps): nothing in the past or far ahead.
create function private.check_rest_alarm() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.fires_at < now() - interval '5 seconds' or new.fires_at > now() + interval '15 minutes' then
    raise exception 'rest alarm out of range' using errcode = '22023';
  end if;
  new.created_at := now();
  return new;
end $$;
revoke all on function private.check_rest_alarm() from public, anon, authenticated;

create trigger rest_alarms_check before insert or update on public.rest_alarms
  for each row execute function private.check_rest_alarm();

-- Sends what is due (up to 2 s early, so with a 5 s schedule it lands about on
-- time) and forgets it. One that is over a minute late is dropped: a rest alarm
-- after the next set has started is noise.
create function private.fire_rest_alarms() returns int
language plpgsql security definer set search_path = '' as $$
declare
  due record;
  sent int := 0;
begin
  for due in
    delete from public.rest_alarms where fires_at <= now() + interval '2 seconds'
    returning user_id, endpoint, fires_at
  loop
    continue when due.fires_at < now() - interval '1 minute';
    perform private.queue_push(jsonb_build_object('kind', 'rest', 'user_id', due.user_id, 'endpoint', due.endpoint));
    sent := sent + 1;
  end loop;
  return sent;
end $$;
revoke all on function private.fire_rest_alarms() from public, anon, authenticated;

select cron.schedule('rest-alarms', '5 seconds', 'select private.fire_rest_alarms()');

-- A job every 5 seconds writes ~17k history rows a day: keep one day.
select cron.schedule('cron-history-cleanup', '17 * * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '1 day'$$);

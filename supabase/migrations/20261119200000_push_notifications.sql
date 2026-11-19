-- Push notifications, part one: nudges, friend requests (sent / accepted) and
-- reactions to your posts.
--
-- Flow: a trigger calls the `send-push` Edge Function through pg_net (async, never
-- blocks the insert) with a shared secret. The function reads the VAPID keys and
-- that secret from Vault through public.push_config(), which only the service role
-- may run, then sends to the recipient's subscriptions if they want that kind.
--
-- Vault secrets (set once with vault.create_secret, never in a migration):
--   push_function_url, push_webhook_secret, vapid_public_key, vapid_private_key, vapid_subject

create extension if not exists pg_net;

-- -------------------------------------------------------------- settings
alter table public.profiles
  add column notify_nudges boolean not null default true,
  add column notify_friends boolean not null default true,
  add column notify_reactions boolean not null default true;

grant update (notify_nudges, notify_friends, notify_reactions) on public.profiles to authenticated;

-- --------------------------------------------------------- subscriptions
-- One row per browser / phone that turned notifications on.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique
    check (endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/'
      and length(endpoint) <= 1000),
  p256dh text not null check (p256dh ~ '^[A-Za-z0-9_-]{87}$'),
  auth text not null check (auth ~ '^[A-Za-z0-9_-]{22}$'),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own" on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "push_subscriptions_delete_own" on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;

-- Saves this browser for the caller. A browser that was signed in to another
-- account moves over: knowing its endpoint (a long random URL) proves it is yours.
create function private.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id <> auth.uid();
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
    values (auth.uid(), p_endpoint, p_p256dh, p_auth)
    on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth;
  -- A handful of devices is plenty; drop the oldest beyond ten.
  delete from public.push_subscriptions where id in (
    select id from public.push_subscriptions where user_id = auth.uid() order by created_at desc offset 10
  );
end $$;

create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text) returns void
language sql security invoker set search_path = '' as $$
  select private.save_push_subscription(p_endpoint, p_p256dh, p_auth)
$$;

revoke all on function private.save_push_subscription(text, text, text), public.save_push_subscription(text, text, text) from public, anon;
grant execute on function private.save_push_subscription(text, text, text), public.save_push_subscription(text, text, text) to authenticated;

-- ---------------------------------------------------------------- config
-- For the Edge Function only (service role): keys and the shared secret from Vault.
create function public.push_config()
returns table (vapid_public_key text, vapid_private_key text, vapid_subject text, webhook_secret text)
language sql stable security definer set search_path = '' as $$
  select
    (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public_key'),
    (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_private_key'),
    (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_subject'),
    (select decrypted_secret from vault.decrypted_secrets where name = 'push_webhook_secret')
$$;
revoke all on function public.push_config() from public, anon, authenticated;
grant execute on function public.push_config() to service_role;

-- --------------------------------------------------------------- sending
-- Recently sent keys, so toggling a reaction on and off does not buzz a phone each time.
create table private.push_log (
  key text primary key,
  sent_at timestamptz not null default now()
);
revoke all on private.push_log from public, anon, authenticated;

create function private.queue_push(p_body jsonb, p_dedupe text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  fn_url text;
  secret text;
begin
  if p_dedupe is not null then
    delete from private.push_log where sent_at < now() - interval '1 day';
    insert into private.push_log (key) values (p_dedupe)
      on conflict (key) do update set sent_at = now()
      where private.push_log.sent_at < now() - interval '10 minutes';
    if not found then return; end if;
  end if;
  select decrypted_secret into fn_url from vault.decrypted_secrets where name = 'push_function_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if fn_url is null or secret is null then return; end if; -- not set up: no notifications
  perform net.http_post(
    url := fn_url,
    body := p_body,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret),
    timeout_milliseconds := 5000
  );
end $$;

create function private.push_on_nudge() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.queue_push(jsonb_build_object('kind', 'nudge', 'id', new.id));
  return null;
end $$;

create function private.push_on_friendship() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform private.queue_push(jsonb_build_object('kind', 'friend_request', 'id', new.id));
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    perform private.queue_push(jsonb_build_object('kind', 'friend_accepted', 'id', new.id));
  end if;
  return null;
end $$;

create function private.push_on_reaction() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.queue_push(
    jsonb_build_object('kind', 'reaction', 'post_id', new.post_id, 'user_id', new.user_id),
    'reaction:' || new.post_id || ':' || new.user_id
  );
  return null;
end $$;

revoke all on function private.queue_push(jsonb, text), private.push_on_nudge(), private.push_on_friendship(),
  private.push_on_reaction() from public, anon, authenticated;

create trigger nudges_push after insert on public.nudges
  for each row execute function private.push_on_nudge();
create trigger friendships_push after insert or update of status on public.friendships
  for each row execute function private.push_on_friendship();
create trigger post_reactions_push after insert on public.post_reactions
  for each row execute function private.push_on_reaction();

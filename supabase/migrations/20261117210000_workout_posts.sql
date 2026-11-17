-- Feed: after a workout the user may post it (with an optional photo) for their
-- friends. Nothing is posted without the user's tap. A post is a snapshot with no
-- weights: day name, duration, sets, exercises and the names of PR exercises.
-- Friends see posts from the last 30 days; the owner's app deletes older ones
-- (and their photos). Photos live in the private `workout-photos` bucket and are
-- served through signed URLs only to the owner and their friends.

create table public.workout_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  workout_id uuid not null unique references public.workouts (id) on delete cascade,
  day_name text not null check (char_length(day_name) between 1 and 60),
  duration_seconds int not null check (duration_seconds between 0 and 86400),
  sets int not null check (sets between 0 and 1000),
  exercises int not null check (exercises between 0 and 100),
  pr_names text[] not null default '{}'
    check (cardinality(pr_names) <= 20 and array_position(pr_names, null) is null),
  photo_path text check (photo_path is null or photo_path like user_id::text || '/%'),
  created_at timestamptz not null default now()
);
create index workout_posts_user_created on public.workout_posts (user_id, created_at desc);
create index workout_posts_photo on public.workout_posts (photo_path) where photo_path is not null;

alter table public.workout_posts enable row level security;

-- Own posts always; friends' posts for 30 days.
create policy "workout_posts_select" on public.workout_posts for select to authenticated
  using (
    user_id = (select auth.uid())
    or (created_at > now() - interval '30 days' and private.are_friends(user_id, (select auth.uid())))
  );
-- Only your own workout, and only one that just finished.
create policy "workout_posts_insert_own" on public.workout_posts for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.user_id = (select auth.uid()) and w.finished_at > now() - interval '2 days'
    )
  );
create policy "workout_posts_delete_own" on public.workout_posts for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.workout_posts from anon, authenticated;
grant select, delete on public.workout_posts to authenticated;
grant insert (workout_id, day_name, duration_seconds, sets, exercises, pr_names, photo_path)
  on public.workout_posts to authenticated;

-- ------------------------------------------------------------- reactions
create table public.post_reactions (
  post_id uuid not null references public.workout_posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('fire', 'bump', 'crown')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_reactions_user on public.post_reactions (user_id);

alter table public.post_reactions enable row level security;

-- Visible to whoever can see the post (the subquery runs under the posts policy).
create policy "post_reactions_select" on public.post_reactions for select to authenticated
  using (exists (select 1 from public.workout_posts p where p.id = post_id));
-- React to a friend's visible post, never your own.
create policy "post_reactions_insert" on public.post_reactions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.workout_posts p where p.id = post_id and p.user_id <> (select auth.uid()))
  );
create policy "post_reactions_update_own" on public.post_reactions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "post_reactions_delete_own" on public.post_reactions for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.post_reactions from anon, authenticated;
grant select, delete on public.post_reactions to authenticated;
grant insert (post_id, kind) on public.post_reactions to authenticated;
grant update (kind) on public.post_reactions to authenticated;

-- ---------------------------------------------------------------- photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('workout-photos', 'workout-photos', false, 614400, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

-- Read: your own folder, or a photo on a post you can see (posts policy applies).
create policy "workout_photos_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'workout-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (select 1 from public.workout_posts p where p.photo_path = name)
    )
  );
create policy "workout_photos_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'workout-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "workout_photos_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'workout-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

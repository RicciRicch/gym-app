-- New tables in `public` get full privileges for anon and authenticated by
-- default, so the narrow grants in the friends migration only added to them.
-- Start from nothing and grant exactly what the app uses; RLS still applies.

revoke all on public.friendships, public.nudges, public.friend_stats from anon, authenticated;

-- Rows are created and accepted only through the functions.
grant select, delete on public.friendships to authenticated;

-- A nudge: the sender picks who and which day; the receiver can only mark it seen.
grant select on public.nudges to authenticated;
grant insert (to_id, day) on public.nudges to authenticated;
grant update (seen_at) on public.nudges to authenticated;

grant select, insert, update on public.friend_stats to authenticated;

-- Signed-out visitors have no business with profiles either.
revoke all on public.profiles from anon;

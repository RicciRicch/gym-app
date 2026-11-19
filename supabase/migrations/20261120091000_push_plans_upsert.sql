-- The app saves its plan with an upsert, which also sets user_id on conflict.
-- RLS (with check user_id = auth.uid()) still keeps it on the caller's own row.
grant update (user_id) on public.push_plans to authenticated;

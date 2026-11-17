-- Body weight and the strength standards table (men / women) for strength levels.
-- Both optional; only the owner can set them (column grants, like the rest of profiles).
-- Friends never see them: friend reads go through private functions that don't return them.

alter table public.profiles
  add column bodyweight_kg numeric(5, 1) check (bodyweight_kg between 25 and 350),
  add column strength_sex text check (strength_sex in ('male', 'female'));

grant update (bodyweight_kg, strength_sex) on public.profiles to authenticated;

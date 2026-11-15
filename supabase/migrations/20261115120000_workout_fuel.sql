-- What the user had before a workout (coffee, energy drink, carbs, pre-workout
-- powder). null = not answered, an empty array = nothing. RLS on workouts
-- already limits reads and updates to the owner.
alter table public.workouts
  add column fuel text[]
  constraint workouts_fuel_check check (fuel <@ array['coffee', 'energy', 'carbs', 'preworkout']::text[]);

-- pg_net was created in `public` (security advisor: extension_in_public). It cannot
-- be moved, so recreate it in `extensions`; its functions stay in the `net` schema,
-- which the push triggers call.
drop extension if exists pg_net;
create extension pg_net with schema extensions;

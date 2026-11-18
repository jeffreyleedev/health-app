-- Give the server (and only the server) access to the app tables.
--
-- Postgres checks access in two layers:
--   1. Table privileges (GRANT) — may this role use the table at all?
--   2. Row Level Security       — which rows may it see or change?
--
-- This project grants no table privileges to Supabase's API roles by
-- default, so even the server's secret key (role: service_role) was denied.
--
-- service_role bypasses RLS, so it needs only these privileges. The
-- browser's roles (anon, authenticated) are intentionally granted nothing:
-- they are stopped at layer 1, and RLS with no policies (0001) stops them
-- again at layer 2.
--
-- Because service_role bypasses RLS, the Next.js API routes' ownership
-- check is what keeps each user's data separate.

grant select, insert, update, delete on table
  public.profiles,
  public.weigh_ins,
  public.calorie_entries
to service_role;

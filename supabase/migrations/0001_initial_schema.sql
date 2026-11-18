-- Initial schema: one profile per user, plus many weigh-ins and calorie entries.
--
-- All measurements are metric (kg, cm). Dates are plain calendar dates with
-- no time zone. Every row is tied to a Supabase Auth user, and deleting that
-- user deletes their rows too (on delete cascade).
--
-- Allowed values for sex, activity_level, and unit_system must stay in sync
-- with src/lib/formulas.ts and src/lib/units.ts (checked by schema.test.ts).

-- One row per user. The user's id is the key, so a second profile row for the
-- same user is impossible.
create table public.profiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  birthdate      date not null,
  sex            text not null check (sex in ('male', 'female')),
  height_cm      numeric(5, 2) not null check (height_cm > 0),
  activity_level text not null check (activity_level in (
                   'sedentary',
                   'lightlyActive',
                   'moderatelyActive',
                   'veryActive',
                   'extraActive'
                 )),
  unit_system    text not null check (unit_system in ('metric', 'imperial'))
);

-- Many rows per user. A day can have several weigh-ins.
create table public.weigh_ins (
  id        bigint generated always as identity primary key,
  owner_id  uuid not null references auth.users (id) on delete cascade,
  date      date not null,
  weight_kg numeric(6, 2) not null check (weight_kg > 0)
);

-- Many rows per user. A day can have several entries; they are summed per day.
create table public.calorie_entries (
  id       bigint generated always as identity primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  date     date not null,
  calories integer not null check (calories >= 0)
);

-- "This user's entries in date order" is the most common query.
create index weigh_ins_owner_date_idx       on public.weigh_ins (owner_id, date);
create index calorie_entries_owner_date_idx on public.calorie_entries (owner_id, date);

-- Close Supabase's direct Data API path to these tables.
--
-- Supabase publishes tables in the public schema through its Data API, and
-- the public (anon/publishable) key used by the browser can reach it. With
-- RLS enabled and NO policies, every row is denied to that key.
--
-- Only the Next.js API routes, using the server-only secret key (which
-- bypasses RLS), can read or write these tables. Because of that bypass, the
-- API routes' ownership check is what keeps each user's data separate.
-- Do not add policies here without revisiting that design.
alter table public.profiles        enable row level security;
alter table public.weigh_ins       enable row level security;
alter table public.calorie_entries enable row level security;

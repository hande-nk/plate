-- 0004: what the Welcome screens and the Morning weigh-in need.
-- Safe to run more than once: every change is "if not exists".

-- Profile: one row per user. Your profiles table already uses a bigint id,
-- so the link to the logged-in user is the user_id column (same as meals).
alter table profiles
  add column if not exists user_id        uuid default auth.uid() references auth.users (id) on delete cascade,
  add column if not exists height_cm      numeric(5,1) check (height_cm between 100 and 250),
  add column if not exists age_years      int          check (age_years between 13 and 100),
  add column if not exists sex            text not null default 'female' check (sex in ('female', 'male')),
  add column if not exists activity       text check (activity in ('light', 'moderate', 'active')),
  add column if not exists pace           text check (pace in ('gentle', 'steady', 'track')),
  add column if not exists avoids         text[] not null default '{}',
  add column if not exists allergy_note   text,
  add column if not exists motivations    text[] not null default '{}',
  add column if not exists lunch_nudge    boolean not null default true,
  add column if not exists weigh_reminder boolean not null default true,
  add column if not exists sunday_edition boolean not null default true,
  add column if not exists friends        boolean not null default false,
  add column if not exists hide_numbers   boolean not null default false,  -- "a doctor suggested avoiding counting"
  add column if not exists hide_weight    boolean not null default false,  -- weigh-in: show only the trend
  add column if not exists onboarded_at   timestamptz;

-- One profile per user, which also lets the app "upsert" on user_id.
create unique index if not exists profiles_user_id_key on profiles (user_id);

alter table profiles enable row level security;
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Weigh-ins: one row per reading.
create table if not exists weigh_ins (
  id bigint generated always as identity primary key
);

alter table weigh_ins
  add column if not exists user_id    uuid default auth.uid() references auth.users (id) on delete cascade,
  add column if not exists weighed_at timestamptz not null default now(),
  add column if not exists kg         numeric(5,2) check (kg between 30 and 250);

alter table weigh_ins enable row level security;
drop policy if exists "own weigh-ins" on weigh_ins;
create policy "own weigh-ins" on weigh_ins
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
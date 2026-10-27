create table cravings (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  at timestamptz not null default now(),
  kind text not null check (kind in ('hungry', 'dessert')),
  path text not null check (path in ('eat', 'wait', 'planned')),
  outcome text check (outcome in ('ate', 'waited', 'ate_after_wait', 'planned_later')),
  context text[] not null default '{}',
  minutes_since_plate int,
  wait_activity text check (wait_activity in ('tea', 'walk', 'text', 'puzzle')),
  wait_seconds int check (wait_seconds between 0 and 1800)
);
alter table cravings enable row level security;
create policy "own cravings" on cravings for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table planned_treats (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  name text not null,
  dish_id bigint references dishes,
  eaten_at timestamptz,
  unique (user_id, day)
);
alter table planned_treats enable row level security;
create policy "own treats" on planned_treats for all using (user_id = auth.uid()) with check (user_id = auth.uid());
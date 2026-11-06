-- 0016: the treat board (T32) and weekly proposals (T34).
-- Treats are yours only (RLS). Deleting your account removes them (cascade from auth.users).

create table if not exists public.treats (
  id          bigserial primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  place       text,
  link        text,                                   -- a website or an Instagram post you saved
  source      text not null default 'you' check (source in ('starter', 'you', 'instagram')),
  outing      boolean not null default false,         -- with a friend, out somewhere: Fri to Sun only
  photo_key   text,                                   -- your own photo, stays on the phone
  created_at  timestamptz not null default now()
);
alter table public.treats enable row level security;
create policy "own treats" on public.treats for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.treat_proposals (
  id          bigserial primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_of     date not null,                          -- Monday of the planned week
  treat_id    bigint not null references public.treats(id) on delete cascade,
  day         date not null,
  status      text not null default 'proposed' check (status in ('proposed', 'kept', 'swapped', 'skipped')),
  created_at  timestamptz not null default now()
);
alter table public.treat_proposals enable row level security;
create policy "own proposals" on public.treat_proposals for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Starter board: six real places near Tufts (checked Nov 6, 2026; places change, so check before you go).
-- Runs once per user, the first time the board opens. security invoker: it inserts only your own rows.
create or replace function public.seed_starter_treats() returns void language sql security invoker as $$
  insert into public.treats (name, place, source, outing)
  select * from (values
    ('Matcha cake or green tea mochi', 'Sugidama, Davis Square', 'starter', false),
    ('A sweet crêpe', 'Mr. Crêpe, 51 Davis Square', 'starter', false),
    ('Homemade gelato', 'Dragon Pizza, 233 Elm St, Davis Square', 'starter', false),
    ('Nutella-filled donut', 'Davis Square Donuts & Bagels, 377 Summer St', 'starter', false),
    ('Baklava with a friend', 'Sofra Bakery & Cafe, Cambridge', 'starter', true),
    ('Rice Krispies Treat', 'Hodgdon, with your order', 'starter', false)
  ) as s(name, place, source, outing)
  where not exists (select 1 from public.treats where user_id = auth.uid() and source = 'starter');
$$;

select 'ok' as treat_board;
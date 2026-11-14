-- Eat for how you feel: up to two goals per profile, and the new feeling chips.
-- Safe to run twice.

alter table public.profiles add column if not exists goals text[] not null default '{}';

alter table public.profiles drop constraint if exists profiles_goals_check;
alter table public.profiles add constraint profiles_goals_check
  check (cardinality(goals) <= 2 and goals <@ array['energy','recovery','focus','comfort']::text[]);

-- meals.feeling: drop whatever check guards it (name unknown), then allow the new set.
do $$
declare c record;
begin
  for c in
    select con.conname from pg_constraint con
    join pg_class t on t.oid = con.conrelid
    where t.relname = 'meals' and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%feeling%'
  loop
    execute format('alter table public.meals drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.meals add constraint meals_feeling_check
  check (feeling is null or feeling in ('energized','focused','satisfied','cozy','better','heavy','hungry'));
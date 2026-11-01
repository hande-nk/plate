-- 0010: snacks from a label (T18) and orders (T27).
-- Widens meals_route_check by ADDING 'label' and 'app-order' to whatever it allows today.
-- It reads the current list first, so no existing route value is dropped.

do $$
declare
  vals text[];
begin
  select array_agg(distinct m[1]) into vals
  from pg_constraint c,
       regexp_matches(pg_get_constraintdef(c.oid), '''([^'']+)''', 'g') as m
  where c.conrelid = 'public.meals'::regclass and c.conname = 'meals_route_check';

  if vals is null then
    raise exception 'meals_route_check not found; stop and send Claude the constraint list';
  end if;

  if not 'label' = any(vals) then vals := array_append(vals, 'label'); end if;
  if not 'app-order' = any(vals) then vals := array_append(vals, 'app-order'); end if;

  alter table public.meals drop constraint meals_route_check;
  execute format('alter table public.meals add constraint meals_route_check check (route = any (%L::text[]))', vals);
end $$;

-- Where an order came from (DoorDash, Hodgdon mobile order). Used in T27; null for everything else.
alter table public.meals add column if not exists place text;

-- Check: should list every old value plus label and app-order.
select pg_get_constraintdef(oid) from pg_constraint where conname = 'meals_route_check';
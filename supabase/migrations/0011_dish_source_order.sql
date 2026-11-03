-- 0011: parts entered from a mobile-order screenshot are saved to your library with source 'order'.
-- If dishes.source has a check, add 'order' to it (keeping every value it allows today). If not, nothing to do.

do $$
declare
  cname text;
  vals text[];
begin
  select c.conname into cname
  from pg_constraint c
  where c.conrelid = 'public.dishes'::regclass and c.contype = 'c' and pg_get_constraintdef(c.oid) ilike '%source%';

  if cname is null then
    raise notice 'dishes.source has no check: nothing to change';
    return;
  end if;

  select array_agg(distinct m[1]) into vals
  from pg_constraint c, regexp_matches(pg_get_constraintdef(c.oid), '''([^'']+)''', 'g') as m
  where c.conrelid = 'public.dishes'::regclass and c.conname = cname;

  if not 'order' = any(vals) then vals := array_append(vals, 'order'); end if;

  execute format('alter table public.dishes drop constraint %I', cname);
  execute format('alter table public.dishes add constraint %I check (source = any (%L::text[]))', cname, vals);
end $$;

select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'public.dishes'::regclass and contype = 'c';
-- T23: allow 'puzzle' as a wait activity. Finds whatever check constraint guards
-- cravings.wait_activity (name unknown) and replaces it. Safe to run twice.
do $$
declare c record;
begin
  for c in
    select con.conname from pg_constraint con
    join pg_class t on t.oid = con.conrelid
    where t.relname = 'cravings' and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%wait_activity%'
  loop
    execute format('alter table public.cravings drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.cravings add constraint cravings_wait_activity_check
  check (wait_activity is null or wait_activity in ('tea', 'walk', 'text', 'puzzle'));
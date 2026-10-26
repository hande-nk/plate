alter table profiles
  add column if not exists tz text not null default 'America/New_York',
  add column if not exists quiet_from smallint not null default 21 check (quiet_from between 18 and 23);

create table push_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('lunch', 'weigh', 'edition')),
  local_day date not null,
  sent_at timestamptz not null default now(),
  unique (user_id, kind, local_day)
);
alter table push_log enable row level security;
create policy "read own push log" on push_log for select using (user_id = auth.uid());

-- Gathers everyone who might be due and posts them to Vercel. Only cron runs it.
create or replace function public.push_tick()
returns void language plpgsql security definer set search_path = '' as $$
declare body jsonb; secret text;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_tick_secret';
  select coalesce(jsonb_agg(c), '[]'::jsonb) into body from (
    select p.user_id as "userId", p.tz, p.quiet_from as "quietFrom",
      p.lunch_nudge as "lunchNudge", p.weigh_reminder as "weighReminder", p.sunday_edition as "sundayEdition",
      coalesce((select jsonb_agg(distinct m.eaten_at) from public.meals m
        where m.user_id = p.user_id and (m.eaten_at at time zone p.tz)::date = (now() at time zone p.tz)::date), '[]') as "platesToday",
      exists (select 1 from public.weigh_ins w
        where w.user_id = p.user_id and w.day = (now() at time zone p.tz)::date) as "weighedToday",
      coalesce((select jsonb_agg(l.kind) from public.push_log l
        where l.user_id = p.user_id and l.local_day = (now() at time zone p.tz)::date), '[]') as "sentToday",
      (select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
        from public.push_subscriptions s where s.user_id = p.user_id) as subs
    from public.profiles p
    where (p.lunch_nudge or p.weigh_reminder or p.sunday_edition)
      and exists (select 1 from public.push_subscriptions s where s.user_id = p.user_id)
  ) c;
  if jsonb_array_length(body) = 0 then return; end if;
  perform net.http_post(
    url := 'https://plate-tawny-sigma.vercel.app/api/push/tick',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret),
    body := jsonb_build_object('candidates', body)
  );
end; $$;
revoke execute on function public.push_tick() from public, anon, authenticated;

-- Vercel reports what it sent. Checks the secret, writes push_log, drops dead subscriptions.
create or replace function public.record_pushes(p_secret text, p_sent jsonb, p_dead jsonb default '[]')
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_secret is distinct from (select decrypted_secret from vault.decrypted_secrets where name = 'push_tick_secret') then
    raise exception 'not allowed';
  end if;
  insert into public.push_log (user_id, kind, local_day)
    select (x->>'userId')::uuid, x->>'kind', (x->>'localDay')::date from jsonb_array_elements(p_sent) x
    on conflict (user_id, kind, local_day) do nothing;
  delete from public.push_subscriptions where endpoint in (select jsonb_array_elements_text(p_dead));
end; $$;
revoke execute on function public.record_pushes(text, jsonb, jsonb) from public;
grant execute on function public.record_pushes(text, jsonb, jsonb) to anon, authenticated;

select cron.schedule('push-tick', '*/15 * * * *', $$ select public.push_tick(); $$);
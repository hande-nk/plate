create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not logged in'; end if;
  delete from public.push_subscriptions where user_id = uid;
  delete from public.meals where user_id = uid;
  delete from public.weigh_ins where user_id = uid;
  delete from public.dishes where user_id = uid;   -- remove this line if dishes has no user_id
  delete from public.profiles where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
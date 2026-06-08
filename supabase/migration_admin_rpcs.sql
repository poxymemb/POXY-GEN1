-- POXY: admin terminal RPCs (prod: 20260606182423 admin_account_rpcs,
--        20260606183020 fix_admin_rpc_email_check)
-- Synced from live Supabase project rbrtjkfawdnomvvyxwvp — 2026-06-08
-- Requires: migration_account_control.sql (private_is_admin)

create or replace function public.admin_set_balance(p_target_id uuid, p_amount numeric)
returns numeric
language plpgsql
security definer
set search_path to public
as $$
declare
  caller_is_staff boolean;
  new_bal         numeric;
begin
  select (
    coalesce((select is_verified_employee from public.profiles where id = auth.uid()), false)
    or (select email from auth.users where id = auth.uid()) in (
      'syntaxdev0@gmail.com', 'admin@poxygen.com'
    )
  ) into caller_is_staff;

  if not coalesce(caller_is_staff, false) then
    raise exception 'admin_set_balance: unauthorized';
  end if;

  update public.profiles
  set balance = p_amount
  where id = p_target_id
  returning balance into new_bal;

  if new_bal is null then
    raise exception 'admin_set_balance: user not found';
  end if;

  return new_bal;
end;
$$;

create or replace function public.admin_set_frozen(p_target_id uuid, p_frozen boolean)
returns void
language plpgsql
security definer
set search_path to public
as $$
begin
  if not private_is_admin() then
    raise exception 'admin_set_frozen: unauthorized';
  end if;
  update public.profiles set is_frozen = p_frozen where id = p_target_id;
end;
$$;

create or replace function public.admin_set_blocked(p_target_id uuid, p_blocked boolean)
returns void
language plpgsql
security definer
set search_path to public
as $$
begin
  if not private_is_admin() then
    raise exception 'admin_set_blocked: unauthorized';
  end if;
  update public.profiles set is_blocked = p_blocked where id = p_target_id;
end;
$$;

create or replace function public.admin_set_verified(p_target_id uuid, p_verified boolean)
returns void
language plpgsql
security definer
set search_path to public
as $$
begin
  if not private_is_admin() then
    raise exception 'admin_set_verified: unauthorized';
  end if;
  update public.profiles set is_verified_employee = p_verified where id = p_target_id;
end;
$$;

create or replace function public.admin_set_club(p_target_id uuid, p_club boolean)
returns void
language plpgsql
security definer
set search_path to public
as $$
begin
  if not private_is_admin() then
    raise exception 'admin_set_club: unauthorized';
  end if;
  update public.profiles set is_club_member = p_club where id = p_target_id;
end;
$$;

create or replace function public.admin_set_username(p_target_id uuid, p_username text)
returns void
language plpgsql
security definer
set search_path to public
as $$
begin
  if not private_is_admin() then
    raise exception 'admin_set_username: unauthorized';
  end if;
  update public.profiles set username = p_username where id = p_target_id;
end;
$$;

create or replace function public.admin_set_badges(p_target_id uuid, p_badges text[])
returns void
language plpgsql
security definer
set search_path to public
as $$
begin
  if not private_is_admin() then
    raise exception 'admin_set_badges: unauthorized';
  end if;
  update public.profiles set badges = p_badges where id = p_target_id;
end;
$$;

grant execute on function public.admin_set_balance(uuid, numeric) to authenticated;
grant execute on function public.admin_set_frozen(uuid, boolean) to authenticated;
grant execute on function public.admin_set_blocked(uuid, boolean) to authenticated;
grant execute on function public.admin_set_verified(uuid, boolean) to authenticated;
grant execute on function public.admin_set_club(uuid, boolean) to authenticated;
grant execute on function public.admin_set_username(uuid, text) to authenticated;
grant execute on function public.admin_set_badges(uuid, text[]) to authenticated;

-- POXY: admin allowlist table — no hardcoded UUIDs/emails in git (GitGuardian-safe)
-- Seed admin_emails manually in Supabase SQL Editor (not committed to repo).

create table if not exists public.admin_emails (
  email text primary key,
  role text not null default 'admin' check (role in ('admin', 'dev_topup')),
  created_at timestamptz not null default now()
);

alter table public.admin_emails enable row level security;
-- No client policies — only SECURITY DEFINER functions read this table.

create or replace function public.private_is_admin()
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select (
    coalesce(
      (select is_verified_employee from public.profiles where id = auth.uid()),
      false
    )
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and 'founder' = any (coalesce(badges, array[]::text[]))
    )
    or exists (
      select 1
      from public.admin_emails ae
      inner join auth.users u on lower(u.email) = lower(ae.email)
      where u.id = auth.uid() and ae.role = 'admin'
    )
  );
$$;

create or replace function public.private_can_dev_topup()
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select (
    coalesce(
      (select is_verified_employee from public.profiles where id = auth.uid()),
      false
    )
    or exists (
      select 1
      from public.admin_emails ae
      inner join auth.users u on lower(u.email) = lower(ae.email)
      where u.id = auth.uid() and ae.role in ('admin', 'dev_topup')
    )
  );
$$;

create or replace function public.dev_topup(p_amount numeric default 100)
returns jsonb
language plpgsql
security definer
set search_path to public
as $$
declare
  v_uid         uuid := auth.uid();
  v_new_balance numeric;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  if not public.private_can_dev_topup() then
    return jsonb_build_object('ok', false, 'error', 'Restricted to founder/dev accounts');
  end if;

  p_amount := least(p_amount, 50000);

  update public.profiles
  set balance = balance + p_amount
  where id = v_uid
  returning balance into v_new_balance;

  return jsonb_build_object('ok', true, 'added', p_amount, 'new_balance', v_new_balance);
end;
$$;

create or replace function public.admin_set_balance(p_target_id uuid, p_amount numeric)
returns numeric
language plpgsql
security definer
set search_path to public
as $$
declare
  new_bal numeric;
begin
  if not public.private_is_admin() then
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

grant execute on function public.private_is_admin() to authenticated;
grant execute on function public.private_can_dev_topup() to authenticated;

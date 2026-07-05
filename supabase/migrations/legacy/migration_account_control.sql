-- POXY: account control columns + admin gate (prod: 20260606181825 account_control_columns,
--        20260606183843 fix_private_is_admin_check)
-- Synced from live Supabase project rbrtjkfawdnomvvyxwvp — 2026-06-08

alter table public.profiles
  add column if not exists account_hash text,
  add column if not exists badges text[] not null default '{}'::text[],
  add column if not exists is_frozen boolean not null default false,
  add column if not exists is_blocked boolean not null default false,
  add column if not exists is_verified_employee boolean not null default false;

-- Passport UID / air-gap may already exist from migration_club_v2.sql
alter table public.profiles
  add column if not exists club_passport_uid text,
  add column if not exists club_airgap_until timestamptz;

-- -----------------------------------------------------------------------------
-- Auto-assign account hash on profile insert
-- -----------------------------------------------------------------------------
create or replace function public.assign_account_hash()
returns trigger
language plpgsql
as $$
begin
  if new.account_hash is null then
    new.account_hash := upper(substring(md5(new.id::text || 'poxy_v1_salt'), 1, 8));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_account_hash on public.profiles;
create trigger trg_assign_account_hash
  before insert on public.profiles
  for each row execute function public.assign_account_hash();

-- Admin gate: see migration_admin_emails_table.sql (no hardcoded IDs in git)

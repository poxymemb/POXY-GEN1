-- =============================================================================
-- POXY GENS — Supabase schema + RLS + RPC
-- Run in: Supabase Dashboard → SQL Editor (or supabase db push)
-- Balance = Poxy Coins (PC), 1:1 with bank deposit amount in app code.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- PROFILES (username must be UNIQUE for new friend search + validation)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  avatar_url text default '🎭',
  balance numeric(12, 2) not null default 0 check (balance >= 0),
  dust integer not null default 0 check (dust >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username is null
    or (
      char_length(username) between 3 and 24
      and username ~ '^[a-zA-Z0-9_]+$'
    )
  )
);

-- Migration: add UNIQUE username if table already existed
alter table public.profiles drop constraint if exists profiles_username_key;
alter table public.profiles
  add constraint profiles_username_key unique (username);

create index if not exists profiles_username_idx on public.profiles (username)
  where username is not null;

-- -----------------------------------------------------------------------------
-- USER POXY (collection)
-- -----------------------------------------------------------------------------
create table if not exists public.user_poxy (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  poxy_tier text not null check (
    poxy_tier in ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic')
  ),
  serial_number text not null,
  dropped_at timestamptz not null default now(),
  constraint user_poxy_serial_unique unique (serial_number)
);

create index if not exists user_poxy_user_id_idx on public.user_poxy (user_id);
create index if not exists user_poxy_dropped_at_idx on public.user_poxy (dropped_at desc);
create index if not exists user_poxy_user_tier_idx on public.user_poxy (user_id, poxy_tier);

-- -----------------------------------------------------------------------------
-- MARKETPLACE (seller_id = listing owner in app code)
-- -----------------------------------------------------------------------------
create table if not exists public.marketplace (
  id uuid primary key default gen_random_uuid(),
  poxy_id uuid not null references public.user_poxy (id) on delete restrict,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  price numeric(12, 2) not null check (price > 0),
  status text not null default 'active' check (
    status in ('active', 'sold', 'cancelled')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_status_idx on public.marketplace (status);
create index if not exists marketplace_seller_idx on public.marketplace (seller_id);
create index if not exists marketplace_active_price_idx on public.marketplace (status, price)
  where status = 'active';

-- -----------------------------------------------------------------------------
-- FRIENDS
-- -----------------------------------------------------------------------------
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'rejected')
  ),
  created_at timestamptz not null default now(),
  constraint friend_requests_no_self check (from_id <> to_id),
  constraint friend_requests_pair_unique unique (from_id, to_id)
);

create index if not exists friend_requests_to_idx on public.friend_requests (to_id, status);
create index if not exists friend_requests_from_idx on public.friend_requests (from_id, status);

-- -----------------------------------------------------------------------------
-- POXY CLUB FEED
-- -----------------------------------------------------------------------------
create table if not exists public.club_feed (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_username text,
  author_avatar text,
  content text not null check (char_length(content) between 1 and 140),
  created_at timestamptz not null default now()
);

create index if not exists club_feed_created_idx on public.club_feed (created_at desc);

-- -----------------------------------------------------------------------------
-- updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists marketplace_updated_at on public.marketplace;
create trigger marketplace_updated_at
  before update on public.marketplace
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Auto-create profile on signup
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, avatar_url, balance, dust)
  values (new.id, '🎭', 0, 0)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- RPC: topup_balance (bank — 1 deposited unit = 1 PC)
-- -----------------------------------------------------------------------------
create or replace function public.topup_balance(
  p_user_id uuid,
  p_amount numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance numeric;
begin
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Invalid amount');
  end if;

  if auth.uid() is distinct from p_user_id then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  update public.profiles
  set balance = balance + p_amount
  where id = p_user_id
  returning balance into v_new_balance;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Profile not found');
  end if;

  return jsonb_build_object('ok', true, 'new_balance', v_new_balance);
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: dust_poxy (burn one item)
-- -----------------------------------------------------------------------------
create or replace function public.dust_poxy(
  p_poxy_id uuid,
  p_user_id uuid,
  p_dust_gain integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_listed boolean;
begin
  if auth.uid() is distinct from p_user_id then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  select user_id into v_owner
  from public.user_poxy
  where id = p_poxy_id
  for update;

  if v_owner is null then
    return jsonb_build_object('ok', false, 'error', 'POXY not found');
  end if;

  if v_owner <> p_user_id then
    return jsonb_build_object('ok', false, 'error', 'Not your POXY');
  end if;

  select exists (
    select 1 from public.marketplace
    where poxy_id = p_poxy_id and status = 'active'
  ) into v_listed;

  if v_listed then
    return jsonb_build_object('ok', false, 'error', 'Cannot dust a listed POXY');
  end if;

  delete from public.user_poxy where id = p_poxy_id;

  update public.profiles
  set dust = dust + coalesce(p_dust_gain, 10)
  where id = p_user_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: dust_poxy_bulk
-- -----------------------------------------------------------------------------
create or replace function public.dust_poxy_bulk(
  p_poxy_ids uuid[],
  p_user_id uuid,
  p_dust_each integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
  v_gain integer;
begin
  if auth.uid() is distinct from p_user_id then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  if p_poxy_ids is null or array_length(p_poxy_ids, 1) is null then
    return jsonb_build_object('ok', false, 'error', 'No items selected');
  end if;

  delete from public.user_poxy up
  where up.id = any (p_poxy_ids)
    and up.user_id = p_user_id
    and not exists (
      select 1 from public.marketplace m
      where m.poxy_id = up.id and m.status = 'active'
    );

  get diagnostics v_deleted = row_count;
  v_gain := v_deleted * coalesce(p_dust_each, 10);

  if v_deleted = 0 then
    return jsonb_build_object('ok', false, 'error', 'Nothing to dust');
  end if;

  update public.profiles
  set dust = dust + v_gain
  where id = p_user_id;

  return jsonb_build_object(
    'ok', true,
    'deleted', v_deleted,
    'dust_gained', v_gain
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC: purchase_poxy (atomic buy + balance transfer)
-- -----------------------------------------------------------------------------
create or replace function public.purchase_poxy(
  p_listing_id uuid,
  p_buyer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing public.marketplace%rowtype;
  v_price numeric;
  v_buyer_balance numeric;
  v_poxy public.user_poxy%rowtype;
begin
  if auth.uid() is distinct from p_buyer_id then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  select * into v_listing
  from public.marketplace
  where id = p_listing_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Listing not found');
  end if;

  if v_listing.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'Listing not available');
  end if;

  if v_listing.seller_id = p_buyer_id then
    return jsonb_build_object('ok', false, 'error', 'Cannot buy your own listing');
  end if;

  v_price := v_listing.price;

  select balance into v_buyer_balance
  from public.profiles
  where id = p_buyer_id
  for update;

  if v_buyer_balance < v_price then
    return jsonb_build_object('ok', false, 'error', 'Insufficient Poxy Coins');
  end if;

  select * into v_poxy
  from public.user_poxy
  where id = v_listing.poxy_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'POXY missing');
  end if;

  update public.profiles
  set balance = balance - v_price
  where id = p_buyer_id;

  update public.profiles
  set balance = balance + v_price
  where id = v_listing.seller_id;

  update public.user_poxy
  set user_id = p_buyer_id
  where id = v_listing.poxy_id;

  update public.marketplace
  set status = 'sold', updated_at = now()
  where id = p_listing_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- Optional: hide serial numbers from marketplace buyers (server-side security)
-- App masks in UI; this view enforces masking for non-sellers via RLS-friendly reads.
-- -----------------------------------------------------------------------------
create or replace function public.marketplace_serial_for_viewer(
  p_serial text,
  p_seller_id uuid
)
returns text
language sql
stable
as $$
  select case
    when auth.uid() = p_seller_id then p_serial
    else 'XXXX-XXXX'
  end;
$$;

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_poxy enable row level security;
alter table public.marketplace enable row level security;
alter table public.friend_requests enable row level security;
alter table public.club_feed enable row level security;

-- profiles
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated on public.profiles
  for select to authenticated
  using (true);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- user_poxy
drop policy if exists user_poxy_select_own on public.user_poxy;
create policy user_poxy_select_own on public.user_poxy
  for select to authenticated
  using (user_id = auth.uid());

-- Live drops ticker: read tier + time + user_id (not full serial) for recent drops
drop policy if exists user_poxy_select_recent_public on public.user_poxy;
create policy user_poxy_select_recent_public on public.user_poxy
  for select to authenticated
  using (dropped_at > now() - interval '7 days');

-- Friend premium frame check: read tiers for friend user ids
drop policy if exists user_poxy_select_for_friend_tiers on public.user_poxy;
create policy user_poxy_select_for_friend_tiers on public.user_poxy
  for select to authenticated
  using (poxy_tier in ('legendary', 'mythic'));

-- Marketplace embed: buyers must read tier (app masks serial in UI)
drop policy if exists user_poxy_select_active_listing on public.user_poxy;
create policy user_poxy_select_active_listing on public.user_poxy
  for select to authenticated
  using (
    exists (
      select 1 from public.marketplace m
      where m.poxy_id = id and m.status = 'active'
    )
  );

drop policy if exists user_poxy_insert_own on public.user_poxy;
create policy user_poxy_insert_own on public.user_poxy
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists user_poxy_delete_own on public.user_poxy;
create policy user_poxy_delete_own on public.user_poxy
  for delete to authenticated
  using (user_id = auth.uid());

-- marketplace
drop policy if exists marketplace_select_active on public.marketplace;
create policy marketplace_select_active on public.marketplace
  for select to authenticated
  using (status in ('active', 'sold', 'cancelled'));

drop policy if exists marketplace_insert_own on public.marketplace;
create policy marketplace_insert_own on public.marketplace
  for insert to authenticated
  with check (
    seller_id = auth.uid()
    and exists (
      select 1 from public.user_poxy up
      where up.id = poxy_id and up.user_id = auth.uid()
    )
  );

drop policy if exists marketplace_update_own on public.marketplace;
create policy marketplace_update_own on public.marketplace
  for update to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

-- friend_requests
drop policy if exists friend_requests_select_participant on public.friend_requests;
create policy friend_requests_select_participant on public.friend_requests
  for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());

drop policy if exists friend_requests_insert_from on public.friend_requests;
create policy friend_requests_insert_from on public.friend_requests
  for insert to authenticated
  with check (from_id = auth.uid());

drop policy if exists friend_requests_update_participant on public.friend_requests;
create policy friend_requests_update_participant on public.friend_requests
  for update to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());

-- club_feed
drop policy if exists club_feed_select_authenticated on public.club_feed;
create policy club_feed_select_authenticated on public.club_feed
  for select to authenticated
  using (true);

drop policy if exists club_feed_insert_own on public.club_feed;
create policy club_feed_insert_own on public.club_feed
  for insert to authenticated
  with check (author_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Grant RPC execute to authenticated users
-- -----------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.topup_balance(uuid, numeric) to authenticated;
grant execute on function public.dust_poxy(uuid, uuid, integer) to authenticated;
grant execute on function public.dust_poxy_bulk(uuid[], uuid, integer) to authenticated;
grant execute on function public.purchase_poxy(uuid, uuid) to authenticated;
grant execute on function public.marketplace_serial_for_viewer(text, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Storage: avatars bucket (Profile photo upload)
-- Create bucket "avatars" as PUBLIC in Dashboard if this insert fails.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
  for select to public
  using (bucket_id = 'avatars');

drop policy if exists avatars_upload_own on storage.objects;
create policy avatars_upload_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and name like 'avatars/' || auth.uid()::text || '.%'
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and name like 'avatars/' || auth.uid()::text || '.%'
  );

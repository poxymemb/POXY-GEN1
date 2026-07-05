-- =============================================================================
-- INCREMENTAL MIGRATION — existing POXY database → new index.html features
-- Run in Supabase SQL Editor (one script, top to bottom).
-- =============================================================================

-- ── 1. Username UNIQUE + format (friend search by exact username) ──
alter table public.profiles
  add column if not exists username text;

-- If you have duplicate usernames, clear or rename them BEFORE adding UNIQUE:
-- update public.profiles set username = null where username in (
--   select username from public.profiles group by username having count(*) > 1
-- );

alter table public.profiles drop constraint if exists profiles_username_key;
alter table public.profiles
  add constraint profiles_username_key unique (username);

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format check (
    username is null
    or (
      char_length(username) between 3 and 24
      and username ~ '^[a-zA-Z0-9_]+$'
    )
  );

create index if not exists profiles_username_idx on public.profiles (username)
  where username is not null;

-- ── 2. Performance indexes (live drops ticker, premium frames) ──
create index if not exists user_poxy_dropped_at_idx on public.user_poxy (dropped_at desc);
create index if not exists user_poxy_user_tier_idx on public.user_poxy (user_id, poxy_tier);
create index if not exists marketplace_active_price_idx on public.marketplace (status, price)
  where status = 'active';

-- ── 3. New / updated RLS policies ──
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated on public.profiles
  for select to authenticated using (true);

drop policy if exists user_poxy_select_recent_public on public.user_poxy;
create policy user_poxy_select_recent_public on public.user_poxy
  for select to authenticated
  using (dropped_at > now() - interval '7 days');

drop policy if exists user_poxy_select_for_friend_tiers on public.user_poxy;
create policy user_poxy_select_for_friend_tiers on public.user_poxy
  for select to authenticated
  using (poxy_tier in ('legendary', 'mythic'));

drop policy if exists user_poxy_select_active_listing on public.user_poxy;
create policy user_poxy_select_active_listing on public.user_poxy
  for select to authenticated
  using (
    exists (
      select 1 from public.marketplace m
      where m.poxy_id = id and m.status = 'active'
    )
  );

-- ── 4. RPC: purchase error text uses Poxy Coins ──
create or replace function public.purchase_poxy(p_listing_id uuid, p_buyer_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_listing public.marketplace%rowtype;
  v_price numeric;
  v_buyer_balance numeric;
begin
  if auth.uid() is distinct from p_buyer_id then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  select * into v_listing from public.marketplace where id = p_listing_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Listing not found'); end if;
  if v_listing.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'Listing not available'); end if;
  if v_listing.seller_id = p_buyer_id then return jsonb_build_object('ok', false, 'error', 'Cannot buy your own listing'); end if;
  v_price := v_listing.price;
  select balance into v_buyer_balance from public.profiles where id = p_buyer_id for update;
  if v_buyer_balance < v_price then
    return jsonb_build_object('ok', false, 'error', 'Insufficient Poxy Coins');
  end if;
  if not exists (select 1 from public.user_poxy where id = v_listing.poxy_id) then
    return jsonb_build_object('ok', false, 'error', 'POXY missing');
  end if;
  update public.profiles set balance = balance - v_price where id = p_buyer_id;
  update public.profiles set balance = balance + v_price where id = v_listing.seller_id;
  update public.user_poxy set user_id = p_buyer_id where id = v_listing.poxy_id;
  update public.marketplace set status = 'sold', updated_at = now() where id = p_listing_id;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.purchase_poxy(uuid, uuid) to authenticated;

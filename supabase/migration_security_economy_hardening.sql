-- POXY: security & economy hardening (prod: 20260606172502 security_economy_hardening)
-- Synced from live Supabase project rbrtjkfawdnomvvyxwvp — 2026-06-08
-- Blocks direct client balance/dust/club flag updates; adds server-side case open v2.

-- -----------------------------------------------------------------------------
-- Economy column guard (PostgREST direct UPDATE blocked for authenticated/anon)
-- -----------------------------------------------------------------------------
create or replace function public.protect_profiles_economy_cols()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.balance is distinct from old.balance then
      raise exception 'Direct balance update blocked. Use authorized RPCs.';
    end if;
    if new.dust is distinct from old.dust then
      raise exception 'Direct dust update blocked. Use authorized RPCs.';
    end if;
    if new.is_club_member is distinct from old.is_club_member then
      raise exception 'Direct is_club_member update blocked.';
    end if;
    if new.is_verified_employee is distinct from old.is_verified_employee then
      raise exception 'Direct is_verified_employee update blocked.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profiles_economy on public.profiles;
create trigger trg_protect_profiles_economy
  before update on public.profiles
  for each row execute function public.protect_profiles_economy_cols();

-- -----------------------------------------------------------------------------
-- Atomic balance spend helper
-- -----------------------------------------------------------------------------
create or replace function public.spend_balance(p_user_id uuid, p_amount numeric)
returns json
language plpgsql
security definer
as $$
declare
  v_balance numeric;
begin
  select balance into v_balance from public.profiles where id = p_user_id for update;
  if v_balance < p_amount then
    return json_build_object('success', false, 'error', 'Insufficient balance');
  end if;
  update public.profiles set balance = balance - p_amount where id = p_user_id;
  return json_build_object('success', true, 'new_balance', v_balance - p_amount);
end;
$$;

-- -----------------------------------------------------------------------------
-- Marketplace buy (legacy alias — app uses purchase_poxy; kept for prod parity)
-- -----------------------------------------------------------------------------
create or replace function public.buy_poxy(p_listing_id bigint, p_buyer_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_listing public.marketplace%rowtype;
  v_buyer_balance numeric;
begin
  select * into v_listing from public.marketplace
  where id = p_listing_id and status = 'active'
  for update;

  if not found then
    return json_build_object('success', false, 'error', 'Listing not found or already sold');
  end if;

  if v_listing.seller_id = p_buyer_id then
    return json_build_object('success', false, 'error', 'Cannot buy your own item');
  end if;

  select balance into v_buyer_balance from public.profiles where id = p_buyer_id;
  if v_buyer_balance < v_listing.price then
    return json_build_object('success', false, 'error', 'Insufficient balance');
  end if;

  update public.profiles set balance = balance - v_listing.price where id = p_buyer_id;
  update public.profiles set balance = balance + v_listing.price where id = v_listing.seller_id;
  update public.user_poxy set user_id = p_buyer_id where id = v_listing.poxy_id;
  update public.marketplace set status = 'sold' where id = p_listing_id;

  return json_build_object('success', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- Standard case open v2 — server RNG + atomic debit (used by index.html btnOpen)
-- -----------------------------------------------------------------------------
create or replace function public.open_standard_case_v2()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_uid      uuid := auth.uid();
  v_balance  numeric;
  v_cost     numeric := 1.0;
  v_rand     float;
  v_tier     text;
  v_serial   text;
  v_poxy_id  uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select balance into v_balance from public.profiles where id = v_uid for update;
  if v_balance is null then
    return jsonb_build_object('ok', false, 'error', 'Profile not found');
  end if;
  if v_balance < v_cost then
    return jsonb_build_object('ok', false, 'error', 'Insufficient balance');
  end if;

  update public.profiles set balance = balance - v_cost where id = v_uid;

  v_rand := random();
  v_tier := case
    when v_rand < 0.500 then 'common'
    when v_rand < 0.800 then 'uncommon'
    when v_rand < 0.940 then 'rare'
    when v_rand < 0.990 then 'epic'
    when v_rand < 0.999 then 'legendary'
    else 'mythic'
  end;

  v_serial := 'PX-' || upper(substring(md5(random()::text), 1, 6));

  insert into public.user_poxy (user_id, poxy_tier, serial_number, case_origin)
  values (v_uid, v_tier, v_serial, 'standard')
  returning id into v_poxy_id;

  return jsonb_build_object(
    'ok', true,
    'tier', v_tier,
    'serial', v_serial,
    'poxy_id', v_poxy_id,
    'balance', (select balance from public.profiles where id = v_uid)
  );
end;
$$;

grant execute on function public.open_standard_case_v2() to authenticated;
grant execute on function public.spend_balance(uuid, numeric) to authenticated;
grant execute on function public.buy_poxy(bigint, uuid) to authenticated;

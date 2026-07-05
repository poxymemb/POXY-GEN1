-- POXY Phase 1: trade accept, flash sale purchase, store customization RPCs
-- Fixes broken P2P trade accept, flash sale race, and blocked client balance updates.

-- -----------------------------------------------------------------------------
-- accept_trade_offer — atomic asset transfer to recipient
-- -----------------------------------------------------------------------------
create or replace function public.accept_trade_offer(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_offer  public.poxy_trade_offers%rowtype;
  v_owned  int;
  v_listed int;
  v_moved  int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select * into v_offer
  from public.poxy_trade_offers
  where id = p_offer_id and status = 'pending'
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Offer not found or already resolved');
  end if;

  if v_offer.to_id is distinct from v_uid then
    return jsonb_build_object('ok', false, 'error', 'Only the recipient can accept');
  end if;

  if v_offer.offered_poxy_ids is null or array_length(v_offer.offered_poxy_ids, 1) is null then
    return jsonb_build_object('ok', false, 'error', 'Offer has no items');
  end if;

  select count(*) into v_owned
  from public.user_poxy
  where user_id = v_offer.from_id and id = any (v_offer.offered_poxy_ids);

  if v_owned <> array_length(v_offer.offered_poxy_ids, 1) then
    return jsonb_build_object('ok', false, 'error', 'Sender no longer owns all offered items');
  end if;

  select count(*) into v_listed
  from public.marketplace m
  where m.seller_id = v_offer.from_id
    and m.status = 'active'
    and m.poxy_id = any (v_offer.offered_poxy_ids);

  if v_listed > 0 then
    return jsonb_build_object('ok', false, 'error', 'Cannot accept — items are listed on marketplace');
  end if;

  update public.user_poxy
  set user_id = v_offer.to_id
  where user_id = v_offer.from_id
    and id = any (v_offer.offered_poxy_ids);

  get diagnostics v_moved = row_count;

  if v_moved <> array_length(v_offer.offered_poxy_ids, 1) then
    raise exception 'Trade transfer incomplete';
  end if;

  update public.poxy_trade_offers
  set status = 'accepted', updated_at = now()
  where id = p_offer_id;

  return jsonb_build_object('ok', true, 'transferred', v_moved);
end;
$$;

-- -----------------------------------------------------------------------------
-- decline_trade_offer — recipient declines pending offer
-- -----------------------------------------------------------------------------
create or replace function public.decline_trade_offer(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  update public.poxy_trade_offers
  set status = 'declined', updated_at = now()
  where id = p_offer_id
    and to_id = v_uid
    and status = 'pending';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Offer not found or already resolved');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- purchase_flash_sale — atomic debit + stock + mint (no double-charge via open_vip_case)
-- -----------------------------------------------------------------------------
create or replace function public.purchase_flash_sale(p_sale_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_sale        public.flash_sales%rowtype;
  v_balance     numeric;
  v_is_member   boolean;
  v_vip_serial  bigint;
  v_new_id      uuid;
  v_serial      text;
  v_vip_tiers   text[] := array['obsidian','cursed','souvenir','stellar','diamond','secret'];
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select * into v_sale
  from public.flash_sales
  where id = p_sale_id
    and ends_at > now()
    and stock > 0
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Sale not found, expired, or sold out');
  end if;

  select is_club_member into v_is_member from public.profiles where id = v_uid;
  if v_sale.vip_only and not coalesce(v_is_member, false) then
    return jsonb_build_object('ok', false, 'error', 'VIP Club only');
  end if;

  select balance into v_balance from public.profiles where id = v_uid for update;
  if v_balance is null or v_balance < v_sale.price_pc then
    return jsonb_build_object('ok', false, 'error', 'Insufficient Poxy Coins');
  end if;

  update public.profiles
  set balance = balance - v_sale.price_pc
  where id = v_uid;

  update public.flash_sales
  set stock = stock - 1
  where id = p_sale_id;

  if v_sale.poxy_tier = any (v_vip_tiers) then
    update public.vip_serial_counter
    set next_serial = next_serial + 1
    where poxy_tier = v_sale.poxy_tier
    returning next_serial - 1 into v_vip_serial;

    if v_vip_serial is null then
      insert into public.vip_serial_counter (poxy_tier, next_serial)
      values (v_sale.poxy_tier, 2)
      on conflict (poxy_tier) do update
      set next_serial = public.vip_serial_counter.next_serial + 1
      returning next_serial - 1 into v_vip_serial;
    end if;

    v_serial := 'VIP-' || lpad(v_vip_serial::text, 6, '0');

    insert into public.user_poxy (user_id, poxy_tier, serial_number, is_vip, vip_serial, case_origin)
    values (v_uid, v_sale.poxy_tier, v_serial, true, v_vip_serial, 'flash')
    returning id into v_new_id;
  else
    v_serial := 'PX-' || upper(substring(md5(random()::text), 1, 6));

    insert into public.user_poxy (user_id, poxy_tier, serial_number, case_origin)
    values (v_uid, v_sale.poxy_tier, v_serial, 'flash')
    returning id into v_new_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'new_id', v_new_id,
    'tier', v_sale.poxy_tier,
    'serial', v_serial,
    'balance', (select balance from public.profiles where id = v_uid)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- purchase_customization — atomic balance debit + theme/gradient (server price catalog)
-- -----------------------------------------------------------------------------
create or replace function public.purchase_customization(p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_cost    numeric;
  v_type    text;
  v_value   text;
  v_balance numeric;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select c.cost, c.item_type, c.item_value
  into v_cost, v_type, v_value
  from (
    values
      ('theme_cyberpunk', 50::numeric, 'theme', 'cyberpunk'),
      ('theme_mayfair',   75::numeric, 'theme', 'mayfair'),
      ('theme_arctic',    60::numeric, 'theme', 'arctic'),
      ('gradient_gold',   30::numeric, 'gradient', 'linear-gradient(90deg,#FFD700,#FF8C00,#FFD700)'),
      ('gradient_cyan',   25::numeric, 'gradient', 'linear-gradient(90deg,#00FFFF,#0080FF,#00FFFF)'),
      ('gradient_plasma', 40::numeric, 'gradient', 'linear-gradient(90deg,#FF0080,#7F00FF,#FF0080)')
  ) as c(item_id, cost, item_type, item_value)
  where c.item_id = p_item_id;

  if v_cost is null then
    return jsonb_build_object('ok', false, 'error', 'Unknown store item');
  end if;

  select balance into v_balance from public.profiles where id = v_uid for update;
  if v_balance is null or v_balance < v_cost then
    return jsonb_build_object('ok', false, 'error', 'Insufficient Poxy Coins');
  end if;

  if v_type = 'theme' then
    if exists (
      select 1 from public.profiles
      where id = v_uid and profile_theme = v_value
    ) then
      return jsonb_build_object('ok', false, 'error', 'Already active');
    end if;

    update public.profiles
    set balance = balance - v_cost, profile_theme = v_value
    where id = v_uid;
  elsif v_type = 'gradient' then
    if exists (
      select 1 from public.profiles
      where id = v_uid and name_gradient = v_value
    ) then
      return jsonb_build_object('ok', false, 'error', 'Already active');
    end if;

    update public.profiles
    set balance = balance - v_cost, name_gradient = v_value
    where id = v_uid;
  else
    return jsonb_build_object('ok', false, 'error', 'Invalid item type');
  end if;

  return jsonb_build_object(
    'ok', true,
    'item_id', p_item_id,
    'item_type', v_type,
    'balance', (select balance from public.profiles where id = v_uid),
    'profile_theme', (select profile_theme from public.profiles where id = v_uid),
    'name_gradient', (select name_gradient from public.profiles where id = v_uid)
  );
end;
$$;

grant execute on function public.accept_trade_offer(uuid) to authenticated;
grant execute on function public.decline_trade_offer(uuid) to authenticated;
grant execute on function public.purchase_flash_sale(bigint) to authenticated;
grant execute on function public.purchase_customization(text) to authenticated;

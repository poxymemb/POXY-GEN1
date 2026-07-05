-- M4: Marketplace fees — listing 2 PX, cancel 1 PX, sale 5%/3% VIP, trade 1% min 1 PX

CREATE OR REPLACE FUNCTION public.appraise_poxy_tier_pc(p_tier TEXT)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(trim(p_tier))
    WHEN 'common'    THEN 1.5
    WHEN 'uncommon'  THEN 4
    WHEN 'rare'      THEN 15
    WHEN 'epic'      THEN 65
    WHEN 'legendary' THEN 420
    WHEN 'mythic'    THEN 2800
    WHEN 'obsidian'  THEN 3500
    WHEN 'diamond'   THEN 5000
    WHEN 'secret'    THEN 10000
    ELSE 1.5
  END;
$$;

CREATE OR REPLACE FUNCTION public.list_poxy_marketplace(
  p_poxy_id UUID,
  p_price   NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_fee       INTEGER := 2;
  v_min_price NUMERIC := 5;
  v_balance   NUMERIC;
  v_listed    BOOLEAN;
  v_listing_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;
  IF p_price IS NULL OR p_price < v_min_price THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Minimum listing price is 5 PX');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_poxy WHERE id = p_poxy_id AND user_id = v_uid
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You do not own this POXY');
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.marketplace
    WHERE poxy_id = p_poxy_id AND status = 'active'
  ) INTO v_listed;
  IF v_listed THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Already listed on marketplace');
  END IF;

  SELECT balance INTO v_balance FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_fee THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance for 2 PX listing fee');
  END IF;

  UPDATE public.profiles
  SET balance = balance - v_fee,
      px_balance = GREATEST(0, px_balance - v_fee)
  WHERE id = v_uid;

  INSERT INTO public.marketplace (poxy_id, seller_id, price, status)
  VALUES (p_poxy_id, v_uid, p_price, 'active')
  RETURNING id INTO v_listing_id;

  RETURN jsonb_build_object(
    'ok', true,
    'listing_id', v_listing_id,
    'listing_fee', v_fee,
    'balance', (SELECT balance FROM public.profiles WHERE id = v_uid),
    'px_balance', (SELECT px_balance FROM public.profiles WHERE id = v_uid)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_marketplace_listing(p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_fee     INTEGER := 1;
  v_balance NUMERIC;
  v_listing public.marketplace%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_listing FROM public.marketplace WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Listing not found');
  END IF;
  IF v_listing.seller_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not your listing');
  END IF;
  IF v_listing.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Listing is not active');
  END IF;

  SELECT balance INTO v_balance FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_fee THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance for 1 PX cancellation fee');
  END IF;

  UPDATE public.profiles
  SET balance = balance - v_fee,
      px_balance = GREATEST(0, px_balance - v_fee)
  WHERE id = v_uid;

  UPDATE public.marketplace
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_listing_id;

  RETURN jsonb_build_object(
    'ok', true,
    'cancellation_fee', v_fee,
    'balance', (SELECT balance FROM public.profiles WHERE id = v_uid),
    'px_balance', (SELECT px_balance FROM public.profiles WHERE id = v_uid)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_poxy(p_listing_id UUID, p_buyer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing      public.marketplace%ROWTYPE;
  v_price        NUMERIC;
  v_buyer_balance NUMERIC;
  v_sale_pct     NUMERIC := 0.05;
  v_sale_fee     NUMERIC;
  v_seller_net   NUMERIC;
  v_vip_seller   BOOLEAN;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_buyer_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;

  SELECT * INTO v_listing FROM public.marketplace WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Listing not found'); END IF;
  IF v_listing.status <> 'active' THEN RETURN jsonb_build_object('ok', false, 'error', 'Listing not available'); END IF;
  IF v_listing.seller_id = p_buyer_id THEN RETURN jsonb_build_object('ok', false, 'error', 'Cannot buy your own listing'); END IF;

  v_price := v_listing.price;
  IF v_price < 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid listing price');
  END IF;

  SELECT balance INTO v_buyer_balance FROM public.profiles WHERE id = p_buyer_id FOR UPDATE;
  IF v_buyer_balance < v_price THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient Poxy Coins');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_poxy WHERE id = v_listing.poxy_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'POXY missing');
  END IF;

  SELECT COALESCE(is_club_member, false) INTO v_vip_seller
  FROM public.profiles WHERE id = v_listing.seller_id;
  IF v_vip_seller THEN v_sale_pct := 0.03; END IF;

  v_sale_fee   := CEIL(v_price * v_sale_pct);
  v_seller_net := v_price - v_sale_fee;

  UPDATE public.profiles
  SET balance = balance - v_price,
      px_balance = GREATEST(0, px_balance - CEIL(v_price)::INTEGER)
  WHERE id = p_buyer_id;

  UPDATE public.profiles
  SET balance = balance + v_seller_net,
      px_balance = px_balance + CEIL(v_seller_net)::INTEGER
  WHERE id = v_listing.seller_id;

  UPDATE public.user_poxy SET user_id = p_buyer_id WHERE id = v_listing.poxy_id;
  UPDATE public.marketplace SET status = 'sold', updated_at = NOW() WHERE id = p_listing_id;

  PERFORM public.award_xp(p_buyer_id, 20, 'TRADE', 'Marketplace purchase');
  PERFORM public.award_xp(v_listing.seller_id, 20, 'TRADE', 'Marketplace sale');

  RETURN jsonb_build_object(
    'ok', true,
    'sale_fee', v_sale_fee,
    'sale_fee_pct', v_sale_pct,
    'seller_net', v_seller_net,
    'buyer_balance', (SELECT balance FROM public.profiles WHERE id = p_buyer_id),
    'buyer_px_balance', (SELECT px_balance FROM public.profiles WHERE id = p_buyer_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_trade_offer(p_offer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_uid         UUID := auth.uid();
  v_offer       public.poxy_trade_offers%ROWTYPE;
  v_owned       INTEGER;
  v_listed      INTEGER;
  v_moved       INTEGER;
  v_pid         UUID;
  v_asset_id    UUID;
  v_nonce       TEXT;
  v_canonical   TEXT;
  v_ts          TEXT;
  v_key_ver     INTEGER;
  v_prev_hash   TEXT;
  v_total_value NUMERIC := 0;
  v_trade_fee   INTEGER;
  v_balance     NUMERIC;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_offer FROM public.poxy_trade_offers
  WHERE id = p_offer_id AND status = 'pending' FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Offer not found or already resolved');
  END IF;
  IF v_offer.to_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only the recipient can accept');
  END IF;
  IF v_offer.offered_poxy_ids IS NULL OR array_length(v_offer.offered_poxy_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Offer has no items');
  END IF;

  SELECT COUNT(*) INTO v_owned FROM public.user_poxy
  WHERE user_id = v_offer.from_id AND id = ANY(v_offer.offered_poxy_ids);
  IF v_owned <> array_length(v_offer.offered_poxy_ids, 1) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sender no longer owns all offered items');
  END IF;

  SELECT COUNT(*) INTO v_listed FROM public.marketplace m
  WHERE m.seller_id = v_offer.from_id
    AND m.status = 'active'
    AND m.poxy_id = ANY(v_offer.offered_poxy_ids);
  IF v_listed > 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot accept — items are listed on marketplace');
  END IF;

  SELECT COALESCE(SUM(public.appraise_poxy_tier_pc(poxy_tier)), 0) INTO v_total_value
  FROM public.user_poxy WHERE id = ANY(v_offer.offered_poxy_ids);

  v_trade_fee := GREATEST(1, CEIL(v_total_value * 0.01));

  SELECT balance INTO v_balance FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_trade_fee THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance for trade fee (' || v_trade_fee || ' PX)');
  END IF;

  UPDATE public.profiles
  SET balance = balance - v_trade_fee,
      px_balance = GREATEST(0, px_balance - v_trade_fee)
  WHERE id = v_uid;

  UPDATE public.user_poxy
  SET user_id = v_offer.to_id
  WHERE user_id = v_offer.from_id AND id = ANY(v_offer.offered_poxy_ids);

  GET DIAGNOSTICS v_moved = ROW_COUNT;
  IF v_moved <> array_length(v_offer.offered_poxy_ids, 1) THEN
    RAISE EXCEPTION 'Trade transfer incomplete';
  END IF;

  UPDATE public.poxy_trade_offers SET status = 'accepted', updated_at = NOW()
  WHERE id = p_offer_id;

  SELECT key_version INTO v_key_ver FROM public.crypto_keys WHERE status = 'active' LIMIT 1;
  v_ts := to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');

  FOREACH v_pid IN ARRAY v_offer.offered_poxy_ids LOOP
    SELECT id INTO v_asset_id FROM public.poxy_assets
    WHERE user_poxy_id = v_pid AND asset_state = 'active' LIMIT 1;

    IF v_asset_id IS NOT NULL THEN
      UPDATE public.poxy_assets SET current_owner_id = v_offer.to_id WHERE id = v_asset_id;

      v_nonce     := gen_random_uuid()::text;
      v_prev_hash := COALESCE(
        (SELECT event_hash FROM public.ledger_events ORDER BY seq DESC LIMIT 1),
        '0000000000000000'
      );
      v_canonical := 'v=1|type=TRADE|asset_id=' || v_asset_id::text
                  || '|actor_id=' || v_uid::text
                  || '|ts=' || v_ts || '|nonce=' || v_nonce;

      INSERT INTO public.ledger_events (
        id, event_type, asset_id, actor_id,
        prev_event_hash, event_hash,
        canonical, payload, nonce,
        event_timestamp, signature, key_version
      ) VALUES (
        gen_random_uuid(), 'TRADE', v_asset_id, v_uid,
        v_prev_hash,
        encode(extensions.digest(v_canonical, 'sha256'), 'hex'),
        v_canonical,
        jsonb_build_object('from', v_offer.from_id, 'to', v_offer.to_id,
                           'user_poxy_id', v_pid, 'offer_id', p_offer_id,
                           'trade_fee', v_trade_fee),
        v_nonce, NOW(),
        'TRADE_STUB_RESIGN_REQUIRED', COALESCE(v_key_ver, 1)
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'transferred', v_moved,
    'poxy_ids', v_offer.offered_poxy_ids,
    'trade_fee', v_trade_fee,
    'appraised_value', v_total_value,
    'px_balance', (SELECT px_balance FROM public.profiles WHERE id = v_uid)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.appraise_poxy_tier_pc(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_poxy_marketplace(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_marketplace_listing(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_poxy(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_trade_offer(UUID) TO authenticated;

-- Phase 2.2: Trade accept → signed TRADE via transfer_poxy edge (remove SQL stub).

CREATE OR REPLACE FUNCTION public.accept_trade_offer(p_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_offer      public.poxy_trade_offers%rowtype;
  v_owned      int;
  v_listed     int;
  v_moved      int;
  v_pid        uuid;
  v_asset_id   uuid;
  v_asset_ids  uuid[] := '{}';
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

  -- Gameplay transfer only (crypto TRADE via transfer_poxy edge after accept)
  UPDATE public.user_poxy
  SET user_id = v_offer.to_id
  WHERE user_id = v_offer.from_id AND id = ANY(v_offer.offered_poxy_ids);

  GET DIAGNOSTICS v_moved = ROW_COUNT;

  IF v_moved <> array_length(v_offer.offered_poxy_ids, 1) THEN
    RAISE EXCEPTION 'Trade transfer incomplete';
  END IF;

  UPDATE public.poxy_trade_offers
  SET status = 'accepted', updated_at = now()
  WHERE id = p_offer_id;

  FOREACH v_pid IN ARRAY v_offer.offered_poxy_ids LOOP
    SELECT id INTO v_asset_id FROM public.poxy_assets
    WHERE user_poxy_id = v_pid AND asset_state = 'active' LIMIT 1;
    IF v_asset_id IS NOT NULL THEN
      v_asset_ids := array_append(v_asset_ids, v_asset_id);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'transferred', v_moved,
    'poxy_ids', v_offer.offered_poxy_ids,
    'from_id', v_offer.from_id,
    'to_id', v_offer.to_id,
    'asset_ids', v_asset_ids
  );
END;
$$;

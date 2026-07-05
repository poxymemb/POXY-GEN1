-- Admin support: full POXY / ledger / trade dossier (staff only, bypasses RLS).

CREATE OR REPLACE FUNCTION public.admin_support_lookup(p_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_q           text := trim(coalesce(p_query, ''));
  v_serial      text;
  v_hash        text;
  v_uuid        uuid;
  v_up          public.user_poxy%rowtype;
  v_asset       public.poxy_assets%rowtype;
  v_event       public.ledger_events%rowtype;
  v_owner       public.profiles%rowtype;
  v_creator     public.profiles%rowtype;
  v_events      jsonb;
  v_trades      jsonb;
  v_mkt         jsonb;
  v_burns       jsonb;
  v_inventory   jsonb;
  v_found       boolean := false;
BEGIN
  IF NOT (public.private_is_admin() OR public.is_founder()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;
  IF v_q = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Empty query');
  END IF;

  -- UUID: asset, user_poxy, ledger event, offer, profile
  IF v_q ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_uuid := v_q::uuid;
    SELECT * INTO v_asset FROM public.poxy_assets WHERE id = v_uuid LIMIT 1;
    IF FOUND THEN v_found := true; END IF;
    IF NOT v_found THEN
      SELECT * INTO v_up FROM public.user_poxy WHERE id = v_uuid LIMIT 1;
      IF FOUND THEN v_found := true; END IF;
    END IF;
    IF NOT v_found THEN
      SELECT * INTO v_event FROM public.ledger_events WHERE id = v_uuid LIMIT 1;
      IF FOUND THEN
        v_found := true;
        IF v_event.asset_id IS NOT NULL THEN
          SELECT * INTO v_asset FROM public.poxy_assets WHERE id = v_event.asset_id LIMIT 1;
        END IF;
      END IF;
    END IF;
    IF NOT v_found THEN
      SELECT * INTO v_up FROM public.user_poxy u
      WHERE u.id = ANY(
        SELECT unnest(offered_poxy_ids) FROM public.poxy_trade_offers WHERE id = v_uuid
      ) LIMIT 1;
      IF FOUND THEN v_found := true; END IF;
    END IF;
    IF NOT v_found THEN
      SELECT * INTO v_owner FROM public.profiles WHERE id = v_uuid LIMIT 1;
      IF FOUND THEN v_found := true; END IF;
    END IF;
  END IF;

  -- Serial PX-XXXXXX
  IF NOT v_found AND (v_q ~* '^#?PX-' OR v_q ~* '^PX[A-Z0-9-]+$') THEN
    v_serial := upper(regexp_replace(v_q, '^#', '', 'i'));
    IF v_serial !~ '^PX-' THEN
      v_serial := 'PX-' || regexp_replace(v_serial, '^PX', '', 'i');
    END IF;
    SELECT * INTO v_up FROM public.user_poxy WHERE serial_number = v_serial LIMIT 1;
    IF FOUND THEN v_found := true; END IF;
  END IF;

  -- 64-char hex: poxy_hash or ledger event_hash
  IF NOT v_found AND length(regexp_replace(v_q, '\s', '', 'g')) = 64
     AND lower(regexp_replace(v_q, '\s', '', 'g')) ~ '^[0-9a-f]{64}$' THEN
    v_hash := lower(regexp_replace(v_q, '\s', '', 'g'));
    SELECT * INTO v_asset FROM public.poxy_assets WHERE poxy_hash = v_hash LIMIT 1;
    IF FOUND THEN v_found := true; END IF;
    IF NOT v_found THEN
      SELECT * INTO v_event FROM public.ledger_events WHERE event_hash = v_hash LIMIT 1;
      IF FOUND THEN
        v_found := true;
        IF v_event.asset_id IS NOT NULL THEN
          SELECT * INTO v_asset FROM public.poxy_assets WHERE id = v_event.asset_id LIMIT 1;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Account hash #PX-ABC or ABC12345
  IF NOT v_found AND v_q ~* '^#?PX-' THEN
    v_hash := upper(regexp_replace(v_q, '^#?PX-', '', 'i'));
    SELECT * INTO v_owner FROM public.profiles
    WHERE upper(account_hash) LIKE v_hash || '%' LIMIT 1;
    IF FOUND THEN v_found := true; END IF;
  END IF;

  -- Username
  IF NOT v_found THEN
    SELECT * INTO v_owner FROM public.profiles
    WHERE lower(username) = lower(v_q) LIMIT 1;
    IF FOUND THEN v_found := true; END IF;
  END IF;

  IF NOT v_found THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No match for query', 'query', v_q);
  END IF;

  -- Resolve asset from user_poxy
  IF v_asset.id IS NULL AND v_up.id IS NOT NULL THEN
    SELECT * INTO v_asset FROM public.poxy_assets
    WHERE user_poxy_id = v_up.id
    ORDER BY CASE asset_state WHEN 'active' THEN 0 ELSE 1 END, created_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  -- Resolve user_poxy from asset
  IF v_up.id IS NULL AND v_asset.user_poxy_id IS NOT NULL THEN
    SELECT * INTO v_up FROM public.user_poxy WHERE id = v_asset.user_poxy_id LIMIT 1;
  END IF;

  -- Owner / creator profiles
  IF v_up.user_id IS NOT NULL THEN
    SELECT * INTO v_owner FROM public.profiles WHERE id = v_up.user_id LIMIT 1;
  ELSIF v_asset.current_owner_id IS NOT NULL AND v_owner.id IS NULL THEN
    SELECT * INTO v_owner FROM public.profiles WHERE id = v_asset.current_owner_id LIMIT 1;
  END IF;
  IF v_asset.creator_id IS NOT NULL THEN
    SELECT * INTO v_creator FROM public.profiles WHERE id = v_asset.creator_id LIMIT 1;
  END IF;

  -- Ledger events for asset
  IF v_asset.id IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(
      jsonb_build_object(
        'id', le.id,
        'seq', le.seq,
        'event_type', le.event_type,
        'event_hash', le.event_hash,
        'actor_id', le.actor_id,
        'payload', le.payload,
        'event_timestamp', le.event_timestamp,
        'signature', left(le.signature, 24)
      ) ORDER BY le.seq
    ), '[]'::jsonb) INTO v_events
    FROM public.ledger_events le
    WHERE le.asset_id = v_asset.id;
  ELSIF v_event.id IS NOT NULL THEN
    v_events := jsonb_build_array(jsonb_build_object(
      'id', v_event.id,
      'seq', v_event.seq,
      'event_type', v_event.event_type,
      'event_hash', v_event.event_hash,
      'actor_id', v_event.actor_id,
      'payload', v_event.payload,
      'event_timestamp', v_event.event_timestamp,
      'signature', left(v_event.signature, 24)
    ));
  ELSE
    v_events := '[]'::jsonb;
  END IF;

  -- Trade offers
  IF v_up.id IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'status', o.status,
        'from_id', o.from_id,
        'to_id', o.to_id,
        'offered_poxy_ids', o.offered_poxy_ids,
        'created_at', o.created_at,
        'updated_at', o.updated_at
      ) ORDER BY o.updated_at DESC
    ), '[]'::jsonb) INTO v_trades
    FROM public.poxy_trade_offers o
    WHERE v_up.id = ANY(o.offered_poxy_ids);
  ELSE
    v_trades := '[]'::jsonb;
  END IF;

  -- Marketplace listings for this poxy
  IF v_up.id IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'status', m.status,
        'seller_id', m.seller_id,
        'price', m.price,
        'created_at', m.created_at
      ) ORDER BY m.created_at DESC
    ), '[]'::jsonb) INTO v_mkt
    FROM public.marketplace m
    WHERE m.poxy_id = v_up.id;
  ELSE
    v_mkt := '[]'::jsonb;
  END IF;

  -- Owner inventory (username / account lookup)
  IF v_owner.id IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(
      jsonb_build_object(
        'id', u.id,
        'serial_number', u.serial_number,
        'poxy_tier', u.poxy_tier,
        'dropped_at', u.dropped_at
      ) ORDER BY u.dropped_at DESC
    ), '[]'::jsonb) INTO v_inventory
    FROM (
      SELECT id, serial_number, poxy_tier, dropped_at
      FROM public.user_poxy
      WHERE user_id = v_owner.id
      ORDER BY dropped_at DESC
      LIMIT 40
    ) u;
  ELSE
    v_inventory := '[]'::jsonb;
  END IF;

  -- Burn log rows for owner (aggregate table — tier only)
  IF coalesce(v_owner.id, v_up.user_id) IS NOT NULL THEN
    SELECT coalesce(jsonb_agg(
      jsonb_build_object(
        'poxy_tier', t.poxy_tier,
        'burned_at', t.burned_at
      ) ORDER BY t.burned_at DESC
    ), '[]'::jsonb) INTO v_burns
    FROM (
      SELECT bl.poxy_tier, bl.burned_at
      FROM public.burn_log bl
      WHERE bl.user_id = coalesce(v_owner.id, v_up.user_id)
      ORDER BY bl.burned_at DESC
      LIMIT 20
    ) t;
  ELSE
    v_burns := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'query', v_q,
    'user_poxy', CASE WHEN v_up.id IS NOT NULL THEN jsonb_build_object(
      'id', v_up.id,
      'serial_number', v_up.serial_number,
      'poxy_tier', v_up.poxy_tier,
      'user_id', v_up.user_id,
      'case_origin', v_up.case_origin,
      'dropped_at', v_up.dropped_at,
      'rng_round_id', v_up.rng_round_id
    ) ELSE null END,
    'poxy_asset', CASE WHEN v_asset.id IS NOT NULL THEN jsonb_build_object(
      'id', v_asset.id,
      'poxy_hash', v_asset.poxy_hash,
      'serial_number', v_asset.serial_number,
      'poxy_tier', v_asset.poxy_tier,
      'asset_state', v_asset.asset_state,
      'current_owner_id', v_asset.current_owner_id,
      'creator_id', v_asset.creator_id,
      'genesis_event_id', v_asset.genesis_event_id,
      'user_poxy_id', v_asset.user_poxy_id
    ) ELSE null END,
    'owner', CASE WHEN v_owner.id IS NOT NULL THEN jsonb_build_object(
      'id', v_owner.id,
      'username', v_owner.username,
      'account_hash', v_owner.account_hash,
      'balance', v_owner.balance
    ) ELSE null END,
    'creator', CASE WHEN v_creator.id IS NOT NULL THEN jsonb_build_object(
      'id', v_creator.id,
      'username', v_creator.username
    ) ELSE null END,
    'ledger_events', v_events,
    'trade_offers', v_trades,
    'marketplace', v_mkt,
    'burn_log', v_burns,
    'inventory', coalesce(v_inventory, '[]'::jsonb),
    'verify_links', jsonb_build_object(
      'poxy_hash', v_asset.poxy_hash,
      'genesis_event_id', v_asset.genesis_event_id,
      'rng_round_id', v_up.rng_round_id
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_support_lookup(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_support_lookup(text) TO authenticated;

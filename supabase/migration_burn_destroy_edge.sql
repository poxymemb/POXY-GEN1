-- Burn → DESTROY edge: remove SQL stub from bulk burn; crypto_destroy leaves gameplay to burn RPC.

-- crypto_destroy_poxy — ledger DESTROY only (burn RPC deletes user_poxy + credits PC)
CREATE OR REPLACE FUNCTION public.crypto_destroy_poxy(
  p_asset_id        uuid,
  p_owner_id        uuid,
  p_event_canonical text,
  p_event_signature text,
  p_key_version     integer,
  p_nonce           text,
  p_payload         jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_asset public.poxy_assets;
  v_event public.ledger_events;
BEGIN
  SELECT * INTO v_asset FROM public.poxy_assets WHERE id = p_asset_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Asset not found');
  END IF;
  IF v_asset.current_owner_id <> p_owner_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not owner');
  END IF;
  IF public.crypto_next_state(v_asset.asset_state, 'DESTROY') IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error',
      format('ILLEGAL_TRANSITION: %s -> DESTROY', v_asset.asset_state));
  END IF;

  v_event := public.ledger_append(
    'DESTROY', v_asset.id, p_owner_id, p_event_canonical,
    COALESCE(p_payload, '{}'::jsonb), p_nonce, now(),
    p_event_signature, p_key_version
  );

  -- Keep current_owner_id (NOT NULL) for audit; state alone marks destruction.
  UPDATE public.poxy_assets
  SET asset_state = 'destroyed'
  WHERE id = v_asset.id;

  RETURN jsonb_build_object(
    'ok', true,
    'asset_id', v_asset.id,
    'event_id', v_event.id,
    'event_hash', v_event.event_hash,
    'seq', v_event.seq
  );
END;
$$;

-- Revert burn_poxy_bulk_pc — gameplay only (no SQL stub DESTROY)
CREATE OR REPLACE FUNCTION public.burn_poxy_bulk_pc(p_poxy_ids uuid[], p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_total       numeric := 0;
  v_count       int     := 0;
  v_rec         record;
  v_new_balance numeric;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;
  IF p_poxy_ids IS NULL OR array_length(p_poxy_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No items selected');
  END IF;

  FOR v_rec IN
    SELECT id, poxy_tier FROM public.user_poxy
    WHERE id = ANY(p_poxy_ids) AND user_id = p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM public.marketplace m
        WHERE m.poxy_id = public.user_poxy.id AND m.status = 'active'
      )
  LOOP
    v_total := v_total + (CASE v_rec.poxy_tier
      WHEN 'common'    THEN 0.10  WHEN 'uncommon'  THEN 0.25
      WHEN 'rare'      THEN 0.50  WHEN 'epic'      THEN 1.20
      WHEN 'legendary' THEN 8.00   WHEN 'mythic'    THEN 40.00
      WHEN 'obsidian'  THEN 0.50  WHEN 'cursed'    THEN 1.00
      WHEN 'souvenir'  THEN 2.00  WHEN 'stellar'   THEN 4.50
      WHEN 'diamond'   THEN 15.00 WHEN 'secret'    THEN 100.00
      ELSE 0.05 END);
    INSERT INTO public.burn_log (user_id, poxy_tier) VALUES (p_user_id, v_rec.poxy_tier);
    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nothing to burn');
  END IF;

  DELETE FROM public.user_poxy
  WHERE id = ANY(p_poxy_ids) AND user_id = p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.marketplace m
      WHERE m.poxy_id = public.user_poxy.id AND m.status = 'active'
    );

  UPDATE public.profiles SET balance = balance + v_total
  WHERE id = p_user_id RETURNING balance INTO v_new_balance;

  RETURN jsonb_build_object(
    'ok', true, 'count', v_count, 'payout', v_total, 'new_balance', v_new_balance
  );
END;
$$;

-- Fix: crypto_destroy_poxy must not NULL current_owner_id (column is NOT NULL).
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

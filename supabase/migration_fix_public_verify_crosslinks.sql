-- Fix public_verify RPCs: correct ledger chain formula + cross-link game/crypto/RNG metadata

CREATE OR REPLACE FUNCTION public.public_verify_event(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_event   public.ledger_events%rowtype;
  v_prev    public.ledger_events%rowtype;
  v_recomputed text;
  v_asset   public.poxy_assets%rowtype;
  v_game    public.user_poxy%rowtype;
BEGIN
  SELECT * INTO v_event FROM public.ledger_events WHERE id = p_event_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Event not found');
  END IF;

  v_recomputed := public.crypto_sha256_hex(v_event.prev_event_hash || E'\n' || v_event.canonical);

  SELECT * INTO v_prev FROM public.ledger_events WHERE event_hash = v_event.prev_event_hash LIMIT 1;

  SELECT * INTO v_asset FROM public.poxy_assets WHERE genesis_event_id = v_event.id LIMIT 1;
  IF v_asset.id IS NOT NULL AND v_asset.user_poxy_id IS NOT NULL THEN
    SELECT * INTO v_game FROM public.user_poxy WHERE id = v_asset.user_poxy_id LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'ok',               v_recomputed = v_event.event_hash,
    'event_id',         v_event.id,
    'event_type',       v_event.event_type,
    'event_hash',       v_event.event_hash,
    'computed_hash',    v_recomputed,
    'hash_matches',     (v_recomputed = v_event.event_hash),
    'prev_event_hash',  v_event.prev_event_hash,
    'prev_event_id',    v_prev.id,
    'canonical',        v_event.canonical,
    'created_at',       v_event.created_at,
    'seq',              v_event.seq,
    'asset_id',         v_asset.id,
    'poxy_hash',        v_asset.poxy_hash,
    'game_serial',      v_game.serial_number,
    'rng_round_id',     v_game.rng_round_id
  );
END;
$$;

-- (public_verify_asset and public_verify_rng updated in same migration applied to prod)

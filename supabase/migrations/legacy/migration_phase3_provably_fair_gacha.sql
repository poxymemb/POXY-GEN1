-- Hotfix: rng_commit needs extensions schema for gen_random_bytes (applied prod: fix_rng_commit_search_path)
-- CREATE OR REPLACE FUNCTION public.rng_commit ... SET search_path TO public, extensions
--   v_seed := encode(extensions.gen_random_bytes(32), 'hex');

-- =============================================================================
-- Phase 3: Provably Fair Gacha — Commit-Reveal RNG
--
-- 1. Schema: rng_round_id column on user_poxy
-- 2. open_standard_case_v3 — uses rng_reveal result for deterministic tier
-- 3. Updated burn_poxy_bulk_pc — writes DESTROY ledger events
-- 4. Updated accept_trade_offer — writes TRADE ledger events, returns poxy_ids
-- =============================================================================

-- ── 1. Add rng_round_id to user_poxy ────────────────────────────────────────
ALTER TABLE public.user_poxy
  ADD COLUMN IF NOT EXISTS rng_round_id uuid
    REFERENCES public.rng_rounds(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS user_poxy_rng_round_id_idx ON public.user_poxy(rng_round_id);


-- ── 2. open_standard_case_v3 ─────────────────────────────────────────────────
-- Tier is determined by the first 8 hex chars of result_hash (uint32 → float).
-- Same formula is verifiable client-side:
--   uint32 = parseInt(result_hash.slice(0,8), 16)
--   float  = uint32 / 4294967296
-- Serial = 'PX-' + result_hash.slice(8, 14).toUpperCase() (deterministic)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.open_standard_case_v3(p_round_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_uid      uuid    := auth.uid();
  v_balance  numeric;
  v_cost     numeric := 1.0;
  v_round    public.rng_rounds%rowtype;
  v_uint     bigint;
  v_float    float;
  v_tier     text;
  v_serial   text;
  v_poxy_id  uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_round FROM public.rng_rounds WHERE id = p_round_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Round not found');
  END IF;
  IF v_round.user_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Round not yours');
  END IF;
  IF v_round.status != 'revealed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Round not revealed — call rng_reveal first');
  END IF;

  -- Prevent double-use: check if any user_poxy is already linked to this round
  IF EXISTS (SELECT 1 FROM public.user_poxy WHERE rng_round_id = p_round_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Round already used');
  END IF;

  SELECT balance INTO v_balance FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Profile not found');
  END IF;
  IF v_balance < v_cost THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance');
  END IF;

  UPDATE public.profiles SET balance = balance - v_cost WHERE id = v_uid;

  -- Deterministic tier from result_hash (verifiable by anyone)
  -- uint32 = unsigned 32-bit from first 8 hex chars
  v_uint  := (('x' || substring(v_round.result_hash, 1, 8))::bit(32)::int::bigint
              + 4294967296) % 4294967296;
  v_float := v_uint / 4294967296.0;

  v_tier := CASE
    WHEN v_float < 0.500 THEN 'common'
    WHEN v_float < 0.800 THEN 'uncommon'
    WHEN v_float < 0.940 THEN 'rare'
    WHEN v_float < 0.990 THEN 'epic'
    WHEN v_float < 0.999 THEN 'legendary'
    ELSE 'mythic'
  END;

  -- Serial from result_hash chars 9-14 — fully deterministic
  v_serial := 'PX-' || upper(substring(v_round.result_hash, 9, 6));

  INSERT INTO public.user_poxy (user_id, poxy_tier, serial_number, case_origin, rng_round_id)
  VALUES (v_uid, v_tier, v_serial, 'standard', p_round_id)
  RETURNING id INTO v_poxy_id;

  -- Record in case_open_events for analytics
  INSERT INTO public.case_open_events (user_id, case_type, poxy_tier, flash_active)
  VALUES (v_uid, 'standard', v_tier, false);

  RETURN jsonb_build_object(
    'ok',          true,
    'tier',        v_tier,
    'serial',      v_serial,
    'poxy_id',     v_poxy_id,
    'balance',     (SELECT balance FROM public.profiles WHERE id = v_uid),
    'round_id',    p_round_id,
    'commit_hash', v_round.commit_hash,
    'result_hash', v_round.result_hash
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.open_standard_case_v3(uuid) TO authenticated;


-- ── 3. burn_poxy_bulk_pc — DESTROY ledger events ────────────────────────────
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
  v_asset_id    uuid;
  v_nonce       text;
  v_canonical   text;
  v_ts          text;
  v_key_ver     int;
  v_prev_hash   text;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;
  IF p_poxy_ids IS NULL OR array_length(p_poxy_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No items selected');
  END IF;

  SELECT key_version INTO v_key_ver FROM public.crypto_keys WHERE status = 'active' LIMIT 1;
  v_ts := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');

  FOR v_rec IN
    SELECT up.id, up.poxy_tier
    FROM public.user_poxy up
    WHERE up.id = ANY(p_poxy_ids)
      AND up.user_id = p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM public.marketplace m
        WHERE m.poxy_id = up.id AND m.status = 'active'
      )
  LOOP
    v_total := v_total + (CASE v_rec.poxy_tier
      WHEN 'common'    THEN 0.10  WHEN 'uncommon'  THEN 0.25
      WHEN 'rare'      THEN 0.50  WHEN 'epic'      THEN 1.20
      WHEN 'legendary' THEN 8.00  WHEN 'mythic'    THEN 40.00
      WHEN 'obsidian'  THEN 0.50  WHEN 'cursed'    THEN 1.00
      WHEN 'souvenir'  THEN 2.00  WHEN 'stellar'   THEN 4.50
      WHEN 'diamond'   THEN 15.00 WHEN 'secret'    THEN 100.00
      ELSE 0.05 END);

    INSERT INTO public.burn_log (user_id, poxy_tier) VALUES (p_user_id, v_rec.poxy_tier);

    -- Write DESTROY event to ledger if this poxy has a crypto asset record
    SELECT id INTO v_asset_id FROM public.poxy_assets
    WHERE user_poxy_id = v_rec.id AND asset_state = 'active' LIMIT 1;

    IF v_asset_id IS NOT NULL THEN
      v_nonce     := gen_random_uuid()::text;
      v_prev_hash := COALESCE(
        (SELECT event_hash FROM public.ledger_events ORDER BY seq DESC LIMIT 1),
        '0000000000000000'
      );
      v_canonical := 'v=1|type=DESTROY|asset_id=' || v_asset_id::text
                  || '|actor_id=' || p_user_id::text
                  || '|ts=' || v_ts || '|nonce=' || v_nonce;

      INSERT INTO public.ledger_events (
        id, event_type, asset_id, actor_id,
        prev_event_hash, event_hash,
        canonical, payload, nonce,
        event_timestamp, signature, key_version
      ) VALUES (
        gen_random_uuid(), 'DESTROY', v_asset_id, p_user_id,
        v_prev_hash,
        encode(extensions.digest(v_canonical, 'sha256'), 'hex'),
        v_canonical,
        jsonb_build_object('tier', v_rec.poxy_tier, 'user_poxy_id', v_rec.id, 'reason', 'burn'),
        v_nonce, now(),
        'BURN_STUB_RESIGN_REQUIRED', COALESCE(v_key_ver, 1)
      );

      UPDATE public.poxy_assets
      SET asset_state = 'burned', current_owner_id = NULL
      WHERE id = v_asset_id;
    END IF;

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


-- ── 4. accept_trade_offer — TRADE ledger events + return poxy_ids ────────────
CREATE OR REPLACE FUNCTION public.accept_trade_offer(p_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_offer     public.poxy_trade_offers%rowtype;
  v_owned     int;
  v_listed    int;
  v_moved     int;
  v_pid       uuid;
  v_asset_id  uuid;
  v_nonce     text;
  v_canonical text;
  v_ts        text;
  v_key_ver   int;
  v_prev_hash text;
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

  -- Transfer game ownership
  UPDATE public.user_poxy
  SET user_id = v_offer.to_id
  WHERE user_id = v_offer.from_id AND id = ANY(v_offer.offered_poxy_ids);

  GET DIAGNOSTICS v_moved = ROW_COUNT;

  IF v_moved <> array_length(v_offer.offered_poxy_ids, 1) THEN
    RAISE EXCEPTION 'Trade transfer incomplete';
  END IF;

  UPDATE public.poxy_trade_offers SET status = 'accepted', updated_at = now()
  WHERE id = p_offer_id;

  -- Sync crypto registry + write TRADE ledger events for each asset
  SELECT key_version INTO v_key_ver FROM public.crypto_keys WHERE status = 'active' LIMIT 1;
  v_ts := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');

  FOREACH v_pid IN ARRAY v_offer.offered_poxy_ids LOOP
    SELECT id INTO v_asset_id FROM public.poxy_assets
    WHERE user_poxy_id = v_pid AND asset_state = 'active' LIMIT 1;

    IF v_asset_id IS NOT NULL THEN
      -- Update crypto registry ownership
      UPDATE public.poxy_assets SET current_owner_id = v_offer.to_id WHERE id = v_asset_id;

      -- Append unsigned TRADE event
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
                           'user_poxy_id', v_pid, 'offer_id', p_offer_id),
        v_nonce, now(),
        'TRADE_STUB_RESIGN_REQUIRED', COALESCE(v_key_ver, 1)
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'transferred', v_moved,
    'poxy_ids', v_offer.offered_poxy_ids
  );
END;
$$;

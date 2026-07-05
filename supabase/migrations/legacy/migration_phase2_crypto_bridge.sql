-- =============================================================================
-- Phase 2: Crypto Bridge
-- 1. admin_backfill_crypto_assets  — register unminted user_poxy rows (admin-only)
-- 2. compute_ledger_snapshot       — daily Merkle-style hash snapshot of ledger
-- 3. cron job                      — runs compute_ledger_snapshot every 24 h
-- =============================================================================

-- ── 1. Admin backfill RPC (idempotent) ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_backfill_crypto_assets(
  p_limit int DEFAULT 50
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_rec        record;
  v_asset_id   uuid;
  v_event_id   uuid;
  v_poxy_hash  text;
  v_canonical  text;
  v_nonce      text;
  v_ts         text;
  v_key_ver    int;
  v_backfill   int := 0;
  v_skipped    int := 0;
BEGIN
  IF NOT private_is_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Forbidden');
  END IF;

  SELECT key_version INTO v_key_ver FROM public.crypto_keys WHERE status = 'active' LIMIT 1;
  IF v_key_ver IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No active signing key');
  END IF;

  FOR v_rec IN
    SELECT up.id, up.user_id, up.poxy_tier, up.serial_number, up.dropped_at
    FROM public.user_poxy up
    WHERE NOT EXISTS (SELECT 1 FROM public.poxy_assets pa WHERE pa.user_poxy_id = up.id)
    ORDER BY up.dropped_at ASC
    LIMIT p_limit
  LOOP
    BEGIN
      v_asset_id := gen_random_uuid();
      v_event_id := gen_random_uuid();
      v_nonce    := gen_random_uuid()::text;
      v_ts       := to_char(COALESCE(v_rec.dropped_at, now()) AT TIME ZONE 'UTC',
                            'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
      v_poxy_hash := encode(
        extensions.digest(
          'backfill:v1:creator=' || v_rec.user_id::text ||
          ':serial=' || COALESCE(v_rec.serial_number, '') ||
          ':tier=' || v_rec.poxy_tier || ':ts=' || v_ts,
          'sha256'
        ), 'hex');
      v_canonical := 'v=1|type=MINT|asset_id=' || v_asset_id::text ||
                     '|actor_id=' || v_rec.user_id::text ||
                     '|ts=' || v_ts || '|nonce=' || v_nonce;

      INSERT INTO public.poxy_assets (
        id, poxy_hash, user_poxy_id, creator_id, serial_number,
        rarity_seed, collection_id, generation_version, server_salt,
        poxy_tier, mint_timestamp, mint_ts_canonical,
        signature, key_version, current_owner_id, asset_state
      ) VALUES (
        v_asset_id, v_poxy_hash, v_rec.id, v_rec.user_id,
        v_rec.serial_number, v_nonce, 'genesis', 1, gen_random_uuid()::text,
        v_rec.poxy_tier, COALESCE(v_rec.dropped_at, now()), v_ts,
        'BACKFILL_STUB_RESIGN_REQUIRED', v_key_ver, v_rec.user_id, 'active'
      );

      INSERT INTO public.ledger_events (
        id, event_type, asset_id, actor_id,
        prev_event_hash, event_hash,
        canonical, payload, nonce, event_timestamp, signature, key_version
      ) VALUES (
        v_event_id, 'MINT', v_asset_id, v_rec.user_id,
        COALESCE((SELECT event_hash FROM public.ledger_events ORDER BY seq DESC LIMIT 1),
                 '0000000000000000'),
        encode(extensions.digest(v_canonical, 'sha256'), 'hex'),
        v_canonical,
        jsonb_build_object('backfill', true, 'tier', v_rec.poxy_tier, 'user_poxy_id', v_rec.id),
        v_nonce, COALESCE(v_rec.dropped_at, now()),
        'BACKFILL_STUB_RESIGN_REQUIRED', v_key_ver
      );

      UPDATE public.poxy_assets SET genesis_event_id = v_event_id WHERE id = v_asset_id;
      v_backfill := v_backfill + 1;

    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
      RAISE WARNING 'backfill skip user_poxy_id=%: %', v_rec.id, SQLERRM;
    END;
  END LOOP;
  RETURN jsonb_build_object(
    'ok', true, 'backfilled', v_backfill, 'skipped', v_skipped,
    'remaining', (
      SELECT COUNT(*) FROM public.user_poxy up
      WHERE NOT EXISTS (SELECT 1 FROM public.poxy_assets pa WHERE pa.user_poxy_id = up.id)
    )
  );
END;
$$;

-- Only callable by service role / admin (no public/authenticated execute)
REVOKE EXECUTE ON FUNCTION public.admin_backfill_crypto_assets(int) FROM PUBLIC, anon, authenticated;


-- ── 2. Ledger snapshot table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ledger_snapshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at   timestamptz NOT NULL DEFAULT now(),
  total_events  bigint NOT NULL,
  max_seq       bigint NOT NULL,
  root_hash     text NOT NULL,   -- sha256 of all event_hashes concatenated in seq order
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ledger_snapshots ENABLE ROW LEVEL SECURITY;

-- Only admins/service role can read snapshots; public verification via root_hash only
CREATE POLICY "admin read snapshots"
  ON public.ledger_snapshots FOR SELECT
  USING (private_is_admin());


-- ── 3. Snapshot compute function ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_ledger_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_concat     text := '';
  v_row        record;
  v_total      bigint := 0;
  v_max_seq    bigint := 0;
  v_root_hash  text;
  v_snap_id    uuid;
BEGIN
  -- Build concatenated hash string in seq order
  FOR v_row IN
    SELECT seq, event_hash FROM public.ledger_events ORDER BY seq ASC
  LOOP
    v_concat  := v_concat || v_row.event_hash;
    v_total   := v_total + 1;
    v_max_seq := v_row.seq;
  END LOOP;

  IF v_total = 0 THEN
    RETURN jsonb_build_object('ok', true, 'total_events', 0, 'note', 'empty ledger');
  END IF;

  v_root_hash := encode(extensions.digest(v_concat, 'sha256'), 'hex');

  INSERT INTO public.ledger_snapshots (total_events, max_seq, root_hash)
  VALUES (v_total, v_max_seq, v_root_hash)
  RETURNING id INTO v_snap_id;

  RETURN jsonb_build_object(
    'ok', true,
    'snapshot_id', v_snap_id,
    'total_events', v_total,
    'max_seq', v_max_seq,
    'root_hash', v_root_hash,
    'snapshot_at', now()
  );
END;
$$;

-- Only service role can call this directly; cron runs it as postgres
REVOKE EXECUTE ON FUNCTION public.compute_ledger_snapshot() FROM PUBLIC, anon, authenticated;


-- ── 4. pg_cron job — daily snapshot at 02:00 UTC ────────────────────────────
SELECT cron.schedule(
  'poxy-ledger-snapshot-daily',
  '0 2 * * *',
  $$SELECT public.compute_ledger_snapshot()$$
);

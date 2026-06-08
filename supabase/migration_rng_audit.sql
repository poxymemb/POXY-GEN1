-- ══════════════════════════════════════════════════════════════
-- Migration: rng_audit
-- Session 6 — RNG Audit Tool module for POXY MCU
-- Apply via Supabase Dashboard → SQL Editor
-- Depends on: public_verify_rng (migration_public_verify.sql)
-- ══════════════════════════════════════════════════════════════

-- Helper: staff gate (admin_emails + profiles join)
CREATE OR REPLACE FUNCTION public.private_is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_emails ae
    JOIN public.profiles p ON p.email = ae.email
    WHERE p.id = auth.uid()
  );
$$;


-- 1. RECENT RNG ROUNDS — last N rounds with player, tier, serial
CREATE OR REPLACE FUNCTION public.get_recent_rng_rounds(p_limit INT DEFAULT 20)
RETURNS TABLE(
  round_id      UUID,
  username      TEXT,
  user_id       UUID,
  status        TEXT,
  tier          TEXT,
  serial_number TEXT,
  round_ts      TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    p.username,
    r.user_id,
    r.status,
    up.poxy_tier,
    up.serial_number,
    COALESCE(r.revealed_at, r.committed_at) AS round_ts
  FROM public.rng_rounds r
  LEFT JOIN public.profiles p  ON p.id = r.user_id
  LEFT JOIN public.user_poxy up ON up.rng_round_id = r.id
  WHERE public.private_is_staff()
  ORDER BY r.committed_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_rng_rounds(INT) TO authenticated;


-- 2. ROUND CONTEXT — drop + ledger linkage for verification report step 5
CREATE OR REPLACE FUNCTION public.get_rng_round_context(p_round_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round   public.rng_rounds%rowtype;
  v_prof    public.profiles%rowtype;
  v_up      public.user_poxy%rowtype;
  v_asset   public.poxy_assets%rowtype;
  v_event   public.ledger_events%rowtype;
BEGIN
  IF NOT public.private_is_staff() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_round FROM public.rng_rounds WHERE id = p_round_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Round not found');
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_round.user_id LIMIT 1;
  SELECT * INTO v_up   FROM public.user_poxy WHERE rng_round_id = p_round_id LIMIT 1;

  IF v_up.id IS NOT NULL THEN
    SELECT * INTO v_asset FROM public.poxy_assets WHERE user_poxy_id = v_up.id LIMIT 1;
    IF v_asset.id IS NULL THEN
      SELECT * INTO v_asset FROM public.poxy_assets
      WHERE serial_number = v_up.serial_number
      ORDER BY created_at DESC LIMIT 1;
    END IF;
    IF v_asset.id IS NOT NULL THEN
      IF v_asset.genesis_event_id IS NOT NULL THEN
        SELECT * INTO v_event FROM public.ledger_events WHERE id = v_asset.genesis_event_id LIMIT 1;
      END IF;
      IF v_event.id IS NULL THEN
        SELECT * INTO v_event FROM public.ledger_events
        WHERE asset_id = v_asset.id AND event_type = 'MINT'
        ORDER BY seq ASC LIMIT 1;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok',           true,
    'round_id',     v_round.id,
    'user_id',      v_round.user_id,
    'username',     v_prof.username,
    'status',       v_round.status,
    'committed_at', v_round.committed_at,
    'revealed_at',  v_round.revealed_at,
    'drop', CASE WHEN v_up.id IS NOT NULL THEN jsonb_build_object(
      'user_poxy_id',  v_up.id,
      'serial_number', v_up.serial_number,
      'poxy_tier',     v_up.poxy_tier,
      'dropped_at',    v_up.dropped_at
    ) ELSE NULL END,
    'asset', CASE WHEN v_asset.id IS NOT NULL THEN jsonb_build_object(
      'asset_id',   v_asset.id,
      'poxy_hash',  v_asset.poxy_hash,
      'asset_state', v_asset.asset_state
    ) ELSE NULL END,
    'ledger', CASE WHEN v_event.id IS NOT NULL THEN jsonb_build_object(
      'event_id',   v_event.id,
      'seq',        v_event.seq,
      'event_hash', v_event.event_hash,
      'event_type', v_event.event_type
    ) ELSE NULL END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_rng_round_context(UUID) TO authenticated;

-- ══════════════════════════════════════════════════════════════
-- Verification crypto steps use existing public_verify_rng(p_round_id)
-- which is already granted to authenticated + anon.
-- ══════════════════════════════════════════════════════════════

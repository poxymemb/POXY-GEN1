-- ══════════════════════════════════════════════════════════════
-- Migration: economy_v2_rates — POXY Economy M0 rates
-- Standard case 50 PX, burn → integer PX, sync px_balance
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.open_standard_case_v3(p_round_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      UUID    := auth.uid();
  v_balance  NUMERIC;
  v_cost     NUMERIC := 50;
  v_round    public.rng_rounds%ROWTYPE;
  v_uint     BIGINT;
  v_float    FLOAT;
  v_tier     TEXT;
  v_serial   TEXT;
  v_poxy_id  UUID;
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

  UPDATE public.profiles
  SET balance = balance - v_cost,
      px_balance = GREATEST(0, px_balance - v_cost::INTEGER)
  WHERE id = v_uid;

  v_uint  := (('x' || substring(v_round.result_hash, 1, 8))::bit(32)::int::bigint
              + 4294967296) % 4294967296;
  v_float := v_uint / 4294967296.0;

  v_tier := CASE
    WHEN v_float < 0.600 THEN 'common'
    WHEN v_float < 0.850 THEN 'uncommon'
    WHEN v_float < 0.950 THEN 'rare'
    WHEN v_float < 0.990 THEN 'epic'
    WHEN v_float < 0.999 THEN 'legendary'
    ELSE 'mythic'
  END;

  v_serial := 'PX-' || upper(substring(v_round.result_hash, 9, 6));

  INSERT INTO public.user_poxy (user_id, poxy_tier, serial_number, case_origin, rng_round_id)
  VALUES (v_uid, v_tier, v_serial, 'standard', p_round_id)
  RETURNING id INTO v_poxy_id;

  INSERT INTO public.case_open_events (user_id, case_type, poxy_tier, flash_active)
  VALUES (v_uid, 'standard', v_tier, false);

  PERFORM public.bump_standard_pity();
  PERFORM public.award_xp(v_uid, 10, 'CASE_OPEN', 'Standard case');

  IF v_tier IN ('epic', 'legendary', 'mythic') THEN
    PERFORM public.reset_standard_epic_pity();
  END IF;

  RETURN jsonb_build_object(
    'ok',          true,
    'tier',        v_tier,
    'serial',      v_serial,
    'poxy_id',     v_poxy_id,
    'balance',     (SELECT balance FROM public.profiles WHERE id = v_uid),
    'px_balance',  (SELECT px_balance FROM public.profiles WHERE id = v_uid),
    'round_id',    p_round_id,
    'commit_hash', v_round.commit_hash,
    'result_hash', v_round.result_hash
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.burn_poxy_pc(p_poxy_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_tier TEXT;
  v_listed BOOLEAN;
  v_payout INTEGER;
  v_new_balance NUMERIC;
  v_dropped_at TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;

  SELECT user_id, poxy_tier, dropped_at
  INTO v_owner, v_tier, v_dropped_at
  FROM public.user_poxy WHERE id = p_poxy_id FOR UPDATE;

  IF v_owner IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'POXY not found');
  END IF;
  IF v_owner <> p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not your POXY');
  END IF;

  IF v_dropped_at IS NOT NULL AND v_dropped_at > NOW() - INTERVAL '24 hours' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Dragon must be 24h old before burn');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.marketplace WHERE poxy_id = p_poxy_id AND status = 'active'
  ) INTO v_listed;
  IF v_listed THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot burn a listed POXY');
  END IF;

  v_payout := CASE v_tier
    WHEN 'common'    THEN 2
    WHEN 'uncommon'  THEN 8
    WHEN 'rare'      THEN 25
    WHEN 'epic'      THEN 100
    WHEN 'legendary' THEN 500
    WHEN 'mythic'    THEN 2500
    WHEN 'obsidian'  THEN 8
    WHEN 'cursed'    THEN 25
    WHEN 'souvenir'  THEN 50
    WHEN 'stellar'   THEN 100
    WHEN 'diamond'   THEN 500
    WHEN 'secret'    THEN 2500
    ELSE 2
  END;

  DELETE FROM public.user_poxy WHERE id = p_poxy_id;

  UPDATE public.profiles
  SET balance = balance + v_payout,
      px_balance = px_balance + v_payout
  WHERE id = p_user_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.burn_log (user_id, poxy_tier) VALUES (p_user_id, v_tier);
  PERFORM public.award_xp(p_user_id, 5, 'BURN', 'Burned ' || v_tier);

  RETURN jsonb_build_object(
    'ok', true,
    'payout', v_payout,
    'tier', v_tier,
    'new_balance', v_new_balance,
    'px_balance', (SELECT px_balance FROM public.profiles WHERE id = p_user_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.burn_poxy_bulk_pc(p_poxy_ids UUID[], p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER := 0;
  v_count INTEGER := 0;
  v_rec RECORD;
  v_new_balance NUMERIC;
  v_payout INTEGER;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;
  IF p_poxy_ids IS NULL OR array_length(p_poxy_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No items');
  END IF;
  IF array_length(p_poxy_ids, 1) > 20 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Max 20 burns per batch');
  END IF;

  FOR v_rec IN
    SELECT up.id, up.poxy_tier, up.dropped_at
    FROM public.user_poxy up
    WHERE up.id = ANY(p_poxy_ids) AND up.user_id = p_user_id
    FOR UPDATE
  LOOP
    IF v_rec.dropped_at IS NOT NULL AND v_rec.dropped_at > NOW() - INTERVAL '24 hours' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'All dragons must be 24h old before burn');
    END IF;
    IF EXISTS (SELECT 1 FROM public.marketplace m WHERE m.poxy_id = v_rec.id AND m.status = 'active') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Cannot burn listed POXY');
    END IF;

    v_payout := CASE v_rec.poxy_tier
      WHEN 'common'    THEN 2
      WHEN 'uncommon'  THEN 8
      WHEN 'rare'      THEN 25
      WHEN 'epic'      THEN 100
      WHEN 'legendary' THEN 500
      WHEN 'mythic'    THEN 2500
      ELSE 2
    END;

    DELETE FROM public.user_poxy WHERE id = v_rec.id;
    INSERT INTO public.burn_log (user_id, poxy_tier) VALUES (p_user_id, v_rec.poxy_tier);
    v_total := v_total + v_payout;
    v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Nothing to burn');
  END IF;

  UPDATE public.profiles
  SET balance = balance + v_total,
      px_balance = px_balance + v_total
  WHERE id = p_user_id
  RETURNING balance INTO v_new_balance;

  PERFORM public.award_xp(p_user_id, 5 * v_count, 'BURN', 'Bulk burn x' || v_count);

  RETURN jsonb_build_object(
    'ok', true,
    'payout', v_total,
    'count', v_count,
    'new_balance', v_new_balance,
    'px_balance', (SELECT px_balance FROM public.profiles WHERE id = p_user_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.topup_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid amount');
  END IF;

  UPDATE public.profiles
  SET balance = balance + p_amount,
      px_balance = px_balance + FLOOR(p_amount)::INTEGER
  WHERE id = p_user_id
  RETURNING balance INTO v_new_balance;

  RETURN jsonb_build_object('ok', true, 'new_balance', v_new_balance,
    'px_balance', (SELECT px_balance FROM public.profiles WHERE id = p_user_id));
END;
$$;

GRANT EXECUTE ON FUNCTION public.open_standard_case_v3(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.burn_poxy_pc(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.burn_poxy_bulk_pc(UUID[], UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.topup_balance(UUID, NUMERIC) TO authenticated;

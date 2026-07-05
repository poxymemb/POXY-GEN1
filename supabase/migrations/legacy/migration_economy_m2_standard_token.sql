-- M2: allow standard case opens with streak case_tokens
CREATE OR REPLACE FUNCTION public.open_standard_case_v3(p_round_id UUID, p_use_token BOOLEAN DEFAULT FALSE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_balance NUMERIC;
  v_cost NUMERIC := 50;
  v_round public.rng_rounds%ROWTYPE;
  v_uint BIGINT;
  v_float FLOAT;
  v_tier TEXT;
  v_serial TEXT;
  v_poxy_id UUID;
  v_epic_p INTEGER := 0;
  v_leg_p INTEGER := 0;
  v_opens INTEGER := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_round FROM public.rng_rounds WHERE id = p_round_id FOR UPDATE;
  IF NOT FOUND OR v_round.user_id IS DISTINCT FROM v_uid OR v_round.status != 'revealed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid round');
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_poxy WHERE rng_round_id = p_round_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Round already used');
  END IF;

  SELECT standard_epic_pity, standard_leg_pity, standard_opens
  INTO v_epic_p, v_leg_p, v_opens
  FROM public.pity_counters WHERE user_id = v_uid;

  SELECT balance INTO v_balance FROM public.profiles WHERE id = v_uid FOR UPDATE;

  IF p_use_token THEN
    IF NOT public.consume_case_token(v_uid, 'standard') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'No standard case token');
    END IF;
  ELSE
    IF v_balance IS NULL OR v_balance < v_cost THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance');
    END IF;
    UPDATE public.profiles
    SET balance = balance - v_cost, px_balance = GREATEST(0, px_balance - v_cost::INTEGER)
    WHERE id = v_uid;
  END IF;

  v_uint := (('x' || substring(v_round.result_hash, 1, 8))::bit(32)::int::bigint + 4294967296) % 4294967296;
  v_float := v_uint / 4294967296.0;
  v_tier := public.resolve_standard_tier(v_float, v_epic_p, v_leg_p, v_opens);
  v_serial := 'PX-' || upper(substring(v_round.result_hash, 9, 6));

  INSERT INTO public.user_poxy (user_id, poxy_tier, serial_number, case_origin, rng_round_id)
  VALUES (v_uid, v_tier, v_serial, 'standard', p_round_id)
  RETURNING id INTO v_poxy_id;

  INSERT INTO public.case_open_events (user_id, case_type, poxy_tier, flash_active)
  VALUES (v_uid, 'standard', v_tier, false);

  PERFORM public.bump_standard_pity();
  PERFORM public.award_xp(v_uid, 10, 'CASE_OPEN', 'Standard case');
  PERFORM public.award_drop_xp_bonus(v_uid, v_tier);
  IF v_tier IN ('epic', 'legendary', 'mythic') THEN
    PERFORM public.reset_standard_epic_pity();
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'tier', v_tier, 'serial', v_serial, 'poxy_id', v_poxy_id,
    'used_token', p_use_token,
    'balance', (SELECT balance FROM public.profiles WHERE id = v_uid),
    'px_balance', (SELECT px_balance FROM public.profiles WHERE id = v_uid),
    'round_id', p_round_id, 'commit_hash', v_round.commit_hash, 'result_hash', v_round.result_hash
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.open_standard_case_v3(UUID, BOOLEAN) TO authenticated;

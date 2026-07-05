-- ══════════════════════════════════════════════════════════════
-- Migration: dopamine_offer — server-side 50% standard case discount
-- 25 PX for 10 minutes, max one claim per 24h per user
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.economy_offers
  ADD COLUMN IF NOT EXISTS last_dopamine_claim_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.start_dopamine_offer()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_claim   TIMESTAMPTZ;
  v_offer_at     TIMESTAMPTZ;
  v_claimed      BOOLEAN;
  v_window       INTERVAL := INTERVAL '10 minutes';
  v_cooldown     INTERVAL := INTERVAL '24 hours';
  v_expires      TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'start_dopamine_offer: not authenticated';
  END IF;

  INSERT INTO public.economy_offers(user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT last_dopamine_claim_at, last_dopamine_offer_at, dopamine_offer_claimed
  INTO v_last_claim, v_offer_at, v_claimed
  FROM public.economy_offers
  WHERE user_id = auth.uid();

  IF v_last_claim IS NOT NULL AND v_last_claim > NOW() - v_cooldown THEN
    RETURN jsonb_build_object(
      'ok',             false,
      'error',          'OFFER_COOLDOWN',
      'cooldown_until', v_last_claim + v_cooldown
    );
  END IF;

  IF v_offer_at IS NOT NULL
     AND NOT COALESCE(v_claimed, FALSE)
     AND v_offer_at > NOW() - v_window THEN
    v_expires := v_offer_at + v_window;
    RETURN jsonb_build_object(
      'ok',         true,
      'active',     true,
      'expires_at', v_expires,
      'price',      25
    );
  END IF;

  UPDATE public.economy_offers
  SET last_dopamine_offer_at  = NOW(),
      dopamine_offer_claimed  = FALSE,
      updated_at              = NOW()
  WHERE user_id = auth.uid();

  v_expires := NOW() + v_window;

  RETURN jsonb_build_object(
    'ok',         true,
    'active',     true,
    'expires_at', v_expires,
    'price',      25
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.open_dopamine_standard_case_v3(p_round_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      UUID    := auth.uid();
  v_balance  NUMERIC;
  v_cost     NUMERIC := 25;
  v_round    public.rng_rounds%ROWTYPE;
  v_uint     BIGINT;
  v_float    FLOAT;
  v_tier     TEXT;
  v_serial   TEXT;
  v_poxy_id  UUID;
  v_offer_at TIMESTAMPTZ;
  v_claimed  BOOLEAN;
  v_window   INTERVAL := INTERVAL '10 minutes';
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT last_dopamine_offer_at, dopamine_offer_claimed
  INTO v_offer_at, v_claimed
  FROM public.economy_offers
  WHERE user_id = v_uid;

  IF v_offer_at IS NULL
     OR COALESCE(v_claimed, FALSE)
     OR v_offer_at <= NOW() - v_window THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Dopamine offer expired or unavailable');
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
  VALUES (v_uid, 'standard', v_tier, true);

  UPDATE public.economy_offers
  SET dopamine_offer_claimed   = TRUE,
      last_dopamine_claim_at   = NOW(),
      updated_at               = NOW()
  WHERE user_id = v_uid;

  PERFORM public.bump_standard_pity();
  PERFORM public.award_xp(v_uid, 10, 'CASE_OPEN', 'Dopamine standard case');

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
    'result_hash', v_round.result_hash,
    'dopamine',    true,
    'cost',        v_cost
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_player_economy()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result       JSONB;
  v_offer_at     TIMESTAMPTZ;
  v_claimed      BOOLEAN;
  v_last_claim   TIMESTAMPTZ;
  v_window       INTERVAL := INTERVAL '10 minutes';
  v_cooldown     INTERVAL := INTERVAL '24 hours';
  v_dopamine     JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'get_player_economy: not authenticated';
  END IF;

  INSERT INTO public.pity_counters(user_id) VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.economy_offers(user_id) VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT last_dopamine_offer_at, dopamine_offer_claimed, last_dopamine_claim_at
  INTO v_offer_at, v_claimed, v_last_claim
  FROM public.economy_offers
  WHERE user_id = auth.uid();

  v_dopamine := jsonb_build_object(
    'price', 25,
    'active',
      v_offer_at IS NOT NULL
      AND NOT COALESCE(v_claimed, FALSE)
      AND v_offer_at > NOW() - v_window,
    'expires_at',
      CASE
        WHEN v_offer_at IS NOT NULL AND NOT COALESCE(v_claimed, FALSE)
        THEN to_jsonb(v_offer_at + v_window)
        ELSE 'null'::jsonb
      END,
    'cooldown_until',
      CASE
        WHEN v_last_claim IS NOT NULL AND v_last_claim > NOW() - v_cooldown
        THEN to_jsonb(v_last_claim + v_cooldown)
        ELSE 'null'::jsonb
      END,
    'can_start',
      v_last_claim IS NULL OR v_last_claim <= NOW() - v_cooldown
  );

  SELECT jsonb_build_object(
    'px_balance',  GREATEST(COALESCE(p.px_balance, 0), FLOOR(COALESCE(p.balance, 0))::INTEGER),
    'xp_total',    p.xp_total,
    'xp_balance',  p.xp_balance,
    'xp_level',    p.xp_level,
    'xp_to_next',  (POWER(p.xp_level + 1, 2) * 100) - p.xp_total,
    'xp_progress', CASE
      WHEN (POWER(p.xp_level + 1, 2) - POWER(p.xp_level, 2)) * 100 = 0 THEN 0
      ELSE (p.xp_total - POWER(p.xp_level, 2) * 100)::NUMERIC /
           ((POWER(p.xp_level + 1, 2) - POWER(p.xp_level, 2)) * 100)
    END,
    'streak',      COALESCE(ls.current_streak, 0),
    'last_login',  ls.last_login_date,
    'pity',        jsonb_build_object(
      'standard_opens',   COALESCE(pc.standard_opens, 0),
      'standard_epic',    COALESCE(pc.standard_epic_pity, 0),
      'standard_leg',     COALESCE(pc.standard_leg_pity, 0),
      'vip_epic',         COALESCE(pc.vip_epic_pity, 0),
      'vip_mythic',       COALESCE(pc.vip_mythic_pity, 0)
    ),
    'dopamine',    v_dopamine
  ) INTO v_result
  FROM public.profiles p
  LEFT JOIN public.login_streaks ls ON ls.user_id = p.id
  LEFT JOIN public.pity_counters pc ON pc.user_id = p.id
  WHERE p.id = auth.uid();

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.start_dopamine_offer() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.open_dopamine_standard_case_v3(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.start_dopamine_offer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_dopamine_standard_case_v3(UUID) TO authenticated;

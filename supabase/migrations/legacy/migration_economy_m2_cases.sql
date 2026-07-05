-- ══════════════════════════════════════════════════════════════
-- Migration: economy_m2_cases — Premium cases (VIP/Genesis/Mythic/Legend)
-- Provably-fair via rng_rounds + VIP pity + legend monthly cap
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.economy_monthly_caps (
  cap_key      TEXT NOT NULL,
  period_month DATE NOT NULL,
  open_count   INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cap_key, period_month)
);

ALTER TABLE public.economy_monthly_caps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_monthly_caps" ON public.economy_monthly_caps;
CREATE POLICY "staff_monthly_caps" ON public.economy_monthly_caps
  FOR SELECT USING (true);

-- ── VIP pity helpers ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bump_vip_pity()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.pity_counters(user_id, vip_opens, vip_epic_pity, vip_mythic_pity)
  VALUES (auth.uid(), 1, 1, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    vip_opens        = pity_counters.vip_opens + 1,
    vip_epic_pity    = pity_counters.vip_epic_pity + 1,
    vip_mythic_pity  = pity_counters.vip_mythic_pity + 1,
    updated_at       = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_vip_epic_pity()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pity_counters SET vip_epic_pity = 0, updated_at = NOW()
  WHERE user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_vip_mythic_pity()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pity_counters SET vip_mythic_pity = 0, updated_at = NOW()
  WHERE user_id = auth.uid();
END;
$$;

-- ── Tier resolvers ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_vip_tier(
  p_float FLOAT, p_epic_pity INTEGER, p_mythic_pity INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF COALESCE(p_mythic_pity, 0) >= 49 THEN RETURN 'mythic'; END IF;
  IF COALESCE(p_epic_pity, 0) >= 14 THEN
    IF p_float < 0.70 THEN RETURN 'epic'; END IF;
    IF p_float < 0.90 THEN RETURN 'legendary'; END IF;
    RETURN 'mythic';
  END IF;
  RETURN CASE
    WHEN p_float < 0.300 THEN 'uncommon'
    WHEN p_float < 0.650 THEN 'rare'
    WHEN p_float < 0.870 THEN 'epic'
    WHEN p_float < 0.970 THEN 'legendary'
    ELSE 'mythic'
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_genesis_tier(p_float FLOAT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE
    WHEN p_float < 0.250 THEN 'rare'
    WHEN p_float < 0.650 THEN 'epic'
    WHEN p_float < 0.900 THEN 'legendary'
    WHEN p_float < 0.990 THEN 'mythic'
    ELSE 'secret'
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_mythic_case_tier(p_float FLOAT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE
    WHEN p_float < 0.500 THEN 'epic'
    WHEN p_float < 0.850 THEN 'legendary'
    WHEN p_float < 0.970 THEN 'mythic'
    ELSE 'secret'
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_legend_case_tier(p_float FLOAT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE
    WHEN p_float < 0.500 THEN 'legendary'
    WHEN p_float < 0.900 THEN 'mythic'
    ELSE 'secret'
  END;
END;
$$;

-- ── Token consume ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.consume_case_token(
  p_user_id   UUID,
  p_case_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tokens JSONB;
  v_key    TEXT;
  v_count  INTEGER;
BEGIN
  v_key := CASE p_case_type
    WHEN 'standard' THEN 'standard' WHEN 'vip' THEN 'vip'
    WHEN 'genesis' THEN 'genesis' WHEN 'mythic' THEN 'mythic'
    WHEN 'legend' THEN 'legend' ELSE NULL END;
  IF v_key IS NULL THEN RETURN FALSE; END IF;

  SELECT case_tokens INTO v_tokens FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  v_count := COALESCE((v_tokens->>v_key)::INTEGER, 0);
  IF v_count <= 0 THEN RETURN FALSE; END IF;

  v_tokens := COALESCE(v_tokens, '{}'::jsonb)
    || jsonb_build_object(v_key, v_count - 1);
  UPDATE public.profiles SET case_tokens = v_tokens WHERE id = p_user_id;
  RETURN TRUE;
END;
$$;

-- ── Premium case open (VIP / Genesis / Mythic / Legend) ───────
CREATE OR REPLACE FUNCTION public.open_premium_case_v3(
  p_round_id    UUID,
  p_case_type   TEXT,
  p_use_token   BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_balance   NUMERIC;
  v_cost      INTEGER;
  v_round     public.rng_rounds%ROWTYPE;
  v_uint      BIGINT;
  v_float     FLOAT;
  v_tier      TEXT;
  v_serial    TEXT;
  v_poxy_id   UUID;
  v_prefix    TEXT;
  v_origin    TEXT;
  v_xp        INTEGER;
  v_epic_p    INTEGER := 0;
  v_myth_p    INTEGER := 0;
  v_month     DATE := date_trunc('month', NOW())::DATE;
  v_leg_opens INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  v_cost := CASE p_case_type
    WHEN 'vip'     THEN 150
    WHEN 'genesis' THEN 300
    WHEN 'mythic'  THEN 500
    WHEN 'legend'  THEN 1500
    ELSE NULL
  END;

  IF v_cost IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid case type');
  END IF;

  v_prefix := CASE p_case_type
    WHEN 'vip'     THEN 'VP-'
    WHEN 'genesis' THEN 'GN-'
    WHEN 'mythic'  THEN 'MY-'
    WHEN 'legend'  THEN 'LG-'
  END;
  v_origin := p_case_type;
  v_xp := CASE WHEN p_case_type = 'vip' THEN 25 ELSE 50 END;

  IF p_case_type = 'legend' THEN
    INSERT INTO public.economy_monthly_caps(cap_key, period_month, open_count)
    VALUES ('legend_case', v_month, 0)
    ON CONFLICT (cap_key, period_month) DO NOTHING;

    SELECT open_count INTO v_leg_opens
    FROM public.economy_monthly_caps
    WHERE cap_key = 'legend_case' AND period_month = v_month
    FOR UPDATE;

    IF COALESCE(v_leg_opens, 0) >= 100 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Legend cases sold out this month (100 max)');
    END IF;
  END IF;

  SELECT * INTO v_round FROM public.rng_rounds WHERE id = p_round_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Round not found'); END IF;
  IF v_round.user_id IS DISTINCT FROM v_uid THEN RETURN jsonb_build_object('ok', false, 'error', 'Round not yours'); END IF;
  IF v_round.status != 'revealed' THEN RETURN jsonb_build_object('ok', false, 'error', 'Round not revealed'); END IF;
  IF EXISTS (SELECT 1 FROM public.user_poxy WHERE rng_round_id = p_round_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Round already used');
  END IF;

  SELECT balance INTO v_balance FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Profile not found'); END IF;

  IF p_use_token THEN
    IF NOT public.consume_case_token(v_uid, p_case_type) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'No free ' || p_case_type || ' case token');
    END IF;
  ELSE
    IF v_balance < v_cost THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance');
    END IF;
    UPDATE public.profiles
    SET balance = balance - v_cost, px_balance = GREATEST(0, px_balance - v_cost)
    WHERE id = v_uid;
  END IF;

  v_uint  := (('x' || substring(v_round.result_hash, 1, 8))::bit(32)::int::bigint + 4294967296) % 4294967296;
  v_float := v_uint / 4294967296.0;

  IF p_case_type = 'vip' THEN
    SELECT vip_epic_pity, vip_mythic_pity INTO v_epic_p, v_myth_p
    FROM public.pity_counters WHERE user_id = v_uid;
    v_tier := public.resolve_vip_tier(v_float, v_epic_p, v_myth_p);
  ELSIF p_case_type = 'genesis' THEN
    v_tier := public.resolve_genesis_tier(v_float);
  ELSIF p_case_type = 'mythic' THEN
    v_tier := public.resolve_mythic_case_tier(v_float);
  ELSE
    v_tier := public.resolve_legend_case_tier(v_float);
  END IF;

  v_serial := v_prefix || upper(substring(v_round.result_hash, 9, 6));

  INSERT INTO public.user_poxy (user_id, poxy_tier, serial_number, case_origin, rng_round_id)
  VALUES (v_uid, v_tier, v_serial, v_origin, p_round_id)
  RETURNING id INTO v_poxy_id;

  INSERT INTO public.case_open_events (user_id, case_type, poxy_tier, flash_active)
  VALUES (v_uid, p_case_type, v_tier, false);

  IF p_case_type = 'vip' THEN
    PERFORM public.bump_vip_pity();
    IF v_tier IN ('epic', 'legendary', 'mythic') THEN PERFORM public.reset_vip_epic_pity(); END IF;
    IF v_tier = 'mythic' THEN PERFORM public.reset_vip_mythic_pity(); END IF;
    INSERT INTO public.pity_counters(user_id, genesis_opens)
    VALUES (v_uid, 0) ON CONFLICT (user_id) DO NOTHING;
  ELSIF p_case_type = 'genesis' THEN
    UPDATE public.pity_counters SET genesis_opens = genesis_opens + 1, updated_at = NOW()
    WHERE user_id = v_uid;
  END IF;

  IF p_case_type = 'legend' THEN
    UPDATE public.economy_monthly_caps
    SET open_count = open_count + 1, updated_at = NOW()
    WHERE cap_key = 'legend_case' AND period_month = v_month;
  END IF;

  PERFORM public.award_xp(v_uid, v_xp, 'CASE_OPEN', p_case_type || ' case');
  PERFORM public.award_drop_xp_bonus(v_uid, v_tier);

  RETURN jsonb_build_object(
    'ok',          true,
    'case_type',   p_case_type,
    'tier',        v_tier,
    'serial',      v_serial,
    'poxy_id',     v_poxy_id,
    'cost',        CASE WHEN p_use_token THEN 0 ELSE v_cost END,
    'used_token',  p_use_token,
    'balance',     (SELECT balance FROM public.profiles WHERE id = v_uid),
    'px_balance',  (SELECT px_balance FROM public.profiles WHERE id = v_uid),
    'round_id',    p_round_id,
    'commit_hash', v_round.commit_hash,
    'result_hash', v_round.result_hash
  );
END;
$$;

-- Extend get_player_economy with VIP pity countdown + legend cap
CREATE OR REPLACE FUNCTION public.get_player_economy()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB; v_offer_at TIMESTAMPTZ; v_claimed BOOLEAN; v_last_claim TIMESTAMPTZ;
  v_window INTERVAL := INTERVAL '10 minutes'; v_cooldown INTERVAL := INTERVAL '24 hours';
  v_dopamine JSONB; v_epic_p INTEGER; v_leg_p INTEGER;
  v_vip_epic INTEGER; v_vip_myth INTEGER;
  v_leg_month INTEGER; v_month DATE := date_trunc('month', NOW())::DATE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'get_player_economy: not authenticated'; END IF;
  INSERT INTO public.pity_counters(user_id) VALUES (auth.uid()) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.economy_offers(user_id) VALUES (auth.uid()) ON CONFLICT (user_id) DO NOTHING;

  SELECT last_dopamine_offer_at, dopamine_offer_claimed, last_dopamine_claim_at
  INTO v_offer_at, v_claimed, v_last_claim FROM public.economy_offers WHERE user_id = auth.uid();

  SELECT standard_epic_pity, standard_leg_pity, vip_epic_pity, vip_mythic_pity
  INTO v_epic_p, v_leg_p, v_vip_epic, v_vip_myth
  FROM public.pity_counters WHERE user_id = auth.uid();

  SELECT COALESCE(open_count, 0) INTO v_leg_month
  FROM public.economy_monthly_caps WHERE cap_key = 'legend_case' AND period_month = v_month;

  v_dopamine := jsonb_build_object(
    'price', 25, 'active',
      v_offer_at IS NOT NULL AND NOT COALESCE(v_claimed, FALSE) AND v_offer_at > NOW() - v_window,
    'expires_at', CASE WHEN v_offer_at IS NOT NULL AND NOT COALESCE(v_claimed, FALSE)
      THEN to_jsonb(v_offer_at + v_window) ELSE 'null'::jsonb END,
    'cooldown_until', CASE WHEN v_last_claim IS NOT NULL AND v_last_claim > NOW() - v_cooldown
      THEN to_jsonb(v_last_claim + v_cooldown) ELSE 'null'::jsonb END,
    'can_start', v_last_claim IS NULL OR v_last_claim <= NOW() - v_cooldown
  );

  SELECT jsonb_build_object(
    'px_balance', GREATEST(COALESCE(p.px_balance, 0), FLOOR(COALESCE(p.balance, 0))::INTEGER),
    'xp_total', p.xp_total, 'xp_balance', p.xp_balance, 'xp_level', p.xp_level,
    'xp_to_next', (POWER(p.xp_level + 1, 2) * 100) - p.xp_total,
    'xp_progress', CASE WHEN (POWER(p.xp_level + 1, 2) - POWER(p.xp_level, 2)) * 100 = 0 THEN 0
      ELSE (p.xp_total - POWER(p.xp_level, 2) * 100)::NUMERIC
           / ((POWER(p.xp_level + 1, 2) - POWER(p.xp_level, 2)) * 100) END,
    'streak', COALESCE(ls.current_streak, 0), 'last_login', ls.last_login_date,
    'case_tokens', COALESCE(p.case_tokens, '{}'::jsonb),
    'pity', jsonb_build_object(
      'standard_opens', COALESCE(pc.standard_opens, 0),
      'standard_epic', COALESCE(v_epic_p, 0), 'standard_leg', COALESCE(v_leg_p, 0),
      'epic_hard_at', 30, 'leg_hard_at', 80, 'soft_from', 70,
      'epic_until', GREATEST(0, 30 - COALESCE(v_epic_p, 0)),
      'leg_until', GREATEST(0, 80 - COALESCE(v_leg_p, 0)),
      'vip_epic', COALESCE(v_vip_epic, 0), 'vip_mythic', COALESCE(v_vip_myth, 0),
      'vip_epic_hard_at', 15, 'vip_mythic_hard_at', 50,
      'vip_epic_until', GREATEST(0, 15 - COALESCE(v_vip_epic, 0)),
      'vip_mythic_until', GREATEST(0, 50 - COALESCE(v_vip_myth, 0))
    ),
    'legend_monthly', jsonb_build_object('opens', COALESCE(v_leg_month, 0), 'cap', 100,
      'remaining', GREATEST(0, 100 - COALESCE(v_leg_month, 0))),
    'dopamine', v_dopamine
  ) INTO v_result
  FROM public.profiles p
  LEFT JOIN public.login_streaks ls ON ls.user_id = p.id
  LEFT JOIN public.pity_counters pc ON pc.user_id = p.id
  WHERE p.id = auth.uid();

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.open_premium_case_v3(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_case_token(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bump_vip_pity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_vip_epic_pity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_vip_mythic_pity() TO authenticated;

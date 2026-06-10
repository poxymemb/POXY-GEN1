-- M6c: VIP Membership + Daily/Weekly economy events (Stripe deferred)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vip_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vip_month_bonus_month DATE,
  ADD COLUMN IF NOT EXISTS vip_daily_claim DATE,
  ADD COLUMN IF NOT EXISTS vip_weekly_claim DATE;

CREATE OR REPLACE FUNCTION public.has_vip_membership(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT vip_until > NOW() FROM public.profiles WHERE id = p_user_id),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.get_economy_event()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dow INTEGER;
BEGIN
  v_dow := EXTRACT(DOW FROM (NOW() AT TIME ZONE 'Europe/London'))::INTEGER;
  RETURN CASE v_dow
    WHEN 1 THEN jsonb_build_object(
      'id', 'mystery_monday', 'label', 'Mystery Monday',
      'sub', 'Standard & VIP cases −20%',
      'case_discount', 0.20
    )
    WHEN 2 THEN jsonb_build_object(
      'id', 'trade_tuesday', 'label', 'Trade Tuesday',
      'sub', 'Marketplace sale fee 2%',
      'market_fee', 0.02
    )
    WHEN 3 THEN jsonb_build_object(
      'id', 'whale_day', 'label', 'Whale Day',
      'sub', 'Genesis Case +50% Mythic chance',
      'genesis_mythic_boost', TRUE
    )
    WHEN 4 THEN jsonb_build_object(
      'id', 'craft_thursday', 'label', 'Craft Thursday',
      'sub', 'All crafts +100 XP',
      'craft_xp_bonus', 100
    )
    WHEN 5 THEN jsonb_build_object(
      'id', 'founders_friday', 'label', 'Founders Friday',
      'sub', 'VIP +25 bonus XP on all gains',
      'vip_xp_bonus', 25
    )
    WHEN 0 THEN jsonb_build_object(
      'id', 'lucky_weekend', 'label', 'Lucky Drop Weekend',
      'sub', '+10% drop rate everywhere',
      'drop_boost', 0.10
    )
    WHEN 6 THEN jsonb_build_object(
      'id', 'lucky_weekend', 'label', 'Lucky Drop Weekend',
      'sub', '+10% drop rate everywhere',
      'drop_boost', 0.10
    )
    ELSE jsonb_build_object('id', 'none', 'label', '', 'sub', '')
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_drop_rate_boosts(
  p_float FLOAT,
  p_user_id UUID,
  p_genesis_whale BOOLEAN DEFAULT FALSE
)
RETURNS FLOAT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_float FLOAT := p_float;
  v_event JSONB;
  v_boost FLOAT := 0;
BEGIN
  v_event := public.get_economy_event();

  IF (v_event ? 'drop_boost') THEN
    v_boost := v_boost + COALESCE((v_event->>'drop_boost')::FLOAT, 0);
  END IF;

  IF public.has_vip_membership(p_user_id) THEN
    v_boost := v_boost + 0.05;
  END IF;

  IF p_genesis_whale AND COALESCE((v_event->>'id'), '') = 'whale_day' THEN
    v_boost := v_boost + 0.08;
  END IF;

  v_boost := LEAST(v_boost, 0.30);
  RETURN GREATEST(0.0, v_float - v_boost);
END;
$$;

CREATE OR REPLACE FUNCTION public.event_discounted_case_price(p_base INTEGER, p_case_type TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event JSONB;
BEGIN
  v_event := public.get_economy_event();
  IF COALESCE(v_event->>'id', '') = 'mystery_monday'
     AND p_case_type IN ('standard', 'vip') THEN
    RETURN GREATEST(1, FLOOR(p_base * 0.8)::INTEGER);
  END IF;
  RETURN p_base;
END;
$$;

CREATE OR REPLACE FUNCTION public.market_sale_fee_pct(p_seller_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event JSONB;
BEGIN
  v_event := public.get_economy_event();
  IF COALESCE(v_event->>'id', '') = 'trade_tuesday' THEN
    RETURN 0.02;
  END IF;
  IF public.has_vip_membership(p_seller_id) THEN
    RETURN 0.03;
  END IF;
  RETURN 0.05;
END;
$$;

-- ── VIP status + claims ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_vip_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_month DATE := date_trunc('month', NOW() AT TIME ZONE 'Europe/London')::DATE;
  v_today DATE := (NOW() AT TIME ZONE 'Europe/London')::DATE;
  v_week DATE := date_trunc('week', NOW() AT TIME ZONE 'Europe/London')::DATE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Profile not found');
  END IF;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'active', COALESCE(v_prof.vip_until > NOW(), FALSE),
    'vip_until', v_prof.vip_until,
    'price_px', 100,
    'monthly_bonus_px', 200,
    'monthly_bonus_ready', COALESCE(v_prof.vip_until > NOW(), FALSE)
      AND (v_prof.vip_month_bonus_month IS NULL OR v_prof.vip_month_bonus_month < v_month),
    'daily_standard_ready', COALESCE(v_prof.vip_until > NOW(), FALSE)
      AND (v_prof.vip_daily_claim IS NULL OR v_prof.vip_daily_claim < v_today),
    'weekly_vip_ready', COALESCE(v_prof.vip_until > NOW(), FALSE)
      AND (v_prof.vip_weekly_claim IS NULL OR v_prof.vip_weekly_claim < v_week),
    'perks', jsonb_build_array(
      '200 PX monthly bonus',
      '+5% drop rate on Rare+',
      'Free Standard Case daily',
      'Free VIP Case weekly',
      '3% marketplace sale fee',
      '10% PX package discount (UI)',
      'VIP profile badge'
    ),
    'event', public.get_economy_event()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_vip_membership()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_cost INTEGER := 100;
  v_bal NUMERIC;
  v_until TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT balance, vip_until INTO v_bal, v_until
  FROM public.profiles WHERE id = v_uid FOR UPDATE;

  IF v_bal IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Profile not found');
  END IF;
  IF v_bal < v_cost THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient PX — need 100 PX');
  END IF;

  v_until := GREATEST(COALESCE(v_until, NOW()), NOW()) + INTERVAL '30 days';

  UPDATE public.profiles
  SET balance = balance - v_cost,
      px_balance = GREATEST(0, px_balance - v_cost),
      vip_until = v_until
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'vip_until', v_until,
    'balance', (SELECT balance FROM public.profiles WHERE id = v_uid),
    'px_balance', (SELECT px_balance FROM public.profiles WHERE id = v_uid)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.dev_activate_vip()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_until TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;
  v_until := GREATEST(COALESCE((SELECT vip_until FROM public.profiles WHERE id = v_uid), NOW()), NOW())
    + INTERVAL '30 days';
  UPDATE public.profiles SET vip_until = v_until WHERE id = v_uid;
  RETURN jsonb_build_object('ok', TRUE, 'vip_until', v_until);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_vip_monthly_bonus()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_month DATE := date_trunc('month', NOW() AT TIME ZONE 'Europe/London')::DATE;
  v_until TIMESTAMPTZ;
  v_claimed DATE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT vip_until, vip_month_bonus_month INTO v_until, v_claimed
  FROM public.profiles WHERE id = v_uid FOR UPDATE;

  IF v_until IS NULL OR v_until <= NOW() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'VIP membership inactive');
  END IF;
  IF v_claimed IS NOT NULL AND v_claimed >= v_month THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Monthly bonus already claimed');
  END IF;

  UPDATE public.profiles
  SET balance = balance + 200,
      px_balance = px_balance + 200,
      vip_month_bonus_month = v_month
  WHERE id = v_uid;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'px_awarded', 200,
    'balance', (SELECT balance FROM public.profiles WHERE id = v_uid),
    'px_balance', (SELECT px_balance FROM public.profiles WHERE id = v_uid)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_vip_daily_standard()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_today DATE := (NOW() AT TIME ZONE 'Europe/London')::DATE;
  v_until TIMESTAMPTZ;
  v_claimed DATE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT vip_until, vip_daily_claim INTO v_until, v_claimed
  FROM public.profiles WHERE id = v_uid FOR UPDATE;

  IF v_until IS NULL OR v_until <= NOW() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'VIP membership inactive');
  END IF;
  IF v_claimed IS NOT NULL AND v_claimed >= v_today THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Daily case already claimed');
  END IF;

  PERFORM public.grant_case_token(v_uid, 'standard', 1);
  UPDATE public.profiles SET vip_daily_claim = v_today WHERE id = v_uid;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'case_tokens', (SELECT case_tokens FROM public.profiles WHERE id = v_uid)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_vip_weekly_vip_case()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_week DATE := date_trunc('week', NOW() AT TIME ZONE 'Europe/London')::DATE;
  v_until TIMESTAMPTZ;
  v_claimed DATE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT vip_until, vip_weekly_claim INTO v_until, v_claimed
  FROM public.profiles WHERE id = v_uid FOR UPDATE;

  IF v_until IS NULL OR v_until <= NOW() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'VIP membership inactive');
  END IF;
  IF v_claimed IS NOT NULL AND v_claimed >= v_week THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Weekly VIP case already claimed');
  END IF;

  PERFORM public.grant_case_token(v_uid, 'vip', 1);
  UPDATE public.profiles SET vip_weekly_claim = v_week WHERE id = v_uid;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'case_tokens', (SELECT case_tokens FROM public.profiles WHERE id = v_uid)
  );
END;
$$;

-- ── Hook: standard case opens ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.open_standard_case_v3(p_round_id UUID, p_use_token BOOLEAN DEFAULT FALSE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_balance NUMERIC;
  v_cost INTEGER := public.event_discounted_case_price(50, 'standard');
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
  v_float := public.apply_drop_rate_boosts(v_float, v_uid, FALSE);
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
    'used_token', p_use_token, 'cost_px', CASE WHEN p_use_token THEN 0 ELSE v_cost END,
    'balance', (SELECT balance FROM public.profiles WHERE id = v_uid),
    'px_balance', (SELECT px_balance FROM public.profiles WHERE id = v_uid),
    'round_id', p_round_id, 'commit_hash', v_round.commit_hash, 'result_hash', v_round.result_hash
  );
END;
$$;

-- ── Hook: premium case opens ──────────────────────────────────
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
  v_base_cost INTEGER;
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

  v_base_cost := CASE p_case_type
    WHEN 'vip'     THEN 150
    WHEN 'genesis' THEN 300
    WHEN 'mythic'  THEN 500
    WHEN 'legend'  THEN 1500
    ELSE NULL
  END;

  IF v_base_cost IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid case type');
  END IF;

  v_cost := public.event_discounted_case_price(v_base_cost, p_case_type);

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
  v_float := public.apply_drop_rate_boosts(v_float, v_uid, p_case_type = 'genesis');

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
  END IF;

  IF p_case_type = 'legend' THEN
    UPDATE public.economy_monthly_caps
    SET open_count = open_count + 1, updated_at = NOW()
    WHERE cap_key = 'legend_case' AND period_month = v_month;
  END IF;

  PERFORM public.award_xp(v_uid, v_xp, 'CASE_OPEN', initcap(p_case_type) || ' case');
  PERFORM public.award_drop_xp_bonus(v_uid, v_tier);

  RETURN jsonb_build_object(
    'ok', true, 'tier', v_tier, 'serial', v_serial, 'poxy_id', v_poxy_id,
    'case_type', p_case_type, 'used_token', p_use_token,
    'cost_px', CASE WHEN p_use_token THEN 0 ELSE v_cost END,
    'balance', (SELECT balance FROM public.profiles WHERE id = v_uid),
    'px_balance', (SELECT px_balance FROM public.profiles WHERE id = v_uid),
    'round_id', p_round_id, 'commit_hash', v_round.commit_hash, 'result_hash', v_round.result_hash
  );
END;
$$;

-- ── Hook: marketplace sale fee ────────────────────────────────
CREATE OR REPLACE FUNCTION public.purchase_poxy(p_listing_id UUID, p_buyer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing      public.marketplace%ROWTYPE;
  v_price        NUMERIC;
  v_buyer_balance NUMERIC;
  v_sale_pct     NUMERIC;
  v_sale_fee     NUMERIC;
  v_seller_net   NUMERIC;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_buyer_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;

  SELECT * INTO v_listing FROM public.marketplace WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Listing not found'); END IF;
  IF v_listing.status <> 'active' THEN RETURN jsonb_build_object('ok', false, 'error', 'Listing not available'); END IF;
  IF v_listing.seller_id = p_buyer_id THEN RETURN jsonb_build_object('ok', false, 'error', 'Cannot buy your own listing'); END IF;

  v_price := v_listing.price;
  IF v_price < 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid listing price');
  END IF;

  SELECT balance INTO v_buyer_balance FROM public.profiles WHERE id = p_buyer_id FOR UPDATE;
  IF v_buyer_balance < v_price THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient Poxy Coins');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_poxy WHERE id = v_listing.poxy_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'POXY missing');
  END IF;

  v_sale_pct   := public.market_sale_fee_pct(v_listing.seller_id);
  v_sale_fee   := CEIL(v_price * v_sale_pct);
  v_seller_net := v_price - v_sale_fee;

  UPDATE public.profiles
  SET balance = balance - v_price,
      px_balance = GREATEST(0, px_balance - CEIL(v_price)::INTEGER)
  WHERE id = p_buyer_id;

  UPDATE public.profiles
  SET balance = balance + v_seller_net,
      px_balance = px_balance + CEIL(v_seller_net)::INTEGER
  WHERE id = v_listing.seller_id;

  UPDATE public.user_poxy SET user_id = p_buyer_id WHERE id = v_listing.poxy_id;
  UPDATE public.marketplace SET status = 'sold', updated_at = NOW() WHERE id = p_listing_id;

  PERFORM public.award_xp(p_buyer_id, 20, 'TRADE', 'Marketplace purchase');
  PERFORM public.award_xp(v_listing.seller_id, 20, 'TRADE', 'Marketplace sale');

  RETURN jsonb_build_object(
    'ok', true,
    'sale_fee', v_sale_fee,
    'sale_fee_pct', v_sale_pct,
    'seller_net', v_seller_net,
    'buyer_balance', (SELECT balance FROM public.profiles WHERE id = p_buyer_id),
    'buyer_px_balance', (SELECT px_balance FROM public.profiles WHERE id = p_buyer_id)
  );
END;
$$;

-- ── Hook: craft XP bonus on Thursday ──────────────────────────
CREATE OR REPLACE FUNCTION public.craft_upgrade(
  p_user_id UUID, p_poxy_ids UUID[], p_inherit_trait JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT; v_listed INT; v_new_id UUID; v_serial TEXT;
  v_traits JSONB := '{}'::jsonb; v_hash TEXT; v_cat TEXT; v_source_id UUID;
  v_source_traits JSONB; v_inherited JSONB;
  v_src_tier TEXT; v_dst_tier TEXT;
  v_craft_xp INTEGER := 50;
  v_tier_map CONSTANT JSONB := '{"common":"uncommon","uncommon":"rare","rare":"epic","epic":"legendary","legendary":"mythic"}'::jsonb;
  v_event JSONB;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN RETURN jsonb_build_object('ok', false, 'error', 'Not authorized'); END IF;
  IF p_poxy_ids IS NULL OR array_length(p_poxy_ids, 1) <> 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Need exactly 5 POXY');
  END IF;

  SELECT count(DISTINCT poxy_tier), min(poxy_tier) INTO v_count, v_src_tier
  FROM public.user_poxy WHERE id = ANY(p_poxy_ids) AND user_id = p_user_id;
  IF v_count <> 1 THEN RETURN jsonb_build_object('ok', false, 'error', 'All 5 must be same tier'); END IF;
  IF (SELECT count(*) FROM public.user_poxy WHERE id = ANY(p_poxy_ids) AND user_id = p_user_id) <> 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Items not yours');
  END IF;

  v_dst_tier := v_tier_map ->> v_src_tier;
  IF v_dst_tier IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Cannot craft from ' || v_src_tier); END IF;

  SELECT count(*) INTO v_listed FROM public.marketplace WHERE poxy_id = ANY(p_poxy_ids) AND status = 'active';
  IF v_listed > 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'One or more items are listed'); END IF;

  IF p_inherit_trait IS NOT NULL AND p_inherit_trait <> 'null'::jsonb THEN
    v_cat := p_inherit_trait->>'category';
    v_source_id := NULLIF(p_inherit_trait->>'source_id', '')::UUID;
    IF v_source_id IS NULL OR NOT (v_source_id = ANY(p_poxy_ids)) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Inherit source must be one of the crafted POXY');
    END IF;
    SELECT traits INTO v_source_traits FROM public.user_poxy WHERE id = v_source_id AND user_id = p_user_id;
    v_inherited := v_source_traits -> v_cat;
    IF v_inherited IS NOT NULL AND v_inherited <> 'null'::jsonb THEN
      v_traits := jsonb_build_object(v_cat, v_inherited);
    END IF;
  END IF;

  DELETE FROM public.user_poxy WHERE id = ANY(p_poxy_ids) AND user_id = p_user_id;
  v_serial := 'CR-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  IF v_traits <> '{}'::jsonb THEN
    v_hash := encode(extensions.digest(convert_to(v_traits::text, 'UTF8'), 'sha256'), 'hex');
    INSERT INTO public.user_poxy (user_id, poxy_tier, serial_number, case_origin, traits, dna_hash)
    VALUES (p_user_id, v_dst_tier, v_serial, 'craft', v_traits, v_hash) RETURNING id INTO v_new_id;
  ELSE
    INSERT INTO public.user_poxy (user_id, poxy_tier, serial_number, case_origin)
    VALUES (p_user_id, v_dst_tier, v_serial, 'craft') RETURNING id INTO v_new_id;
  END IF;

  v_event := public.get_economy_event();
  IF COALESCE(v_event->>'id', '') = 'craft_thursday' THEN
    v_craft_xp := v_craft_xp + COALESCE((v_event->>'craft_xp_bonus')::INTEGER, 100);
  END IF;

  PERFORM public.award_xp(p_user_id, v_craft_xp, 'CRAFT', 'Crafted 5 ' || v_src_tier || ' → 1 ' || v_dst_tier);

  RETURN jsonb_build_object('ok', true, 'new_id', v_new_id, 'serial', v_serial,
    'from_tier', v_src_tier, 'to_tier', v_dst_tier,
    'inherited', CASE WHEN v_traits <> '{}'::jsonb THEN v_traits ELSE NULL END);
END;
$$;

-- ── Hook: Founders Friday VIP XP bonus ────────────────────────
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id     UUID,
  p_amount      INTEGER,
  p_event_type  TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_level   INTEGER;
  v_new_total   INTEGER;
  v_new_balance INTEGER;
  v_new_level   INTEGER;
  v_leveled_up  BOOLEAN := FALSE;
  v_mult        NUMERIC;
  v_final       INTEGER;
  v_event       JSONB;
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'award_xp: user required'; END IF;

  v_mult := public.get_pass_xp_multiplier(p_user_id);
  v_final := GREATEST(1, FLOOR(p_amount * v_mult)::INTEGER);

  v_event := public.get_economy_event();
  IF COALESCE(v_event->>'id', '') = 'founders_friday'
     AND public.has_vip_membership(p_user_id) THEN
    v_final := v_final + COALESCE((v_event->>'vip_xp_bonus')::INTEGER, 25);
  END IF;

  SELECT xp_level INTO v_old_level FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'award_xp: profile not found'; END IF;

  UPDATE public.profiles
  SET xp_total   = xp_total + v_final,
      xp_balance = xp_balance + v_final,
      xp_level   = FLOOR(SQRT((xp_total + v_final)::NUMERIC / 100))::INTEGER
  WHERE id = p_user_id
  RETURNING xp_total, xp_balance, xp_level
  INTO v_new_total, v_new_balance, v_new_level;

  v_leveled_up := v_new_level > COALESCE(v_old_level, 0);

  INSERT INTO public.xp_events(user_id, event_type, xp_amount, description)
  VALUES (p_user_id, p_event_type, v_final, p_description);

  PERFORM public.bump_pass_xp(p_user_id, v_final);

  RETURN jsonb_build_object(
    'xp_total', v_new_total,
    'xp_balance', v_new_balance,
    'level', v_new_level,
    'leveled_up', v_leveled_up,
    'xp_awarded', v_final,
    'pass_multiplier', v_mult
  );
END;
$$;

-- ── Economy payload: VIP + active event ───────────────────────
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
  v_std_claim TIMESTAMPTZ; v_vip_claim TIMESTAMPTZ;
  v_prof public.profiles%ROWTYPE;
  v_event JSONB;
  v_london_month DATE := date_trunc('month', NOW() AT TIME ZONE 'Europe/London')::DATE;
  v_london_today DATE := (NOW() AT TIME ZONE 'Europe/London')::DATE;
  v_london_week DATE := date_trunc('week', NOW() AT TIME ZONE 'Europe/London')::DATE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'get_player_economy: not authenticated'; END IF;
  INSERT INTO public.pity_counters(user_id) VALUES (auth.uid()) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.economy_offers(user_id) VALUES (auth.uid()) ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_prof FROM public.profiles WHERE id = auth.uid();
  v_event := public.get_economy_event();

  SELECT last_dopamine_offer_at, dopamine_offer_claimed, last_dopamine_claim_at
  INTO v_offer_at, v_claimed, v_last_claim FROM public.economy_offers WHERE user_id = auth.uid();

  SELECT standard_epic_pity, standard_leg_pity, vip_epic_pity, vip_mythic_pity
  INTO v_epic_p, v_leg_p, v_vip_epic, v_vip_myth
  FROM public.pity_counters WHERE user_id = auth.uid();

  SELECT COALESCE(open_count, 0) INTO v_leg_month
  FROM public.economy_monthly_caps WHERE cap_key = 'legend_case' AND period_month = v_month;

  SELECT last_claimed_at INTO v_std_claim FROM public.xp_shop_claims
  WHERE user_id = auth.uid() AND item_id = 'xp_free_standard';
  SELECT last_claimed_at INTO v_vip_claim FROM public.xp_shop_claims
  WHERE user_id = auth.uid() AND item_id = 'xp_free_vip';

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
    'xp_cosmetics', COALESCE(p.xp_cosmetics, '{}'::jsonb),
    'xp_shop', jsonb_build_object(
      'free_standard_ready', v_std_claim IS NULL OR v_std_claim <= NOW() - INTERVAL '1 day',
      'free_vip_ready', v_vip_claim IS NULL OR v_vip_claim <= NOW() - INTERVAL '7 days'
    ),
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
    'dopamine', v_dopamine,
    'event', v_event,
    'case_prices', jsonb_build_object(
      'standard', public.event_discounted_case_price(50, 'standard'),
      'vip', public.event_discounted_case_price(150, 'vip'),
      'genesis', 300, 'mythic', 500, 'legend', 1500
    ),
    'market_sale_fee_pct', public.market_sale_fee_pct(auth.uid()),
    'vip', jsonb_build_object(
      'active', COALESCE(p.vip_until > NOW(), FALSE),
      'vip_until', p.vip_until,
      'monthly_bonus_ready', COALESCE(p.vip_until > NOW(), FALSE)
        AND (p.vip_month_bonus_month IS NULL OR p.vip_month_bonus_month < v_london_month),
      'daily_standard_ready', COALESCE(p.vip_until > NOW(), FALSE)
        AND (p.vip_daily_claim IS NULL OR p.vip_daily_claim < v_london_today),
      'weekly_vip_ready', COALESCE(p.vip_until > NOW(), FALSE)
        AND (p.vip_weekly_claim IS NULL OR p.vip_weekly_claim < v_london_week),
      'drop_boost', CASE WHEN COALESCE(p.vip_until > NOW(), FALSE) THEN 0.05 ELSE 0 END,
      'px_package_discount', CASE WHEN COALESCE(p.vip_until > NOW(), FALSE) THEN 0.10 ELSE 0 END
    )
  ) INTO v_result
  FROM public.profiles p
  LEFT JOIN public.login_streaks ls ON ls.user_id = p.id
  LEFT JOIN public.pity_counters pc ON pc.user_id = p.id
  WHERE p.id = auth.uid();

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_economy_event() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_vip_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_vip_membership() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_vip_monthly_bonus() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_vip_daily_standard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_vip_weekly_vip_case() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dev_activate_vip() TO authenticated;

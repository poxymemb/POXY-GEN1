-- M7: Gen 1 supply caps (5000 dragons) + tier redirect + SOLD OUT tracking

CREATE TABLE IF NOT EXISTS public.gen1_supply_caps (
  poxy_tier   TEXT PRIMARY KEY,
  cap         INTEGER NOT NULL,
  minted      INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT gen1_supply_tier_check CHECK (
    poxy_tier IN ('common','uncommon','rare','epic','legendary','mythic','secret')
  ),
  CONSTRAINT gen1_supply_nonneg CHECK (minted >= 0 AND cap > 0)
);

ALTER TABLE public.gen1_supply_caps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gen1_supply_read" ON public.gen1_supply_caps;
CREATE POLICY "gen1_supply_read" ON public.gen1_supply_caps
  FOR SELECT USING (true);

INSERT INTO public.gen1_supply_caps (poxy_tier, cap, minted) VALUES
  ('common',    2500, 0),
  ('uncommon',  1250, 0),
  ('rare',       625, 0),
  ('epic',       375, 0),
  ('legendary',  175, 0),
  ('mythic',      65, 0),
  ('secret',      10, 0)
ON CONFLICT (poxy_tier) DO NOTHING;

-- Backfill minted from existing collection (core tiers only)
UPDATE public.gen1_supply_caps g
SET minted = LEAST(g.cap, COALESCE(c.cnt, 0)),
    updated_at = NOW()
FROM (
  SELECT lower(poxy_tier) AS tier, COUNT(*)::INTEGER AS cnt
  FROM public.user_poxy
  WHERE lower(poxy_tier) IN (
    'common','uncommon','rare','epic','legendary','mythic','secret'
  )
  GROUP BY 1
) c
WHERE g.poxy_tier = c.tier;

CREATE OR REPLACE FUNCTION public.is_gen1_core_tier(p_tier TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(COALESCE(p_tier, '')) = ANY (ARRAY[
    'common','uncommon','rare','epic','legendary','mythic','secret'
  ]::text[]);
$$;

CREATE OR REPLACE FUNCTION public.gen1_tier_has_capacity(p_tier TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT minted < cap FROM public.gen1_supply_caps WHERE poxy_tier = lower(p_tier)),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.apply_gen1_supply_redirect(p_tier TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order CONSTANT TEXT[] := ARRAY[
    'common','uncommon','rare','epic','legendary','mythic','secret'
  ];
  v_start INTEGER;
  v_try   TEXT;
BEGIN
  IF NOT public.is_gen1_core_tier(p_tier) THEN
    RETURN p_tier;
  END IF;

  v_start := array_position(v_order, lower(p_tier));
  IF v_start IS NULL THEN RETURN p_tier; END IF;

  FOR i IN v_start..array_length(v_order, 1) LOOP
    v_try := v_order[i];
    IF public.gen1_tier_has_capacity(v_try) THEN
      RETURN v_try;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_gen1_mint(p_tier TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_gen1_core_tier(p_tier) THEN RETURN; END IF;

  UPDATE public.gen1_supply_caps
  SET minted = minted + 1, updated_at = NOW()
  WHERE poxy_tier = lower(p_tier)
    AND minted < cap;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'gen1_supply: tier % cap reached', p_tier;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_gen1_supply_status()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows   JSONB;
  v_total_cap INTEGER;
  v_total_minted INTEGER;
  v_leg_rem INTEGER;
BEGIN
  SELECT
    COALESCE(SUM(cap), 0),
    COALESCE(SUM(minted), 0),
    COALESCE(MAX(cap - minted) FILTER (WHERE poxy_tier = 'legendary'), 0)
  INTO v_total_cap, v_total_minted, v_leg_rem
  FROM public.gen1_supply_caps;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'tier', g.poxy_tier,
      'cap', g.cap,
      'minted', g.minted,
      'remaining', GREATEST(0, g.cap - g.minted),
      'sold_out', g.minted >= g.cap,
      'pct', ROUND((g.minted::NUMERIC / NULLIF(g.cap, 0)) * 100, 1)
    ) ORDER BY CASE g.poxy_tier
      WHEN 'common' THEN 1 WHEN 'uncommon' THEN 2 WHEN 'rare' THEN 3
      WHEN 'epic' THEN 4 WHEN 'legendary' THEN 5 WHEN 'mythic' THEN 6
      WHEN 'secret' THEN 7 ELSE 99 END
  ), '[]'::jsonb)
  INTO v_rows
  FROM public.gen1_supply_caps g;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'total_cap', v_total_cap,
    'total_minted', v_total_minted,
    'total_remaining', GREATEST(0, v_total_cap - v_total_minted),
    'fully_exhausted', v_total_minted >= v_total_cap,
    'legendary_remaining', v_leg_rem,
    'legendary_scarcity', v_leg_rem > 0 AND v_leg_rem <= 100,
    'tiers', v_rows
  );
END;
$$;

-- Pass tier drops respect supply
CREATE OR REPLACE FUNCTION public.grant_pass_tier_drop(p_user_id UUID, p_tier TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id     UUID;
  v_serial TEXT;
  v_tier   TEXT;
BEGIN
  v_tier := public.apply_gen1_supply_redirect(lower(p_tier));
  IF v_tier IS NULL THEN
    RAISE EXCEPTION 'Gen 1 supply exhausted';
  END IF;

  v_serial := 'PS-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  INSERT INTO public.user_poxy (user_id, poxy_tier, serial_number, case_origin)
  VALUES (p_user_id, v_tier, v_serial, 'pass_reward')
  RETURNING id INTO v_id;

  PERFORM public.record_gen1_mint(v_tier);
  RETURN v_id;
END;
$$;

-- ── Standard case (with M6c event hooks) ──────────────────────
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
  v_tier := public.apply_gen1_supply_redirect(v_tier);
  IF v_tier IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Gen 1 supply exhausted — marketplace only');
  END IF;

  v_serial := 'PX-' || upper(substring(v_round.result_hash, 9, 6));

  INSERT INTO public.user_poxy (user_id, poxy_tier, serial_number, case_origin, rng_round_id)
  VALUES (v_uid, v_tier, v_serial, 'standard', p_round_id)
  RETURNING id INTO v_poxy_id;

  PERFORM public.record_gen1_mint(v_tier);

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

-- ── Dopamine standard case ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.open_dopamine_standard_case_v3(p_round_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_balance NUMERIC; v_cost NUMERIC := 25;
  v_round public.rng_rounds%ROWTYPE;
  v_uint BIGINT; v_float FLOAT; v_tier TEXT; v_serial TEXT; v_poxy_id UUID;
  v_offer_at TIMESTAMPTZ; v_claimed BOOLEAN;
  v_window INTERVAL := INTERVAL '10 minutes';
  v_epic_p INTEGER := 0; v_leg_p INTEGER := 0; v_opens INTEGER := 0;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated'); END IF;

  SELECT last_dopamine_offer_at, dopamine_offer_claimed INTO v_offer_at, v_claimed
  FROM public.economy_offers WHERE user_id = v_uid;
  IF v_offer_at IS NULL OR COALESCE(v_claimed, FALSE) OR v_offer_at <= NOW() - v_window THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Dopamine offer expired or unavailable');
  END IF;

  SELECT * INTO v_round FROM public.rng_rounds WHERE id = p_round_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Round not found'); END IF;
  IF v_round.user_id IS DISTINCT FROM v_uid THEN RETURN jsonb_build_object('ok', false, 'error', 'Round not yours'); END IF;
  IF v_round.status != 'revealed' THEN RETURN jsonb_build_object('ok', false, 'error', 'Round not revealed'); END IF;
  IF EXISTS (SELECT 1 FROM public.user_poxy WHERE rng_round_id = p_round_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Round already used');
  END IF;

  SELECT standard_epic_pity, standard_leg_pity, standard_opens
  INTO v_epic_p, v_leg_p, v_opens FROM public.pity_counters WHERE user_id = v_uid;

  SELECT balance INTO v_balance FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_cost THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance');
  END IF;

  UPDATE public.profiles SET balance = balance - v_cost, px_balance = GREATEST(0, px_balance - v_cost::INTEGER) WHERE id = v_uid;

  v_uint := (('x' || substring(v_round.result_hash, 1, 8))::bit(32)::int::bigint + 4294967296) % 4294967296;
  v_float := v_uint / 4294967296.0;
  v_float := public.apply_drop_rate_boosts(v_float, v_uid, FALSE);
  v_tier := public.resolve_standard_tier(v_float, v_epic_p, v_leg_p, v_opens);
  v_tier := public.apply_gen1_supply_redirect(v_tier);
  IF v_tier IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Gen 1 supply exhausted — marketplace only');
  END IF;

  v_serial := 'PX-' || upper(substring(v_round.result_hash, 9, 6));

  INSERT INTO public.user_poxy (user_id, poxy_tier, serial_number, case_origin, rng_round_id)
  VALUES (v_uid, v_tier, v_serial, 'standard', p_round_id) RETURNING id INTO v_poxy_id;

  PERFORM public.record_gen1_mint(v_tier);

  INSERT INTO public.case_open_events (user_id, case_type, poxy_tier, flash_active)
  VALUES (v_uid, 'standard', v_tier, true);

  UPDATE public.economy_offers
  SET dopamine_offer_claimed = TRUE, last_dopamine_claim_at = NOW(), updated_at = NOW()
  WHERE user_id = v_uid;

  PERFORM public.bump_standard_pity();
  PERFORM public.award_xp(v_uid, 10, 'CASE_OPEN', 'Dopamine standard case');
  PERFORM public.award_drop_xp_bonus(v_uid, v_tier);
  IF v_tier IN ('epic', 'legendary', 'mythic') THEN PERFORM public.reset_standard_epic_pity(); END IF;

  RETURN jsonb_build_object(
    'ok', true, 'tier', v_tier, 'serial', v_serial, 'poxy_id', v_poxy_id,
    'balance', (SELECT balance FROM public.profiles WHERE id = v_uid),
    'px_balance', (SELECT px_balance FROM public.profiles WHERE id = v_uid),
    'round_id', p_round_id, 'dopamine', true, 'cost', v_cost
  );
END;
$$;

-- ── Premium cases ─────────────────────────────────────────────
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

  v_tier := public.apply_gen1_supply_redirect(v_tier);
  IF v_tier IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Gen 1 supply exhausted — marketplace only');
  END IF;

  v_serial := v_prefix || upper(substring(v_round.result_hash, 9, 6));

  INSERT INTO public.user_poxy (user_id, poxy_tier, serial_number, case_origin, rng_round_id)
  VALUES (v_uid, v_tier, v_serial, v_origin, p_round_id)
  RETURNING id INTO v_poxy_id;

  PERFORM public.record_gen1_mint(v_tier);

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

-- ── Craft mints count toward supply ───────────────────────────
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

  v_dst_tier := public.apply_gen1_supply_redirect(v_dst_tier);
  IF v_dst_tier IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Gen 1 supply exhausted — cannot craft');
  END IF;

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

  PERFORM public.record_gen1_mint(v_dst_tier);

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

-- Extend economy payload
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
  v_event JSONB;
  v_gen1 JSONB;
  v_london_month DATE := date_trunc('month', NOW() AT TIME ZONE 'Europe/London')::DATE;
  v_london_today DATE := (NOW() AT TIME ZONE 'Europe/London')::DATE;
  v_london_week DATE := date_trunc('week', NOW() AT TIME ZONE 'Europe/London')::DATE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'get_player_economy: not authenticated'; END IF;
  INSERT INTO public.pity_counters(user_id) VALUES (auth.uid()) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.economy_offers(user_id) VALUES (auth.uid()) ON CONFLICT (user_id) DO NOTHING;

  v_event := public.get_economy_event();
  v_gen1 := public.get_gen1_supply_status();

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
    'gen1_supply', v_gen1,
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

GRANT EXECUTE ON FUNCTION public.get_gen1_supply_status() TO anon, authenticated;

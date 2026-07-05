-- ══════════════════════════════════════════════════════════════
-- Migration: economy_m1_core — Phase 1 (M0 completion)
-- Pity hard/soft, full login streak, burn 20/day, craft 5→1 all tiers
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS case_tokens JSONB NOT NULL DEFAULT '{"standard":0,"vip":0,"genesis":0,"mythic":0,"legend":0}'::jsonb;

-- ── Tier resolver with standard pity ──────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_standard_tier(
  p_float      FLOAT,
  p_epic_pity  INTEGER,
  p_leg_pity   INTEGER,
  p_opens      INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_float FLOAT := p_float;
  v_tier  TEXT;
BEGIN
  IF COALESCE(p_leg_pity, 0) >= 79 THEN
    RETURN 'legendary';
  END IF;

  IF COALESCE(p_epic_pity, 0) >= 29 THEN
    RETURN 'epic';
  END IF;

  IF COALESCE(p_opens, 0) >= 70 THEN
    v_float := GREATEST(0.0, v_float - LEAST(0.20, (p_opens - 70) * 0.004)::FLOAT);
  END IF;

  v_tier := CASE
    WHEN v_float < 0.600 THEN 'common'
    WHEN v_float < 0.850 THEN 'uncommon'
    WHEN v_float < 0.950 THEN 'rare'
    WHEN v_float < 0.990 THEN 'epic'
    WHEN v_float < 0.999 THEN 'legendary'
    ELSE 'mythic'
  END;

  RETURN v_tier;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_drop_xp_bonus(
  p_user_id UUID,
  p_tier    TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_tier = 'epic' THEN
    PERFORM public.award_xp(p_user_id, 25, 'DROP_BONUS', 'Epic drop bonus');
  ELSIF p_tier = 'legendary' THEN
    PERFORM public.award_xp(p_user_id, 100, 'DROP_BONUS', 'Legendary drop bonus');
  ELSIF p_tier = 'mythic' THEN
    PERFORM public.award_xp(p_user_id, 500, 'DROP_BONUS', 'Mythic drop bonus');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_case_token(
  p_user_id   UUID,
  p_case_type TEXT,
  p_amount    INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tokens JSONB;
  v_key    TEXT;
BEGIN
  v_key := CASE p_case_type
    WHEN 'standard' THEN 'standard'
    WHEN 'vip'       THEN 'vip'
    WHEN 'genesis'   THEN 'genesis'
    WHEN 'mythic'    THEN 'mythic'
    WHEN 'legend'    THEN 'legend'
    ELSE NULL
  END;
  IF v_key IS NULL OR p_amount <= 0 THEN RETURN; END IF;

  SELECT case_tokens INTO v_tokens FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  v_tokens := COALESCE(v_tokens, '{}'::jsonb)
    || jsonb_build_object(v_key, COALESCE((v_tokens->>v_key)::INTEGER, 0) + p_amount);
  UPDATE public.profiles SET case_tokens = v_tokens WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.open_standard_case_v3(p_round_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_balance   NUMERIC;
  v_cost      NUMERIC := 50;
  v_round     public.rng_rounds%ROWTYPE;
  v_uint      BIGINT;
  v_float     FLOAT;
  v_tier      TEXT;
  v_serial    TEXT;
  v_poxy_id   UUID;
  v_epic_p    INTEGER := 0;
  v_leg_p     INTEGER := 0;
  v_opens     INTEGER := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_round FROM public.rng_rounds WHERE id = p_round_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Round not found'); END IF;
  IF v_round.user_id IS DISTINCT FROM v_uid THEN RETURN jsonb_build_object('ok', false, 'error', 'Round not yours'); END IF;
  IF v_round.status != 'revealed' THEN RETURN jsonb_build_object('ok', false, 'error', 'Round not revealed'); END IF;
  IF EXISTS (SELECT 1 FROM public.user_poxy WHERE rng_round_id = p_round_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Round already used');
  END IF;

  SELECT standard_epic_pity, standard_leg_pity, standard_opens
  INTO v_epic_p, v_leg_p, v_opens
  FROM public.pity_counters WHERE user_id = v_uid;

  SELECT balance INTO v_balance FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Profile not found'); END IF;
  IF v_balance < v_cost THEN RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance'); END IF;

  UPDATE public.profiles
  SET balance = balance - v_cost, px_balance = GREATEST(0, px_balance - v_cost::INTEGER)
  WHERE id = v_uid;

  v_uint  := (('x' || substring(v_round.result_hash, 1, 8))::bit(32)::int::bigint + 4294967296) % 4294967296;
  v_float := v_uint / 4294967296.0;
  v_tier  := public.resolve_standard_tier(v_float, v_epic_p, v_leg_p, v_opens);
  v_serial := 'PX-' || upper(substring(v_round.result_hash, 9, 6));

  INSERT INTO public.user_poxy (user_id, poxy_tier, serial_number, case_origin, rng_round_id)
  VALUES (v_uid, v_tier, v_serial, 'standard', p_round_id) RETURNING id INTO v_poxy_id;

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
    'balance', (SELECT balance FROM public.profiles WHERE id = v_uid),
    'px_balance', (SELECT px_balance FROM public.profiles WHERE id = v_uid),
    'round_id', p_round_id, 'commit_hash', v_round.commit_hash, 'result_hash', v_round.result_hash,
    'pity_epic', COALESCE(v_epic_p, 0) + 1, 'pity_leg', COALESCE(v_leg_p, 0) + 1
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
  v_tier := public.resolve_standard_tier(v_float, v_epic_p, v_leg_p, v_opens);
  v_serial := 'PX-' || upper(substring(v_round.result_hash, 9, 6));

  INSERT INTO public.user_poxy (user_id, poxy_tier, serial_number, case_origin, rng_round_id)
  VALUES (v_uid, v_tier, v_serial, 'standard', p_round_id) RETURNING id INTO v_poxy_id;

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

-- ── Full login streak (RETENTION section) ─────────────────────
CREATE OR REPLACE FUNCTION public.claim_daily_login()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak    INTEGER;
  v_last      DATE;
  v_px        INTEGER := 0;
  v_xp        INTEGER := 0;
  v_xp_bonus  INTEGER := 0;
  v_today     DATE := CURRENT_DATE;
  v_cases     JSONB := '{}'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'claim_daily_login: not authenticated'; END IF;

  INSERT INTO public.login_streaks(user_id, current_streak, last_login_date)
  VALUES (auth.uid(), 0, NULL) ON CONFLICT (user_id) DO NOTHING;

  SELECT current_streak, last_login_date INTO v_streak, v_last
  FROM public.login_streaks WHERE user_id = auth.uid();

  IF v_last = v_today THEN RAISE EXCEPTION 'ALREADY_CLAIMED_TODAY'; END IF;

  IF v_last IS NULL OR v_last < v_today - INTERVAL '1 day' THEN v_streak := 1;
  ELSE v_streak := v_streak + 1; END IF;

  v_xp := 50;
  CASE v_streak
    WHEN 1   THEN v_px := 50;  v_xp_bonus := 50;
    WHEN 3   THEN v_px := 0;   v_xp_bonus := 200; PERFORM public.grant_case_token(auth.uid(), 'standard', 1);
    WHEN 7   THEN v_px := 500; v_xp_bonus := 450; PERFORM public.grant_case_token(auth.uid(), 'vip', 1);
    WHEN 14  THEN v_px := 1000; v_xp_bonus := 500; PERFORM public.grant_case_token(auth.uid(), 'genesis', 1);
    WHEN 30  THEN v_px := 2000; v_xp_bonus := 1950; PERFORM public.grant_case_token(auth.uid(), 'legend', 1);
    WHEN 60  THEN v_px := 5000; v_xp_bonus := 2000; PERFORM public.grant_case_token(auth.uid(), 'mythic', 1);
    WHEN 100 THEN v_px := 10000; v_xp_bonus := 5000; PERFORM public.grant_case_token(auth.uid(), 'legend', 1);
    ELSE v_px := 50;
  END CASE;

  v_xp := v_xp + v_xp_bonus;

  UPDATE public.login_streaks
  SET current_streak = v_streak, last_login_date = v_today,
      total_logins = total_logins + 1, longest_streak = GREATEST(longest_streak, v_streak),
      updated_at = NOW()
  WHERE user_id = auth.uid();

  IF v_px > 0 THEN
    UPDATE public.profiles SET px_balance = px_balance + v_px, balance = balance + v_px WHERE id = auth.uid();
  END IF;

  PERFORM public.award_xp(auth.uid(), v_xp, 'DAILY_LOGIN', 'Day ' || v_streak || ' streak');

  SELECT case_tokens INTO v_cases FROM public.profiles WHERE id = auth.uid();

  RETURN jsonb_build_object(
    'streak', v_streak, 'px_reward', v_px, 'xp_reward', v_xp,
    'day', v_streak, 'case_tokens', COALESCE(v_cases, '{}'::jsonb)
  );
END;
$$;

-- ── Burn daily cap (20/day) ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.burn_poxy_pc(p_poxy_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID; v_tier TEXT; v_listed BOOLEAN; v_payout INTEGER; v_new_balance NUMERIC;
  v_dropped_at TIMESTAMPTZ; v_burns_today INTEGER;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN RETURN jsonb_build_object('ok', false, 'error', 'Not authorized'); END IF;

  SELECT count(*)::INTEGER INTO v_burns_today
  FROM public.burn_log WHERE user_id = p_user_id AND burned_at >= CURRENT_DATE;
  IF v_burns_today >= 20 THEN RETURN jsonb_build_object('ok', false, 'error', 'Max 20 burns per day'); END IF;

  SELECT user_id, poxy_tier, dropped_at INTO v_owner, v_tier, v_dropped_at
  FROM public.user_poxy WHERE id = p_poxy_id FOR UPDATE;
  IF v_owner IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'POXY not found'); END IF;
  IF v_owner <> p_user_id THEN RETURN jsonb_build_object('ok', false, 'error', 'Not your POXY'); END IF;
  IF v_dropped_at IS NOT NULL AND v_dropped_at > NOW() - INTERVAL '24 hours' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Dragon must be 24h old before burn');
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.marketplace WHERE poxy_id = p_poxy_id AND status = 'active') INTO v_listed;
  IF v_listed THEN RETURN jsonb_build_object('ok', false, 'error', 'Cannot burn a listed POXY'); END IF;

  v_payout := CASE v_tier
    WHEN 'common' THEN 2 WHEN 'uncommon' THEN 8 WHEN 'rare' THEN 25
    WHEN 'epic' THEN 100 WHEN 'legendary' THEN 500 WHEN 'mythic' THEN 2500
    WHEN 'obsidian' THEN 8 WHEN 'cursed' THEN 25 WHEN 'souvenir' THEN 50
    WHEN 'stellar' THEN 100 WHEN 'diamond' THEN 500 WHEN 'secret' THEN 2500 ELSE 2 END;

  DELETE FROM public.user_poxy WHERE id = p_poxy_id;
  UPDATE public.profiles SET balance = balance + v_payout, px_balance = px_balance + v_payout
  WHERE id = p_user_id RETURNING balance INTO v_new_balance;
  INSERT INTO public.burn_log (user_id, poxy_tier) VALUES (p_user_id, v_tier);
  PERFORM public.award_xp(p_user_id, 5, 'BURN', 'Burned ' || v_tier);

  RETURN jsonb_build_object('ok', true, 'payout', v_payout, 'tier', v_tier,
    'new_balance', v_new_balance, 'px_balance', (SELECT px_balance FROM public.profiles WHERE id = p_user_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.burn_poxy_bulk_pc(p_poxy_ids UUID[], p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER := 0; v_count INTEGER := 0; v_rec RECORD; v_new_balance NUMERIC; v_payout INTEGER;
  v_burns_today INTEGER; v_would_be INTEGER;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN RETURN jsonb_build_object('ok', false, 'error', 'Not authorized'); END IF;
  IF p_poxy_ids IS NULL OR array_length(p_poxy_ids, 1) IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'No items'); END IF;
  IF array_length(p_poxy_ids, 1) > 20 THEN RETURN jsonb_build_object('ok', false, 'error', 'Max 20 burns per batch'); END IF;

  SELECT count(*)::INTEGER INTO v_burns_today FROM public.burn_log WHERE user_id = p_user_id AND burned_at >= CURRENT_DATE;
  v_would_be := v_burns_today + array_length(p_poxy_ids, 1);
  IF v_would_be > 20 THEN RETURN jsonb_build_object('ok', false, 'error', 'Max 20 burns per day'); END IF;

  FOR v_rec IN
    SELECT up.id, up.poxy_tier, up.dropped_at FROM public.user_poxy up
    WHERE up.id = ANY(p_poxy_ids) AND up.user_id = p_user_id FOR UPDATE
  LOOP
    IF v_rec.dropped_at IS NOT NULL AND v_rec.dropped_at > NOW() - INTERVAL '24 hours' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'All dragons must be 24h old before burn');
    END IF;
    IF EXISTS (SELECT 1 FROM public.marketplace m WHERE m.poxy_id = v_rec.id AND m.status = 'active') THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Cannot burn listed POXY');
    END IF;
    v_payout := CASE v_rec.poxy_tier
      WHEN 'common' THEN 2 WHEN 'uncommon' THEN 8 WHEN 'rare' THEN 25
      WHEN 'epic' THEN 100 WHEN 'legendary' THEN 500 WHEN 'mythic' THEN 2500 ELSE 2 END;
    DELETE FROM public.user_poxy WHERE id = v_rec.id;
    INSERT INTO public.burn_log (user_id, poxy_tier) VALUES (p_user_id, v_rec.poxy_tier);
    v_total := v_total + v_payout; v_count := v_count + 1;
  END LOOP;

  IF v_count = 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Nothing to burn'); END IF;

  UPDATE public.profiles SET balance = balance + v_total, px_balance = px_balance + v_total
  WHERE id = p_user_id RETURNING balance INTO v_new_balance;
  PERFORM public.award_xp(p_user_id, 5 * v_count, 'BURN', 'Bulk burn x' || v_count);

  RETURN jsonb_build_object('ok', true, 'payout', v_total, 'count', v_count,
    'new_balance', v_new_balance, 'px_balance', (SELECT px_balance FROM public.profiles WHERE id = p_user_id));
END;
$$;

-- ── Craft full tier chain ───────────────────────────────────────
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
  v_tier_map CONSTANT JSONB := '{"common":"uncommon","uncommon":"rare","rare":"epic","epic":"legendary","legendary":"mythic"}'::jsonb;
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

  PERFORM public.award_xp(p_user_id, 50, 'CRAFT', 'Crafted 5 ' || v_src_tier || ' → 1 ' || v_dst_tier);

  RETURN jsonb_build_object('ok', true, 'new_id', v_new_id, 'serial', v_serial,
    'from_tier', v_src_tier, 'to_tier', v_dst_tier,
    'inherited', CASE WHEN v_traits <> '{}'::jsonb THEN v_traits ELSE NULL END);
END;
$$;

-- get_player_economy: add case_tokens + pity labels
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
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'get_player_economy: not authenticated'; END IF;
  INSERT INTO public.pity_counters(user_id) VALUES (auth.uid()) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.economy_offers(user_id) VALUES (auth.uid()) ON CONFLICT (user_id) DO NOTHING;

  SELECT last_dopamine_offer_at, dopamine_offer_claimed, last_dopamine_claim_at
  INTO v_offer_at, v_claimed, v_last_claim FROM public.economy_offers WHERE user_id = auth.uid();

  SELECT standard_epic_pity, standard_leg_pity INTO v_epic_p, v_leg_p
  FROM public.pity_counters WHERE user_id = auth.uid();

  v_dopamine := jsonb_build_object('price', 25, 'active',
    v_offer_at IS NOT NULL AND NOT COALESCE(v_claimed, FALSE) AND v_offer_at > NOW() - v_window,
    'expires_at', CASE WHEN v_offer_at IS NOT NULL AND NOT COALESCE(v_claimed, FALSE)
      THEN to_jsonb(v_offer_at + v_window) ELSE 'null'::jsonb END,
    'cooldown_until', CASE WHEN v_last_claim IS NOT NULL AND v_last_claim > NOW() - v_cooldown
      THEN to_jsonb(v_last_claim + v_cooldown) ELSE 'null'::jsonb END,
    'can_start', v_last_claim IS NULL OR v_last_claim <= NOW() - v_cooldown);

  SELECT jsonb_build_object(
    'px_balance', GREATEST(COALESCE(p.px_balance, 0), FLOOR(COALESCE(p.balance, 0))::INTEGER),
    'xp_total', p.xp_total, 'xp_balance', p.xp_balance, 'xp_level', p.xp_level,
    'xp_to_next', (POWER(p.xp_level + 1, 2) * 100) - p.xp_total,
    'xp_progress', CASE WHEN (POWER(p.xp_level + 1, 2) - POWER(p.xp_level, 2)) * 100 = 0 THEN 0
      ELSE (p.xp_total - POWER(p.xp_level, 2) * 100)::NUMERIC / ((POWER(p.xp_level + 1, 2) - POWER(p.xp_level, 2)) * 100) END,
    'streak', COALESCE(ls.current_streak, 0), 'last_login', ls.last_login_date,
    'case_tokens', COALESCE(p.case_tokens, '{}'::jsonb),
    'pity', jsonb_build_object(
      'standard_opens', COALESCE(pc.standard_opens, 0),
      'standard_epic', COALESCE(v_epic_p, 0),
      'standard_leg', COALESCE(v_leg_p, 0),
      'epic_hard_at', 30, 'leg_hard_at', 80, 'soft_from', 70,
      'epic_until', GREATEST(0, 30 - COALESCE(v_epic_p, 0)),
      'leg_until', GREATEST(0, 80 - COALESCE(v_leg_p, 0)),
      'vip_epic', COALESCE(pc.vip_epic_pity, 0),
      'vip_mythic', COALESCE(pc.vip_mythic_pity, 0)
    ),
    'dopamine', v_dopamine
  ) INTO v_result
  FROM public.profiles p
  LEFT JOIN public.login_streaks ls ON ls.user_id = p.id
  LEFT JOIN public.pity_counters pc ON pc.user_id = p.id
  WHERE p.id = auth.uid();
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_standard_tier(FLOAT,INTEGER,INTEGER,INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_case_token(UUID,TEXT,INTEGER) TO authenticated;

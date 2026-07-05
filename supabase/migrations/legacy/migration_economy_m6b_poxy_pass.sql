-- M6b: POXY PASS — 30-day season battle pass (Stripe deferred; PX purchase for test)

ALTER TABLE public.user_poxy
  DROP CONSTRAINT IF EXISTS user_poxy_case_origin_check;
ALTER TABLE public.user_poxy
  ADD CONSTRAINT user_poxy_case_origin_check
  CHECK (case_origin = ANY (ARRAY[
    'standard', 'vip', 'genesis', 'mythic', 'legend', 'legacy', 'craft', 'pass_reward'
  ]::text[]));

CREATE TABLE IF NOT EXISTS public.poxy_pass_seasons (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  starts_at  TIMESTAMPTZ NOT NULL,
  ends_at    TIMESTAMPTZ NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.poxy_pass_progress (
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season_id      TEXT NOT NULL REFERENCES public.poxy_pass_seasons(id) ON DELETE CASCADE,
  pass_xp        INTEGER NOT NULL DEFAULT 0,
  premium_until  TIMESTAMPTZ,
  claimed_free   JSONB NOT NULL DEFAULT '[]'::jsonb,
  claimed_premium JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, season_id)
);

CREATE INDEX IF NOT EXISTS poxy_pass_progress_season_idx
  ON public.poxy_pass_progress (season_id, pass_xp DESC);

ALTER TABLE public.poxy_pass_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poxy_pass_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "poxy_pass_seasons_read" ON public.poxy_pass_seasons;
CREATE POLICY "poxy_pass_seasons_read" ON public.poxy_pass_seasons
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "own_poxy_pass_progress" ON public.poxy_pass_progress;
CREATE POLICY "own_poxy_pass_progress" ON public.poxy_pass_progress
  FOR SELECT USING (user_id = auth.uid());

INSERT INTO public.poxy_pass_seasons (id, name, starts_at, ends_at, active)
VALUES (
  'gen_2026_06',
  'Gen China Magic — Season I',
  date_trunc('month', NOW()),
  date_trunc('month', NOW()) + INTERVAL '30 days',
  TRUE
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, ends_at = GREATEST(poxy_pass_seasons.ends_at, EXCLUDED.ends_at), active = TRUE;

CREATE OR REPLACE FUNCTION public.get_active_pass_season()
RETURNS public.poxy_pass_seasons
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.poxy_pass_seasons
  WHERE active = TRUE AND starts_at <= NOW() AND ends_at > NOW()
  ORDER BY starts_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.pass_level_from_xp(p_pass_xp INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LEAST(50, GREATEST(0, FLOOR(SQRT(GREATEST(p_pass_xp, 0)::NUMERIC / 100))::INTEGER));
$$;

CREATE OR REPLACE FUNCTION public.has_active_premium_pass(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season public.poxy_pass_seasons%ROWTYPE;
  v_until  TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_season FROM public.get_active_pass_season();
  IF NOT FOUND THEN RETURN FALSE; END IF;
  SELECT premium_until INTO v_until
  FROM public.poxy_pass_progress
  WHERE user_id = p_user_id AND season_id = v_season.id;
  RETURN v_until IS NOT NULL AND v_until > NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pass_xp_multiplier(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN public.has_active_premium_pass(p_user_id) THEN 1.5 ELSE 1.0 END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_pass_progress(p_user_id UUID, p_season_id TEXT)
RETURNS public.poxy_pass_progress
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.poxy_pass_progress%ROWTYPE;
BEGIN
  INSERT INTO public.poxy_pass_progress (user_id, season_id)
  VALUES (p_user_id, p_season_id)
  ON CONFLICT (user_id, season_id) DO NOTHING;

  SELECT * INTO v_row
  FROM public.poxy_pass_progress
  WHERE user_id = p_user_id AND season_id = p_season_id;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.bump_pass_xp(p_user_id UUID, p_amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season public.poxy_pass_seasons%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN RETURN; END IF;
  SELECT * INTO v_season FROM public.get_active_pass_season();
  IF NOT FOUND THEN RETURN; END IF;
  PERFORM public.ensure_pass_progress(p_user_id, v_season.id);
  UPDATE public.poxy_pass_progress
  SET pass_xp = pass_xp + p_amount, updated_at = NOW()
  WHERE user_id = p_user_id AND season_id = v_season.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_pass_tier_drop(p_user_id UUID, p_tier TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_serial TEXT;
BEGIN
  v_serial := 'PS-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  INSERT INTO public.user_poxy (user_id, poxy_tier, serial_number, case_origin)
  VALUES (p_user_id, lower(p_tier), v_serial, 'pass_reward')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_pass_reward(
  p_user_id UUID,
  p_level   INTEGER,
  p_track   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cosmetics JSONB;
BEGIN
  IF p_track = 'free' THEN
    CASE p_level
      WHEN 1  THEN PERFORM public.award_xp(p_user_id, 100, 'PASS_REWARD', 'Free L1');
      WHEN 5  THEN PERFORM public.grant_case_token(p_user_id, 'standard', 1);
      WHEN 10 THEN PERFORM public.award_xp(p_user_id, 200, 'PASS_REWARD', 'Free L10');
      WHEN 15 THEN PERFORM public.grant_pass_tier_drop(p_user_id, 'uncommon');
      WHEN 20 THEN PERFORM public.award_xp(p_user_id, 500, 'PASS_REWARD', 'Free L20');
      WHEN 25 THEN PERFORM public.grant_pass_tier_drop(p_user_id, 'rare');
      WHEN 30 THEN PERFORM public.grant_pass_tier_drop(p_user_id, 'epic');
      WHEN 40 THEN PERFORM public.award_xp(p_user_id, 1000, 'PASS_REWARD', 'Free L40');
      WHEN 50 THEN PERFORM public.grant_case_token(p_user_id, 'vip', 1);
      ELSE RETURN jsonb_build_object('ok', false, 'error', 'Unknown free reward');
    END CASE;
  ELSIF p_track = 'premium' THEN
    CASE p_level
      WHEN 1 THEN
        UPDATE public.profiles SET px_balance = px_balance + 100, balance = balance + 100 WHERE id = p_user_id;
        v_cosmetics := '{"pass_pioneer_frame":true}'::jsonb;
      WHEN 5 THEN
        PERFORM public.grant_case_token(p_user_id, 'standard', 1);
        UPDATE public.profiles SET px_balance = px_balance + 200, balance = balance + 200 WHERE id = p_user_id;
      WHEN 10 THEN
        PERFORM public.grant_case_token(p_user_id, 'vip', 1);
        UPDATE public.profiles SET px_balance = px_balance + 300, balance = balance + 300 WHERE id = p_user_id;
      WHEN 15 THEN PERFORM public.grant_case_token(p_user_id, 'genesis', 1);
      WHEN 20 THEN
        UPDATE public.profiles SET px_balance = px_balance + 1000, balance = balance + 1000 WHERE id = p_user_id;
        v_cosmetics := '{"pass_exclusive_badge":true}'::jsonb;
      WHEN 25 THEN PERFORM public.grant_case_token(p_user_id, 'mythic', 1);
      WHEN 30 THEN
        PERFORM public.grant_pass_tier_drop(p_user_id, 'legendary');
        UPDATE public.profiles SET px_balance = px_balance + 2000, balance = balance + 2000 WHERE id = p_user_id;
      WHEN 40 THEN
        UPDATE public.profiles SET px_balance = px_balance + 3000, balance = balance + 3000 WHERE id = p_user_id;
        v_cosmetics := '{"pass_animated_bg":true}'::jsonb;
      WHEN 50 THEN
        PERFORM public.grant_case_token(p_user_id, 'mythic', 1);
        v_cosmetics := '{"pass_mythic_exclusive":true,"pass_gold_glow":true}'::jsonb;
      ELSE RETURN jsonb_build_object('ok', false, 'error', 'Unknown premium reward');
    END CASE;
    IF v_cosmetics IS NOT NULL THEN
      UPDATE public.profiles
      SET achievement_cosmetics = COALESCE(achievement_cosmetics, '{}'::jsonb) || v_cosmetics
      WHERE id = p_user_id;
    END IF;
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid track');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

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
BEGIN
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'award_xp: user required'; END IF;

  v_mult := public.get_pass_xp_multiplier(p_user_id);
  v_final := GREATEST(1, FLOOR(p_amount * v_mult)::INTEGER);

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

CREATE OR REPLACE FUNCTION public.get_poxy_pass_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_season public.poxy_pass_seasons%ROWTYPE;
  v_prog   public.poxy_pass_progress%ROWTYPE;
  v_level  INTEGER;
  v_tiers  INTEGER[] := ARRAY[1,5,10,15,20,25,30,40,50];
  v_tier   INTEGER;
  v_rows   JSONB := '[]'::jsonb;
  v_free_l TEXT;
  v_prem_l TEXT;
  v_premium BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_season FROM public.get_active_pass_season();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No active season');
  END IF;

  v_prog := public.ensure_pass_progress(v_uid, v_season.id);
  v_level := public.pass_level_from_xp(v_prog.pass_xp);
  v_premium := v_prog.premium_until IS NOT NULL AND v_prog.premium_until > NOW();

  FOREACH v_tier IN ARRAY v_tiers LOOP
    v_free_l := CASE v_tier
      WHEN 1 THEN '100 XP' WHEN 5 THEN 'Standard Case' WHEN 10 THEN '200 XP'
      WHEN 15 THEN 'Uncommon Drop' WHEN 20 THEN '500 XP' WHEN 25 THEN 'Rare Drop'
      WHEN 30 THEN 'Epic Drop' WHEN 40 THEN '1000 XP' WHEN 50 THEN 'VIP Case' END;
    v_prem_l := CASE v_tier
      WHEN 1 THEN '100 PX + Pioneer Frame' WHEN 5 THEN 'Standard + 200 PX'
      WHEN 10 THEN 'VIP Case + 300 PX' WHEN 15 THEN 'Genesis Case'
      WHEN 20 THEN '1000 PX + Badge' WHEN 25 THEN 'Mythic Case'
      WHEN 30 THEN 'Legendary + 2000 PX' WHEN 40 THEN '3000 PX + Animated BG'
      WHEN 50 THEN 'Exclusive Mythic 🔥' END;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object(
      'level', v_tier,
      'free', jsonb_build_object(
        'label', v_free_l,
        'claimed', v_prog.claimed_free @> to_jsonb(v_tier),
        'ready', v_level >= v_tier AND NOT (v_prog.claimed_free @> to_jsonb(v_tier))
      ),
      'premium', jsonb_build_object(
        'label', v_prem_l,
        'claimed', v_prog.claimed_premium @> to_jsonb(v_tier),
        'ready', v_premium AND v_level >= v_tier AND NOT (v_prog.claimed_premium @> to_jsonb(v_tier)),
        'locked', NOT v_premium
      )
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'season_id', v_season.id,
    'season_name', v_season.name,
    'ends_at', v_season.ends_at,
    'days_left', GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_season.ends_at - NOW())) / 86400)::INTEGER),
    'pass_xp', v_prog.pass_xp,
    'pass_level', v_level,
    'pass_to_next', (POWER(v_level + 1, 2) * 100) - v_prog.pass_xp,
    'pass_progress', CASE
      WHEN (POWER(v_level + 1, 2) - POWER(v_level, 2)) * 100 = 0 THEN 0
      ELSE (v_prog.pass_xp - POWER(v_level, 2) * 100)::NUMERIC
           / ((POWER(v_level + 1, 2) - POWER(v_level, 2)) * 100) END,
    'premium_active', v_premium,
    'premium_until', v_prog.premium_until,
    'xp_multiplier', CASE WHEN v_premium THEN 1.5 ELSE 1.0 END,
    'premium_price_px', 200,
    'tiers', v_rows
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_poxy_pass_reward(
  p_level INTEGER,
  p_track TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_season public.poxy_pass_seasons%ROWTYPE;
  v_prog   public.poxy_pass_progress%ROWTYPE;
  v_level  INTEGER;
  v_valid  INTEGER[] := ARRAY[1,5,10,15,20,25,30,40,50];
  v_reward JSONB;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated'); END IF;
  IF p_track NOT IN ('free', 'premium') THEN RETURN jsonb_build_object('ok', false, 'error', 'Invalid track'); END IF;
  IF NOT (p_level = ANY(v_valid)) THEN RETURN jsonb_build_object('ok', false, 'error', 'Invalid pass level'); END IF;

  SELECT * INTO v_season FROM public.get_active_pass_season();
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'No active season'); END IF;

  SELECT * INTO v_prog FROM public.poxy_pass_progress
  WHERE user_id = v_uid AND season_id = v_season.id FOR UPDATE;
  IF NOT FOUND THEN
    v_prog := public.ensure_pass_progress(v_uid, v_season.id);
    SELECT * INTO v_prog FROM public.poxy_pass_progress WHERE user_id = v_uid AND season_id = v_season.id FOR UPDATE;
  END IF;

  v_level := public.pass_level_from_xp(v_prog.pass_xp);
  IF v_level < p_level THEN RETURN jsonb_build_object('ok', false, 'error', 'Pass level too low'); END IF;

  IF p_track = 'premium' THEN
    IF v_prog.premium_until IS NULL OR v_prog.premium_until <= NOW() THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Premium pass required');
    END IF;
    IF v_prog.claimed_premium @> to_jsonb(p_level) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Already claimed');
    END IF;
  ELSE
    IF v_prog.claimed_free @> to_jsonb(p_level) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Already claimed');
    END IF;
  END IF;

  v_reward := public.apply_pass_reward(v_uid, p_level, p_track);
  IF NOT COALESCE((v_reward->>'ok')::BOOLEAN, FALSE) THEN RETURN v_reward; END IF;

  IF p_track = 'premium' THEN
    UPDATE public.poxy_pass_progress
    SET claimed_premium = claimed_premium || to_jsonb(p_level), updated_at = NOW()
    WHERE user_id = v_uid AND season_id = v_season.id;
  ELSE
    UPDATE public.poxy_pass_progress
    SET claimed_free = claimed_free || to_jsonb(p_level), updated_at = NOW()
    WHERE user_id = v_uid AND season_id = v_season.id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'level', p_level,
    'track', p_track,
    'px_balance', (SELECT px_balance FROM public.profiles WHERE id = v_uid),
    'case_tokens', (SELECT case_tokens FROM public.profiles WHERE id = v_uid)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_poxy_pass()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_season public.poxy_pass_seasons%ROWTYPE;
  v_price  INTEGER := 200;
  v_px     INTEGER;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated'); END IF;

  SELECT * INTO v_season FROM public.get_active_pass_season();
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'No active season'); END IF;

  PERFORM public.ensure_pass_progress(v_uid, v_season.id);

  IF EXISTS (
    SELECT 1 FROM public.poxy_pass_progress
    WHERE user_id = v_uid AND season_id = v_season.id
      AND premium_until IS NOT NULL AND premium_until > NOW()
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Premium pass already active');
  END IF;

  SELECT px_balance INTO v_px FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_px IS NULL OR v_px < v_price THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Need ' || v_price || ' PX for Premium Pass');
  END IF;

  UPDATE public.profiles
  SET px_balance = px_balance - v_price, balance = GREATEST(0, balance - v_price)
  WHERE id = v_uid;

  UPDATE public.poxy_pass_progress
  SET premium_until = v_season.ends_at, updated_at = NOW()
  WHERE user_id = v_uid AND season_id = v_season.id;

  RETURN jsonb_build_object(
    'ok', true,
    'premium_until', v_season.ends_at,
    'px_balance', (SELECT px_balance FROM public.profiles WHERE id = v_uid),
    'xp_multiplier', 1.5
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.dev_activate_poxy_pass()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_season public.poxy_pass_seasons%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated'); END IF;
  IF NOT public.private_can_dev_topup() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Restricted to founder/dev accounts');
  END IF;
  SELECT * INTO v_season FROM public.get_active_pass_season();
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'No active season'); END IF;
  PERFORM public.ensure_pass_progress(v_uid, v_season.id);
  UPDATE public.poxy_pass_progress
  SET premium_until = v_season.ends_at, updated_at = NOW()
  WHERE user_id = v_uid AND season_id = v_season.id;
  RETURN jsonb_build_object('ok', true, 'premium_until', v_season.ends_at);
END;
$$;

INSERT INTO public.poxy_pass_progress (user_id, season_id, pass_xp)
SELECT p.id, 'gen_2026_06', p.xp_total
FROM public.profiles p
WHERE p.xp_total > 0
ON CONFLICT (user_id, season_id) DO UPDATE
SET pass_xp = GREATEST(poxy_pass_progress.pass_xp, EXCLUDED.pass_xp);

GRANT EXECUTE ON FUNCTION public.get_poxy_pass_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_poxy_pass_reward(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_poxy_pass() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dev_activate_poxy_pass() TO authenticated;

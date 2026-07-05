-- ══════════════════════════════════════════════════════════════
-- Migration: xp_system — POXY Economy M0
-- XP dual counter, pity, login streaks, PX purchases, referrals
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp_total    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_balance  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_level    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS px_balance  INTEGER NOT NULL DEFAULT 0;

-- Sync existing balance → px_balance (integer PX)
UPDATE public.profiles
SET px_balance = GREATEST(px_balance, FLOOR(COALESCE(balance, 0))::INTEGER)
WHERE px_balance = 0 AND COALESCE(balance, 0) > 0;

CREATE INDEX IF NOT EXISTS idx_profiles_xp_level ON public.profiles(xp_level DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_xp_total ON public.profiles(xp_total DESC);

CREATE TABLE IF NOT EXISTS public.pity_counters (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  standard_opens       INTEGER NOT NULL DEFAULT 0,
  standard_epic_pity   INTEGER NOT NULL DEFAULT 0,
  standard_leg_pity    INTEGER NOT NULL DEFAULT 0,
  vip_opens            INTEGER NOT NULL DEFAULT 0,
  vip_epic_pity        INTEGER NOT NULL DEFAULT 0,
  vip_mythic_pity      INTEGER NOT NULL DEFAULT 0,
  genesis_opens        INTEGER NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pity_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_pity" ON public.pity_counters;
CREATE POLICY "own_pity" ON public.pity_counters
  FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  xp_amount INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user ON public.xp_events(user_id, created_at DESC);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_xp_events" ON public.xp_events;
CREATE POLICY "own_xp_events" ON public.xp_events
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "staff_xp_events" ON public.xp_events;
CREATE POLICY "staff_xp_events" ON public.xp_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.login_streaks (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak  INTEGER NOT NULL DEFAULT 0,
  longest_streak  INTEGER NOT NULL DEFAULT 0,
  last_login_date DATE,
  total_logins    INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.login_streaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_streak" ON public.login_streaks;
CREATE POLICY "own_streak" ON public.login_streaks
  FOR ALL USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.px_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_payment_id TEXT UNIQUE,
  stripe_session_id TEXT UNIQUE,
  package_id TEXT NOT NULL,
  px_amount INTEGER NOT NULL,
  bonus_px INTEGER NOT NULL DEFAULT 0,
  gbp_amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.px_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_purchases" ON public.px_purchases;
CREATE POLICY "own_purchases" ON public.px_purchases
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "staff_purchases" ON public.px_purchases;
CREATE POLICY "staff_purchases" ON public.px_purchases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id),
  referred_id UUID NOT NULL REFERENCES public.profiles(id),
  ref_code TEXT NOT NULL,
  first_purchase_rewarded BOOLEAN NOT NULL DEFAULT FALSE,
  total_commission_px INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referred_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_referrals" ON public.referrals;
CREATE POLICY "own_referrals" ON public.referrals
  FOR SELECT USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- Dopamine offer tracking
CREATE TABLE IF NOT EXISTS public.economy_offers (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_dopamine_offer_at TIMESTAMPTZ,
  dopamine_offer_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.economy_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_economy_offers" ON public.economy_offers;
CREATE POLICY "own_economy_offers" ON public.economy_offers
  FOR ALL USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_event_type TEXT,
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
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'award_xp: user required';
  END IF;

  SELECT xp_level INTO v_old_level FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'award_xp: profile not found';
  END IF;

  UPDATE public.profiles
  SET
    xp_total   = xp_total + p_amount,
    xp_balance = xp_balance + p_amount,
    xp_level   = FLOOR(SQRT((xp_total + p_amount)::NUMERIC / 100))::INTEGER
  WHERE id = p_user_id
  RETURNING xp_total, xp_balance, xp_level
  INTO v_new_total, v_new_balance, v_new_level;

  v_leveled_up := v_new_level > COALESCE(v_old_level, 0);

  INSERT INTO public.xp_events(user_id, event_type, xp_amount, description)
  VALUES (p_user_id, p_event_type, p_amount, p_description);

  RETURN jsonb_build_object(
    'xp_total',    v_new_total,
    'xp_balance',  v_new_balance,
    'level',       v_new_level,
    'leveled_up',  v_leveled_up
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.spend_xp(
  p_amount INTEGER,
  p_item TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'spend_xp: not authenticated';
  END IF;

  SELECT xp_balance INTO v_balance FROM public.profiles WHERE id = auth.uid();
  IF v_balance IS NULL OR v_balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_XP_BALANCE';
  END IF;

  UPDATE public.profiles
  SET xp_balance = xp_balance - p_amount
  WHERE id = auth.uid()
  RETURNING xp_balance INTO v_balance;

  INSERT INTO public.xp_events(user_id, event_type, xp_amount, description)
  VALUES (auth.uid(), 'SPEND', -p_amount, 'Spent on: ' || p_item);

  RETURN jsonb_build_object('xp_balance', v_balance);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_daily_login()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak   INTEGER;
  v_last     DATE;
  v_reward   INTEGER;
  v_xp       INTEGER := 50;
  v_today    DATE := CURRENT_DATE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'claim_daily_login: not authenticated';
  END IF;

  INSERT INTO public.login_streaks(user_id, current_streak, last_login_date)
  VALUES (auth.uid(), 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT current_streak, last_login_date
  INTO v_streak, v_last
  FROM public.login_streaks WHERE user_id = auth.uid();

  IF v_last = v_today THEN
    RAISE EXCEPTION 'ALREADY_CLAIMED_TODAY';
  END IF;

  IF v_last IS NULL OR v_last < v_today - INTERVAL '1 day' THEN
    v_streak := 1;
  ELSE
    v_streak := v_streak + 1;
  END IF;

  v_reward := CASE
    WHEN v_streak = 7   THEN 500
    WHEN v_streak = 14  THEN 1000
    WHEN v_streak = 30  THEN 2000
    WHEN v_streak = 60  THEN 5000
    WHEN v_streak = 100 THEN 10000
    ELSE 50
  END;

  UPDATE public.login_streaks
  SET current_streak  = v_streak,
      last_login_date = v_today,
      total_logins    = total_logins + 1,
      longest_streak  = GREATEST(longest_streak, v_streak),
      updated_at      = NOW()
  WHERE user_id = auth.uid();

  IF v_reward > 0 THEN
    UPDATE public.profiles
    SET px_balance = px_balance + v_reward,
        balance    = balance + v_reward
    WHERE id = auth.uid();
  END IF;

  PERFORM public.award_xp(auth.uid(), v_xp, 'DAILY_LOGIN', 'Day ' || v_streak || ' streak');

  RETURN jsonb_build_object(
    'streak',    v_streak,
    'px_reward', v_reward,
    'xp_reward', v_xp,
    'day',       v_streak
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.credit_px_balance(
  p_user_id   UUID,
  p_px_amount INTEGER,
  p_purchase_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_first_rewarded BOOLEAN;
  v_commission INTEGER;
BEGIN
  UPDATE public.profiles
  SET px_balance = px_balance + p_px_amount,
      balance    = balance + p_px_amount
  WHERE id = p_user_id;

  UPDATE public.px_purchases
  SET status = 'completed', completed_at = NOW()
  WHERE id = p_purchase_id;

  PERFORM public.award_xp(
    p_user_id,
    GREATEST(1, p_px_amount / 20),
    'PURCHASE',
    'PX purchase: ' || p_px_amount || ' PX'
  );

  SELECT referrer_id, first_purchase_rewarded
  INTO v_referrer_id, v_first_rewarded
  FROM public.referrals WHERE referred_id = p_user_id;

  IF v_referrer_id IS NOT NULL THEN
    IF NOT v_first_rewarded THEN
      v_commission := FLOOR(p_px_amount * 0.20);
      UPDATE public.referrals
      SET first_purchase_rewarded = TRUE,
          total_commission_px = total_commission_px + v_commission
      WHERE referred_id = p_user_id;
    ELSE
      v_commission := FLOOR(p_px_amount * 0.05);
      UPDATE public.referrals
      SET total_commission_px = total_commission_px + v_commission
      WHERE referred_id = p_user_id;
    END IF;

    UPDATE public.profiles
    SET px_balance = px_balance + v_commission,
        balance    = balance + v_commission
    WHERE id = v_referrer_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.bump_standard_pity()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.pity_counters(user_id, standard_opens, standard_epic_pity, standard_leg_pity)
  VALUES (auth.uid(), 1, 1, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    standard_opens     = pity_counters.standard_opens + 1,
    standard_epic_pity = pity_counters.standard_epic_pity + 1,
    standard_leg_pity  = pity_counters.standard_leg_pity + 1,
    updated_at         = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_standard_epic_pity()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.pity_counters SET standard_epic_pity = 0, updated_at = NOW()
  WHERE user_id = auth.uid();
END; $$;

CREATE OR REPLACE FUNCTION public.get_player_economy()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'get_player_economy: not authenticated';
  END IF;

  INSERT INTO public.pity_counters(user_id) VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

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
    )
  ) INTO v_result
  FROM public.profiles p
  LEFT JOIN public.login_streaks ls ON ls.user_id = p.id
  LEFT JOIN public.pity_counters pc ON pc.user_id = p.id
  WHERE p.id = auth.uid();

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.award_xp(UUID,INTEGER,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.spend_xp(INTEGER,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_daily_login() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_px_balance(UUID,INTEGER,UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_player_economy() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bump_standard_pity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_standard_epic_pity() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.award_xp(UUID,INTEGER,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.spend_xp(INTEGER,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_login() TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_px_balance(UUID,INTEGER,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_economy() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bump_standard_pity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_standard_epic_pity() TO authenticated;

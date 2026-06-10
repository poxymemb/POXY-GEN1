-- M5: Referral system — ref codes, welcome bonus, purchase commissions

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ref_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_ref_code_uidx
  ON public.profiles (upper(ref_code))
  WHERE ref_code IS NOT NULL;

UPDATE public.profiles
SET ref_code = upper(substring(replace(id::text, '-', ''), 1, 8))
WHERE ref_code IS NULL;

CREATE OR REPLACE FUNCTION public.generate_ref_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT upper(substring(replace(p_user_id::text, '-', ''), 1, 8));
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, avatar_url, balance, dust, ref_code)
  VALUES (
    NEW.id,
    '🎭',
    0,
    0,
    public.generate_ref_code(NEW.id)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_referral_purchase_commission(
  p_referred_id UUID,
  p_px_amount   INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id      UUID;
  v_first_rewarded   BOOLEAN;
  v_commission       INTEGER := 0;
BEGIN
  IF p_referred_id IS NULL OR p_px_amount IS NULL OR p_px_amount <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'commission', 0);
  END IF;

  SELECT referrer_id, first_purchase_rewarded
  INTO v_referrer_id, v_first_rewarded
  FROM public.referrals
  WHERE referred_id = p_referred_id;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'commission', 0);
  END IF;

  IF NOT COALESCE(v_first_rewarded, FALSE) THEN
    v_commission := FLOOR(p_px_amount * 0.20);
    UPDATE public.referrals
    SET first_purchase_rewarded = TRUE,
        total_commission_px = total_commission_px + v_commission
    WHERE referred_id = p_referred_id;
  ELSE
    v_commission := FLOOR(p_px_amount * 0.05);
    UPDATE public.referrals
    SET total_commission_px = total_commission_px + v_commission
    WHERE referred_id = p_referred_id;
  END IF;

  IF v_commission > 0 THEN
    UPDATE public.profiles
    SET px_balance = px_balance + v_commission,
        balance    = balance + v_commission
    WHERE id = v_referrer_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'commission', v_commission,
    'referrer_id', v_referrer_id,
    'first_purchase', NOT COALESCE(v_first_rewarded, FALSE)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_referral_code(p_ref_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         UUID := auth.uid();
  v_code        TEXT;
  v_referrer_id UUID;
  v_welcome_px  INTEGER := 50;
  v_welcome_xp  INTEGER := 500;
  v_referrer_xp INTEGER := 100;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  v_code := upper(trim(COALESCE(p_ref_code, '')));
  IF length(v_code) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid referral code');
  END IF;

  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ALREADY_REFERRED');
  END IF;

  SELECT id INTO v_referrer_id
  FROM public.profiles
  WHERE upper(ref_code) = v_code
     OR public.generate_ref_code(id) = v_code
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Referral code not found');
  END IF;
  IF v_referrer_id = v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot use your own referral code');
  END IF;

  INSERT INTO public.referrals (referrer_id, referred_id, ref_code)
  VALUES (v_referrer_id, v_uid, v_code);

  UPDATE public.profiles
  SET px_balance = px_balance + v_welcome_px,
      balance    = balance + v_welcome_px,
      ref_code   = COALESCE(ref_code, public.generate_ref_code(v_uid))
  WHERE id = v_uid;

  PERFORM public.award_xp(v_uid, v_welcome_xp, 'REFERRAL', 'Welcome bonus via ref ' || v_code);
  PERFORM public.award_xp(v_referrer_id, v_referrer_xp, 'REFERRAL', 'New referral signup');

  RETURN jsonb_build_object(
    'ok', true,
    'referrer_id', v_referrer_id,
    'px_reward', v_welcome_px,
    'xp_reward', v_welcome_xp,
    'px_balance', (SELECT px_balance FROM public.profiles WHERE id = v_uid)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_referral_info()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_code TEXT;
  v_total_refs INTEGER;
  v_total_comm INTEGER;
  v_month_refs INTEGER;
  v_referred_by TEXT;
  v_month DATE := date_trunc('month', NOW())::DATE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT COALESCE(ref_code, public.generate_ref_code(v_uid)) INTO v_code
  FROM public.profiles WHERE id = v_uid;

  UPDATE public.profiles
  SET ref_code = v_code
  WHERE id = v_uid AND ref_code IS NULL;

  SELECT count(*)::INTEGER, COALESCE(sum(total_commission_px), 0)::INTEGER
  INTO v_total_refs, v_total_comm
  FROM public.referrals WHERE referrer_id = v_uid;

  SELECT count(*)::INTEGER INTO v_month_refs
  FROM public.referrals
  WHERE referrer_id = v_uid AND created_at >= v_month;

  SELECT r.ref_code INTO v_referred_by
  FROM public.referrals r
  WHERE r.referred_id = v_uid;

  RETURN jsonb_build_object(
    'ok', true,
    'ref_code', v_code,
    'total_referrals', COALESCE(v_total_refs, 0),
    'month_referrals', COALESCE(v_month_refs, 0),
    'total_commission_px', COALESCE(v_total_comm, 0),
    'referred_by', v_referred_by
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_referral_leaderboard(p_limit INTEGER DEFAULT 10)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month DATE := date_trunc('month', NOW())::DATE;
  v_rows JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.referral_count DESC, t.commission_px DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT
      p.id AS user_id,
      COALESCE(p.username, 'Operative') AS username,
      count(r.id)::INTEGER AS referral_count,
      COALESCE(sum(r.total_commission_px), 0)::INTEGER AS commission_px
    FROM public.referrals r
    JOIN public.profiles p ON p.id = r.referrer_id
    WHERE r.created_at >= v_month
    GROUP BY p.id, p.username
    ORDER BY referral_count DESC, commission_px DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 25))
  ) t;

  RETURN jsonb_build_object('ok', true, 'period_month', v_month, 'leaders', v_rows);
END;
$$;

DROP FUNCTION IF EXISTS public.credit_px_balance(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS public.credit_px_balance(UUID, INTEGER, UUID);

CREATE OR REPLACE FUNCTION public.credit_px_balance(
  p_user_id     UUID,
  p_px_amount   INTEGER,
  p_purchase_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  PERFORM public.process_referral_purchase_commission(p_user_id, p_px_amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.topup_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_px INTEGER;
  v_new_balance NUMERIC;
  v_comm JSONB;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid amount');
  END IF;

  v_px := FLOOR(p_amount)::INTEGER;

  UPDATE public.profiles
  SET balance = balance + p_amount,
      px_balance = px_balance + v_px
  WHERE id = p_user_id
  RETURNING balance INTO v_new_balance;

  PERFORM public.award_xp(
    p_user_id,
    GREATEST(1, v_px / 20),
    'PURCHASE',
    'PX topup: ' || v_px || ' PX'
  );

  v_comm := public.process_referral_purchase_commission(p_user_id, v_px);

  RETURN jsonb_build_object(
    'ok', true,
    'new_balance', v_new_balance,
    'px_balance', (SELECT px_balance FROM public.profiles WHERE id = p_user_id),
    'referral_commission', v_comm
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_referral_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_referral_info() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_leaderboard(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.process_referral_purchase_commission(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_ref_code(UUID) TO authenticated;

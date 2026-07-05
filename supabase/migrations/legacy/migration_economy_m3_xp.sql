-- M3: XP earn hooks (trade, listing) + XP shop + level perks

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp_cosmetics JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS level_perk_grants JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.xp_shop_claims (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  last_claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, item_id)
);

ALTER TABLE public.xp_shop_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_xp_shop_claims" ON public.xp_shop_claims;
CREATE POLICY "own_xp_shop_claims" ON public.xp_shop_claims
  FOR ALL USING (user_id = auth.uid());

-- Listing XP (+5) on new active listing
CREATE OR REPLACE FUNCTION public.trg_marketplace_listing_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    PERFORM public.award_xp(NEW.seller_id, 5, 'LISTING', 'Listed on marketplace');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marketplace_listing_xp ON public.marketplace;
CREATE TRIGGER marketplace_listing_xp
  AFTER INSERT ON public.marketplace
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_marketplace_listing_xp();

-- Trade completion XP (+20 each party)
CREATE OR REPLACE FUNCTION public.trg_trade_offer_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    PERFORM public.award_xp(NEW.from_id, 20, 'TRADE', 'Trade completed');
    PERFORM public.award_xp(NEW.to_id, 20, 'TRADE', 'Trade completed');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trade_offer_xp ON public.poxy_trade_offers;
CREATE TRIGGER trade_offer_xp
  AFTER UPDATE OF status ON public.poxy_trade_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_trade_offer_xp();

-- Marketplace purchase XP (+20 buyer & seller)
CREATE OR REPLACE FUNCTION public.purchase_poxy(p_listing_id UUID, p_buyer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing public.marketplace%ROWTYPE;
  v_price NUMERIC;
  v_buyer_balance NUMERIC;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_buyer_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;

  SELECT * INTO v_listing FROM public.marketplace WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'Listing not found'); END IF;
  IF v_listing.status <> 'active' THEN RETURN jsonb_build_object('ok', false, 'error', 'Listing not available'); END IF;
  IF v_listing.seller_id = p_buyer_id THEN RETURN jsonb_build_object('ok', false, 'error', 'Cannot buy your own listing'); END IF;

  v_price := v_listing.price;
  SELECT balance INTO v_buyer_balance FROM public.profiles WHERE id = p_buyer_id FOR UPDATE;
  IF v_buyer_balance < v_price THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient Poxy Coins');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_poxy WHERE id = v_listing.poxy_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'POXY missing');
  END IF;

  UPDATE public.profiles SET balance = balance - v_price,
    px_balance = GREATEST(0, px_balance - CEIL(v_price)::INTEGER)
  WHERE id = p_buyer_id;
  UPDATE public.profiles SET balance = balance + v_price,
    px_balance = px_balance + CEIL(v_price)::INTEGER
  WHERE id = v_listing.seller_id;
  UPDATE public.user_poxy SET user_id = p_buyer_id WHERE id = v_listing.poxy_id;
  UPDATE public.marketplace SET status = 'sold', updated_at = NOW() WHERE id = p_listing_id;

  PERFORM public.award_xp(p_buyer_id, 20, 'TRADE', 'Marketplace purchase');
  PERFORM public.award_xp(v_listing.seller_id, 20, 'TRADE', 'Marketplace sale');

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- XP shop purchase
CREATE OR REPLACE FUNCTION public.purchase_xp_shop_item(p_item_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_cost INTEGER;
  v_label TEXT;
  v_type TEXT;
  v_value TEXT;
  v_balance INTEGER;
  v_last TIMESTAMPTZ;
  v_cosmetics JSONB;
  v_grants JSONB;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated'); END IF;

  SELECT c.cost, c.label, c.item_type, c.item_value
  INTO v_cost, v_label, v_type, v_value
  FROM (
    VALUES
      ('xp_free_standard', 500,  'Free Standard Case',     'case_token', 'standard'),
      ('xp_free_vip',      5000, 'Free VIP Case',          'case_token', 'vip'),
      ('xp_gradient_bg',   1000, 'Gradient profile bg',    'cosmetic',   'gradient_bg'),
      ('xp_animated_bg',   5000, 'Animated profile bg',    'cosmetic',   'animated_bg'),
      ('xp_nick_color',    2000, 'Custom nickname colour', 'cosmetic',   'nick_color'),
      ('xp_badge_elite',   500,  'Elite profile badge',    'cosmetic',   'badge_elite'),
      ('xp_case_sound',    3000, 'Custom case open sound', 'cosmetic',   'case_sound'),
      ('xp_holo_frame',    10000,'Holographic dragon frame','cosmetic',  'holo_frame'),
      ('xp_username_title',2500, 'Username title',         'cosmetic',   'username_title')
  ) AS c(item_id, cost, label, item_type, item_value)
  WHERE c.item_id = p_item_id;

  IF v_cost IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Unknown XP shop item'); END IF;

  IF v_type = 'case_token' THEN
    SELECT last_claimed_at INTO v_last FROM public.xp_shop_claims
    WHERE user_id = v_uid AND item_id = p_item_id;
    IF p_item_id = 'xp_free_standard' AND v_last IS NOT NULL AND v_last > NOW() - INTERVAL '1 day' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Free Standard Case available once per day');
    END IF;
    IF p_item_id = 'xp_free_vip' AND v_last IS NOT NULL AND v_last > NOW() - INTERVAL '7 days' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Free VIP Case available once per week');
    END IF;
  END IF;

  SELECT xp_balance INTO v_balance FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_cost THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient XP balance');
  END IF;

  UPDATE public.profiles SET xp_balance = xp_balance - v_cost WHERE id = v_uid RETURNING xp_balance INTO v_balance;
  INSERT INTO public.xp_events(user_id, event_type, xp_amount, description)
  VALUES (v_uid, 'SPEND', -v_cost, 'XP shop: ' || v_label);

  IF v_type = 'case_token' THEN
    PERFORM public.grant_case_token(v_uid, v_value, 1);
    INSERT INTO public.xp_shop_claims(user_id, item_id, last_claimed_at)
    VALUES (v_uid, p_item_id, NOW())
    ON CONFLICT (user_id, item_id) DO UPDATE SET last_claimed_at = NOW();
  ELSIF v_type = 'cosmetic' THEN
    SELECT xp_cosmetics INTO v_cosmetics FROM public.profiles WHERE id = v_uid;
    v_cosmetics := COALESCE(v_cosmetics, '{}'::jsonb) || jsonb_build_object(v_value, true);
    UPDATE public.profiles SET xp_cosmetics = v_cosmetics WHERE id = v_uid;
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'item_id', p_item_id, 'xp_balance', v_balance,
    'case_tokens', (SELECT case_tokens FROM public.profiles WHERE id = v_uid),
    'xp_cosmetics', (SELECT xp_cosmetics FROM public.profiles WHERE id = v_uid)
  );
END;
$$;

-- Level perks (recurring + one-time milestones)
CREATE OR REPLACE FUNCTION public.claim_level_perks()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_level INTEGER;
  v_grants JSONB;
  v_today DATE := CURRENT_DATE;
  v_month TEXT := to_char(NOW(), 'YYYY-MM');
  v_granted JSONB := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated'); END IF;

  SELECT xp_level, level_perk_grants INTO v_level, v_grants
  FROM public.profiles WHERE id = v_uid FOR UPDATE;
  v_grants := COALESCE(v_grants, '{}'::jsonb);

  IF v_level >= 15 AND COALESCE(v_grants->>'lvl15_daily', '') <> v_today::TEXT THEN
    PERFORM public.grant_case_token(v_uid, 'standard', 1);
    v_grants := v_grants || jsonb_build_object('lvl15_daily', v_today::TEXT);
    v_granted := v_granted || jsonb_build_array('lvl15_daily_standard');
  END IF;

  IF v_level >= 20 AND COALESCE(v_grants->>'lvl20_monthly', '') <> v_month THEN
    PERFORM public.grant_case_token(v_uid, 'vip', 1);
    v_grants := v_grants || jsonb_build_object('lvl20_monthly', v_month);
    v_granted := v_granted || jsonb_build_array('lvl20_monthly_vip');
  END IF;

  IF v_level >= 30 AND NOT COALESCE((v_grants->>'lvl30_px')::BOOLEAN, FALSE) THEN
    UPDATE public.profiles SET px_balance = px_balance + 500, balance = balance + 500 WHERE id = v_uid;
    v_grants := v_grants || jsonb_build_object('lvl30_px', true);
    v_granted := v_granted || jsonb_build_array('lvl30_500px');
  END IF;

  IF v_level >= 50 AND NOT COALESCE((v_grants->>'lvl50_mythic')::BOOLEAN, FALSE) THEN
    PERFORM public.grant_case_token(v_uid, 'mythic', 1);
    v_grants := v_grants || jsonb_build_object('lvl50_mythic', true);
    v_granted := v_granted || jsonb_build_array('lvl50_mythic_case');
  END IF;

  IF v_level >= 75 AND NOT COALESCE((v_grants->>'lvl75_px')::BOOLEAN, FALSE) THEN
    UPDATE public.profiles SET px_balance = px_balance + 2000, balance = balance + 2000 WHERE id = v_uid;
    v_grants := v_grants || jsonb_build_object('lvl75_px', true);
    v_granted := v_granted || jsonb_build_array('lvl75_2000px');
  END IF;

  UPDATE public.profiles SET level_perk_grants = v_grants WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true, 'granted', v_granted, 'level', v_level);
END;
$$;

-- Extend get_player_economy with XP shop + cosmetics
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
  v_cosmetics JSONB; v_std_claim TIMESTAMPTZ; v_vip_claim TIMESTAMPTZ;
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
    'dopamine', v_dopamine
  ) INTO v_result
  FROM public.profiles p
  LEFT JOIN public.login_streaks ls ON ls.user_id = p.id
  LEFT JOIN public.pity_counters pc ON pc.user_id = p.id
  WHERE p.id = auth.uid();

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_xp_shop_item(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_level_perks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_poxy(UUID, UUID) TO authenticated;

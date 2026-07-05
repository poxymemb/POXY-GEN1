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

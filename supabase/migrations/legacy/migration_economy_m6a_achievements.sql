-- M6a: Achievement system — server-backed unlocks, rewards, progress

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS achievement_stats JSONB NOT NULL DEFAULT '{"craft_total":0}'::jsonb,
  ADD COLUMN IF NOT EXISTS achievement_cosmetics JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.player_achievements (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS player_achievements_user_idx
  ON public.player_achievements (user_id, unlocked_at DESC);

ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_player_achievements" ON public.player_achievements;
CREATE POLICY "own_player_achievements" ON public.player_achievements
  FOR SELECT USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.count_case_opens(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::INTEGER FROM public.case_open_events WHERE user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.is_season_tier_set_complete(
  p_user_id UUID,
  p_rarity  TEXT,
  p_season  TEXT DEFAULT 'gen_china_magic'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.season_collectibles sc
    WHERE sc.season_id = p_season
      AND lower(sc.rarity) = lower(p_rarity)
      AND NOT EXISTS (
        SELECT 1 FROM public.user_poxy up
        WHERE up.user_id = p_user_id
          AND lower(up.poxy_tier) = lower(sc.rarity)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.grant_achievement_reward(
  p_user_id UUID,
  p_key     TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cosmetics JSONB;
BEGIN
  CASE p_key
    WHEN 'first_dragon' THEN
      PERFORM public.award_xp(p_user_id, 100, 'ACHIEVEMENT', 'First Dragon — Awakened');
      v_cosmetics := jsonb_build_object('badge_awakened', true);
    WHEN 'first_epic' THEN
      v_cosmetics := jsonb_build_object('epic_drop_anim', true);
    WHEN 'first_legendary' THEN
      v_cosmetics := jsonb_build_object('legendary_announce', true);
    WHEN 'first_mythic' THEN
      UPDATE public.profiles
      SET px_balance = px_balance + 1000, balance = balance + 1000
      WHERE id = p_user_id;
      v_cosmetics := jsonb_build_object('mythic_shoutout', true);
    WHEN 'cases_10' THEN
      v_cosmetics := jsonb_build_object('badge_bronze_hunter', true);
    WHEN 'cases_50' THEN
      v_cosmetics := jsonb_build_object('badge_silver_hunter', true);
    WHEN 'cases_100' THEN
      v_cosmetics := jsonb_build_object('badge_gold_hunter', true, 'gold_hunter_frame', true);
    WHEN 'cases_500' THEN
      v_cosmetics := jsonb_build_object('badge_platinum_hunter', true, 'platinum_animated_bg', true);
    WHEN 'cases_1000' THEN
      v_cosmetics := jsonb_build_object('badge_diamond_hunter', true, 'crown_title', true);
    WHEN 'set_common' THEN
      UPDATE public.profiles
      SET px_balance = px_balance + 500, balance = balance + 500
      WHERE id = p_user_id;
      v_cosmetics := jsonb_build_object('badge_collector', true);
    WHEN 'set_rare' THEN
      UPDATE public.profiles
      SET px_balance = px_balance + 2000, balance = balance + 2000
      WHERE id = p_user_id;
    WHEN 'set_epic' THEN
      UPDATE public.profiles
      SET px_balance = px_balance + 10000, balance = balance + 10000
      WHERE id = p_user_id;
      PERFORM public.grant_case_token(p_user_id, 'legend', 1);
    WHEN 'first_craft' THEN
      v_cosmetics := jsonb_build_object('badge_alchemist', true);
    WHEN 'craft_master_10' THEN
      v_cosmetics := jsonb_build_object('master_alchemist_title', true);
    ELSE
      RETURN;
  END CASE;

  IF v_cosmetics IS NOT NULL THEN
    UPDATE public.profiles
    SET achievement_cosmetics = COALESCE(achievement_cosmetics, '{}'::jsonb) || v_cosmetics
    WHERE id = p_user_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.unlock_achievement(
  p_user_id UUID,
  p_key     TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_key IS NULL OR p_key = '' THEN
    RETURN FALSE;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.player_achievements
    WHERE user_id = p_user_id AND achievement_key = p_key
  ) THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.player_achievements (user_id, achievement_key)
  VALUES (p_user_id, p_key);

  PERFORM public.grant_achievement_reward(p_user_id, p_key);
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.evaluate_player_achievements(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cases    INTEGER;
  v_crafts   INTEGER;
  v_new      TEXT[] := ARRAY[]::TEXT[];
  v_key      TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid user');
  END IF;

  v_cases := public.count_case_opens(p_user_id);
  SELECT COALESCE((achievement_stats->>'craft_total')::INTEGER, 0)
  INTO v_crafts
  FROM public.profiles WHERE id = p_user_id;

  IF v_cases >= 1 AND public.unlock_achievement(p_user_id, 'first_dragon') THEN
    v_new := array_append(v_new, 'first_dragon');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.case_open_events
    WHERE user_id = p_user_id AND lower(poxy_tier) = 'epic'
  ) AND public.unlock_achievement(p_user_id, 'first_epic') THEN
    v_new := array_append(v_new, 'first_epic');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.case_open_events
    WHERE user_id = p_user_id AND lower(poxy_tier) = 'legendary'
  ) AND public.unlock_achievement(p_user_id, 'first_legendary') THEN
    v_new := array_append(v_new, 'first_legendary');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.case_open_events
    WHERE user_id = p_user_id AND lower(poxy_tier) = 'mythic'
  ) AND public.unlock_achievement(p_user_id, 'first_mythic') THEN
    v_new := array_append(v_new, 'first_mythic');
  END IF;

  IF v_cases >= 10 AND public.unlock_achievement(p_user_id, 'cases_10') THEN
    v_new := array_append(v_new, 'cases_10');
  END IF;
  IF v_cases >= 50 AND public.unlock_achievement(p_user_id, 'cases_50') THEN
    v_new := array_append(v_new, 'cases_50');
  END IF;
  IF v_cases >= 100 AND public.unlock_achievement(p_user_id, 'cases_100') THEN
    v_new := array_append(v_new, 'cases_100');
  END IF;
  IF v_cases >= 500 AND public.unlock_achievement(p_user_id, 'cases_500') THEN
    v_new := array_append(v_new, 'cases_500');
  END IF;
  IF v_cases >= 1000 AND public.unlock_achievement(p_user_id, 'cases_1000') THEN
    v_new := array_append(v_new, 'cases_1000');
  END IF;

  IF public.is_season_tier_set_complete(p_user_id, 'common')
     AND public.unlock_achievement(p_user_id, 'set_common') THEN
    v_new := array_append(v_new, 'set_common');
  END IF;
  IF public.is_season_tier_set_complete(p_user_id, 'rare')
     AND public.unlock_achievement(p_user_id, 'set_rare') THEN
    v_new := array_append(v_new, 'set_rare');
  END IF;
  IF public.is_season_tier_set_complete(p_user_id, 'epic')
     AND public.unlock_achievement(p_user_id, 'set_epic') THEN
    v_new := array_append(v_new, 'set_epic');
  END IF;

  IF v_crafts >= 1 AND public.unlock_achievement(p_user_id, 'first_craft') THEN
    v_new := array_append(v_new, 'first_craft');
  END IF;
  IF v_crafts >= 10 AND public.unlock_achievement(p_user_id, 'craft_master_10') THEN
    v_new := array_append(v_new, 'craft_master_10');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'new_unlocks', to_jsonb(v_new),
    'unlocked', COALESCE((
      SELECT jsonb_agg(achievement_key ORDER BY unlocked_at)
      FROM public.player_achievements WHERE user_id = p_user_id
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_achievements_case_open()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.evaluate_player_achievements(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS achievements_on_case_open ON public.case_open_events;
CREATE TRIGGER achievements_on_case_open
  AFTER INSERT ON public.case_open_events
  FOR EACH ROW EXECUTE FUNCTION public.trg_achievements_case_open();

CREATE OR REPLACE FUNCTION public.trg_achievements_craft()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.case_origin = 'craft' THEN
    UPDATE public.profiles
    SET achievement_stats = jsonb_set(
      COALESCE(achievement_stats, '{}'::jsonb),
      '{craft_total}',
      to_jsonb(COALESCE((achievement_stats->>'craft_total')::INTEGER, 0) + 1)
    )
    WHERE id = NEW.user_id;
    PERFORM public.evaluate_player_achievements(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS achievements_on_craft ON public.user_poxy;
CREATE TRIGGER achievements_on_craft
  AFTER INSERT ON public.user_poxy
  FOR EACH ROW EXECUTE FUNCTION public.trg_achievements_craft();

CREATE OR REPLACE FUNCTION public.get_player_achievements()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_eval  JSONB;
  v_cases INTEGER;
  v_crafts INTEGER;
  v_unlocked_keys JSONB;
  v_cosmetics JSONB;
  v_defs JSONB := '[
    {"key":"first_dragon","name":"First Dragon","icon":"🐉","goal":1,"metric":"cases","reward":"Awakened + 100 XP"},
    {"key":"first_epic","name":"First Epic Drop","icon":"💜","goal":1,"metric":"epic","reward":"Epic reveal FX"},
    {"key":"first_legendary","name":"First Legendary","icon":"👑","goal":1,"metric":"legendary","reward":"Community announce"},
    {"key":"first_mythic","name":"First Mythic","icon":"🏮","goal":1,"metric":"mythic","reward":"1000 PX shoutout"},
    {"key":"cases_10","name":"Bronze Hunter","icon":"🥉","goal":10,"metric":"cases","reward":"Bronze badge"},
    {"key":"cases_50","name":"Silver Hunter","icon":"🥈","goal":50,"metric":"cases","reward":"Silver badge"},
    {"key":"cases_100","name":"Gold Hunter","icon":"🥇","goal":100,"metric":"cases","reward":"Gold frame"},
    {"key":"cases_500","name":"Platinum Hunter","icon":"💠","goal":500,"metric":"cases","reward":"Animated BG"},
    {"key":"cases_1000","name":"Diamond Hunter","icon":"💎","goal":1000,"metric":"cases","reward":"Crown title"},
    {"key":"set_common","name":"Common Set","icon":"📗","goal":1,"metric":"set_common","reward":"500 PX + Collector"},
    {"key":"set_rare","name":"Rare Set","icon":"📘","goal":1,"metric":"set_rare","reward":"2000 PX"},
    {"key":"set_epic","name":"Epic Set","icon":"📙","goal":1,"metric":"set_epic","reward":"10k PX + Legend Case"},
    {"key":"first_craft","name":"First Craft","icon":"⚗️","goal":1,"metric":"crafts","reward":"Alchemist badge"},
    {"key":"craft_master_10","name":"Master Alchemist","icon":"🔮","goal":10,"metric":"crafts","reward":"Master title"}
  ]'::jsonb;
  v_items JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  v_eval := public.evaluate_player_achievements(v_uid);
  v_cases := public.count_case_opens(v_uid);
  SELECT COALESCE((achievement_stats->>'craft_total')::INTEGER, 0),
         COALESCE(achievement_cosmetics, '{}'::jsonb)
  INTO v_crafts, v_cosmetics
  FROM public.profiles WHERE id = v_uid;

  SELECT COALESCE(jsonb_agg(to_jsonb(achievement_key)), '[]'::jsonb)
  INTO v_unlocked_keys
  FROM public.player_achievements WHERE user_id = v_uid;

  SELECT jsonb_agg(
    d || jsonb_build_object(
      'unlocked', (v_unlocked_keys @> to_jsonb(d->>'key')),
      'progress', CASE d->>'metric'
        WHEN 'cases' THEN v_cases
        WHEN 'crafts' THEN v_crafts
        WHEN 'set_common' THEN CASE WHEN public.is_season_tier_set_complete(v_uid, 'common') THEN 1 ELSE 0 END
        WHEN 'set_rare' THEN CASE WHEN public.is_season_tier_set_complete(v_uid, 'rare') THEN 1 ELSE 0 END
        WHEN 'set_epic' THEN CASE WHEN public.is_season_tier_set_complete(v_uid, 'epic') THEN 1 ELSE 0 END
        WHEN 'epic' THEN CASE WHEN v_unlocked_keys @> to_jsonb('first_epic') THEN 1 ELSE 0 END
        WHEN 'legendary' THEN CASE WHEN v_unlocked_keys @> to_jsonb('first_legendary') THEN 1 ELSE 0 END
        WHEN 'mythic' THEN CASE WHEN v_unlocked_keys @> to_jsonb('first_mythic') THEN 1 ELSE 0 END
        ELSE 0 END
    )
  )
  INTO v_items
  FROM jsonb_array_elements(v_defs) AS d;

  RETURN jsonb_build_object(
    'ok', true,
    'items', COALESCE(v_items, '[]'::jsonb),
    'cases_opened', v_cases,
    'craft_total', v_crafts,
    'new_unlocks', COALESCE(v_eval->'new_unlocks', '[]'::jsonb),
    'cosmetics', v_cosmetics
  );
END;
$$;

UPDATE public.profiles p
SET achievement_stats = jsonb_set(
  COALESCE(p.achievement_stats, '{"craft_total":0}'::jsonb),
  '{craft_total}',
  to_jsonb(sub.c)
)
FROM (
  SELECT user_id, count(*)::INTEGER AS c
  FROM public.user_poxy
  WHERE case_origin = 'craft'
  GROUP BY user_id
) sub
WHERE p.id = sub.user_id;

GRANT EXECUTE ON FUNCTION public.get_player_achievements() TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_player_achievements(UUID) TO authenticated;

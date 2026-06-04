-- =============================================================================
-- LUMINA OS — Feature Suite Migration
-- Adds: rich message types, clans/syndicates, duels
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extend poxy_dm for rich messages (trade widgets, duels, images)
-- -----------------------------------------------------------------------------
ALTER TABLE public.poxy_dm
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'text'
    CHECK (type IN ('text','image','trade_widget','duel_widget','system')),
  ADD COLUMN IF NOT EXISTS meta jsonb;

-- Allow widget messages with a short content description
ALTER TABLE public.poxy_dm
  DROP CONSTRAINT IF EXISTS poxy_dm_content_length;

ALTER TABLE public.poxy_dm
  ADD CONSTRAINT poxy_dm_content_length
    CHECK (char_length(trim(content)) BETWEEN 1 AND 2000);

-- -----------------------------------------------------------------------------
-- 2. Extend poxy_trade_offers for dual-side trade widget (requested items)
-- -----------------------------------------------------------------------------
ALTER TABLE public.poxy_trade_offers
  ADD COLUMN IF NOT EXISTS requested_poxy_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS locked_from boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_to   boolean NOT NULL DEFAULT false;

-- -----------------------------------------------------------------------------
-- 3. CLANS / SYNDICATES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 30),
  tag           text NOT NULL CHECK (tag ~ '^[A-Z0-9]{2,6}$'),
  description   text CHECK (char_length(description) <= 300),
  avatar_emoji  text NOT NULL DEFAULT '⚔️',
  banner_color  text NOT NULL DEFAULT '#a855f7',
  is_public     boolean NOT NULL DEFAULT true,
  level         integer NOT NULL DEFAULT 1 CHECK (level >= 1),
  owner_id      uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  coins_balance integer NOT NULL DEFAULT 0 CHECK (coins_balance >= 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clans_tag_unique UNIQUE (tag),
  CONSTRAINT clans_name_unique UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS clans_owner_idx ON public.clans (owner_id);
CREATE INDEX IF NOT EXISTS clans_public_level_idx ON public.clans (is_public, level DESC) WHERE is_public = true;

-- -----------------------------------------------------------------------------
-- 4. CLAN MEMBERS
-- Role hierarchy: leader > deputy > veteran > member
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clan_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id     uuid NOT NULL REFERENCES public.clans (id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'member'
    CHECK (role IN ('leader','deputy','veteran','member')),
  joined_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clan_members_unique UNIQUE (clan_id, user_id)
);

CREATE INDEX IF NOT EXISTS clan_members_clan_idx ON public.clan_members (clan_id);
CREATE INDEX IF NOT EXISTS clan_members_user_idx ON public.clan_members (user_id);

-- -----------------------------------------------------------------------------
-- 5. POXY DUELS (1v1 Wager)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.poxy_duels (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id     uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  defender_id       uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  challenger_poxy_id uuid REFERENCES public.user_poxy (id) ON DELETE SET NULL,
  defender_poxy_id   uuid REFERENCES public.user_poxy (id) ON DELETE SET NULL,
  challenger_tier   text,
  defender_tier     text,
  challenger_prob   numeric(5,4),
  defender_prob     numeric(5,4),
  status            text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','completed','declined','expired')),
  winner_id         uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  wager_coins       integer NOT NULL DEFAULT 0 CHECK (wager_coins >= 0),
  rng_seed          text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  resolved_at       timestamptz,
  CONSTRAINT duels_no_self CHECK (challenger_id <> defender_id)
);

CREATE INDEX IF NOT EXISTS poxy_duels_challenger_idx ON public.poxy_duels (challenger_id);
CREATE INDEX IF NOT EXISTS poxy_duels_defender_idx   ON public.poxy_duels (defender_id, status);

-- -----------------------------------------------------------------------------
-- 6. RLS POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clans_select_all  ON public.clans;
CREATE POLICY clans_select_all ON public.clans
  FOR SELECT TO authenticated USING (is_public = true OR owner_id = auth.uid());

DROP POLICY IF EXISTS clans_insert_owner ON public.clans;
CREATE POLICY clans_insert_owner ON public.clans
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS clans_update_owner ON public.clans;
CREATE POLICY clans_update_owner ON public.clans
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

ALTER TABLE public.clan_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clan_members_select ON public.clan_members;
CREATE POLICY clan_members_select ON public.clan_members
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS clan_members_insert_self ON public.clan_members;
CREATE POLICY clan_members_insert_self ON public.clan_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS clan_members_update_leader ON public.clan_members;
CREATE POLICY clan_members_update_leader ON public.clan_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clan_members cm
      WHERE cm.clan_id = clan_members.clan_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('leader','deputy')
    )
  );

DROP POLICY IF EXISTS clan_members_delete_self ON public.clan_members;
CREATE POLICY clan_members_delete_self ON public.clan_members
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.clan_members cm
    WHERE cm.clan_id = clan_members.clan_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'leader'
  ));

ALTER TABLE public.poxy_duels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS poxy_duels_select ON public.poxy_duels;
CREATE POLICY poxy_duels_select ON public.poxy_duels
  FOR SELECT TO authenticated
  USING (auth.uid() = challenger_id OR auth.uid() = defender_id);

DROP POLICY IF EXISTS poxy_duels_insert ON public.poxy_duels;
CREATE POLICY poxy_duels_insert ON public.poxy_duels
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = challenger_id);

DROP POLICY IF EXISTS poxy_duels_update ON public.poxy_duels;
CREATE POLICY poxy_duels_update ON public.poxy_duels
  FOR UPDATE TO authenticated
  USING (auth.uid() = challenger_id OR auth.uid() = defender_id);

-- -----------------------------------------------------------------------------
-- 7. RPCs
-- -----------------------------------------------------------------------------

-- Create clan (deducts 1000 coins, inserts clan + leader member)
CREATE OR REPLACE FUNCTION public.create_clan(
  p_name        text,
  p_tag         text,
  p_description text DEFAULT NULL,
  p_avatar_emoji text DEFAULT '⚔️',
  p_banner_color text DEFAULT '#a855f7',
  p_is_public   boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_bal    numeric;
  v_clan_id uuid;
  v_cost   constant integer := 1000;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  -- Check & deduct balance
  SELECT balance INTO v_bal FROM profiles WHERE id = v_uid FOR UPDATE;
  IF v_bal IS NULL OR v_bal < v_cost THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient POXY Coins (need 1,000 PC)');
  END IF;

  -- Check existing clan ownership
  IF EXISTS (SELECT 1 FROM clan_members WHERE user_id = v_uid AND role = 'leader') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You already lead a clan');
  END IF;

  UPDATE profiles SET balance = balance - v_cost WHERE id = v_uid;

  INSERT INTO clans (name, tag, description, avatar_emoji, banner_color, is_public, owner_id)
  VALUES (trim(p_name), upper(trim(p_tag)), nullif(trim(p_description),''), p_avatar_emoji, p_banner_color, p_is_public, v_uid)
  RETURNING id INTO v_clan_id;

  INSERT INTO clan_members (clan_id, user_id, role) VALUES (v_clan_id, v_uid, 'leader');

  RETURN jsonb_build_object('ok', true, 'clan_id', v_clan_id);
END;
$$;

REVOKE ALL ON FUNCTION public.create_clan FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_clan TO authenticated;

-- Initiate duel (creates duel record, inserts a duel_widget DM to both sides)
CREATE OR REPLACE FUNCTION public.initiate_duel(
  p_defender_id      uuid,
  p_challenger_poxy_id uuid DEFAULT NULL,
  p_wager_coins      integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_duel_id    uuid;
  v_tier       text;
  v_prob_c     numeric(5,4);
  v_prob_d     numeric(5,4) := 0.5;
  v_bal        numeric;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;
  IF p_defender_id IS NULL OR p_defender_id = v_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid target');
  END IF;

  IF p_wager_coins > 0 THEN
    SELECT balance INTO v_bal FROM profiles WHERE id = v_uid;
    IF v_bal < p_wager_coins THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance for wager');
    END IF;
  END IF;

  -- Calculate probability from tier (default 50/50 if no POXY selected)
  IF p_challenger_poxy_id IS NOT NULL THEN
    SELECT poxy_tier INTO v_tier FROM user_poxy WHERE id = p_challenger_poxy_id AND user_id = v_uid;
    v_prob_c := CASE v_tier
      WHEN 'common'    THEN 0.40
      WHEN 'uncommon'  THEN 0.45
      WHEN 'rare'      THEN 0.50
      WHEN 'epic'      THEN 0.60
      WHEN 'legendary' THEN 0.70
      WHEN 'mythic'    THEN 0.85
      ELSE 0.50
    END;
    v_prob_d := 1 - v_prob_c;
  ELSE
    v_prob_c := 0.50;
    v_prob_d := 0.50;
  END IF;

  INSERT INTO poxy_duels (
    challenger_id, defender_id, challenger_poxy_id,
    challenger_tier, challenger_prob, defender_prob,
    wager_coins, status
  )
  VALUES (
    v_uid, p_defender_id, p_challenger_poxy_id,
    v_tier, v_prob_c, v_prob_d,
    p_wager_coins, 'pending'
  )
  RETURNING id INTO v_duel_id;

  RETURN jsonb_build_object('ok', true, 'duel_id', v_duel_id,
    'challenger_prob', v_prob_c, 'defender_prob', v_prob_d);
END;
$$;

REVOKE ALL ON FUNCTION public.initiate_duel FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.initiate_duel TO authenticated;

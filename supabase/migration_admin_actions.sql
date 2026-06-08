-- ══════════════════════════════════════════════════════════════
-- Migration: admin_actions
-- Session 3 — Dispute Resolution module for POXY MCU
-- Apply via Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_user_id UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type    TEXT        NOT NULL,
  -- action_type values:
  --   'compensate_pc'   — direct balance adjustment as compensation
  --   'grant_asset'     — airdrop mint to resolve a lost-drop dispute
  --   'grant_badge'     — badge grant as compensation
  --   'freeze'          — freeze account (abuse)
  --   'unfreeze'        — undo freeze
  --   'note'            — free-form staff note on the player
  payload        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  reason         TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_admin_actions_created    ON public.admin_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin      ON public.admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target     ON public.admin_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type       ON public.admin_actions(action_type);

-- 3. RLS — staff/founders only
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_actions_read"   ON public.admin_actions;
DROP POLICY IF EXISTS "admin_actions_insert" ON public.admin_actions;

CREATE POLICY "admin_actions_read" ON public.admin_actions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_emails ae
      JOIN public.profiles p ON p.email = ae.email
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "admin_actions_insert" ON public.admin_actions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_emails ae
      JOIN public.profiles p ON p.email = ae.email
      WHERE p.id = auth.uid()
    )
  );

-- 4. Helper RPC — write a log entry (called from MCU after each compensation)
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_target_user_id UUID,
  p_action_type    TEXT,
  p_payload        JSONB   DEFAULT '{}'::jsonb,
  p_reason         TEXT    DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.admin_actions(admin_id, target_user_id, action_type, payload, reason)
  VALUES (auth.uid(), p_target_user_id, p_action_type, p_payload, p_reason)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_action(UUID, TEXT, JSONB, TEXT) TO authenticated;

-- 5. Helper RPC — read recent actions (needed because RLS requires admin session)
CREATE OR REPLACE FUNCTION public.get_recent_admin_actions(p_limit INT DEFAULT 20)
RETURNS TABLE(
  id             UUID,
  admin_id       UUID,
  admin_username TEXT,
  target_user_id UUID,
  target_username TEXT,
  action_type    TEXT,
  payload        JSONB,
  reason         TEXT,
  created_at     TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    aa.id,
    aa.admin_id,
    pa.username  AS admin_username,
    aa.target_user_id,
    pt.username  AS target_username,
    aa.action_type,
    aa.payload,
    aa.reason,
    aa.created_at
  FROM public.admin_actions aa
  LEFT JOIN public.profiles pa ON pa.id = aa.admin_id
  LEFT JOIN public.profiles pt ON pt.id = aa.target_user_id
  ORDER BY aa.created_at DESC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.get_recent_admin_actions(INT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_recent_admin_actions(INT) TO authenticated;

-- ══════════════════════════════════════════════════════════════
-- NOTE: requires admin_emails table (see migration_admin_emails_table.sql).
-- Seed staff emails manually in Supabase SQL Editor — not committed to git.
-- ══════════════════════════════════════════════════════════════

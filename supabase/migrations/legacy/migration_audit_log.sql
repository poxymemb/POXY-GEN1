-- ══════════════════════════════════════════════════════════════
-- Migration: poxy_audit_log
-- Session 1 — AUDIT LOG module for POXY MCU
-- Apply via Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Create table (idempotent)
CREATE TABLE IF NOT EXISTS poxy_audit_log (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action     TEXT        NOT NULL,
  user_id    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  admin_id   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  ip         TEXT,
  detail     JSONB       DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_audit_log_created  ON poxy_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user     ON poxy_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin    ON poxy_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action   ON poxy_audit_log(action);

-- 3. RLS — only staff/founders can read or insert
ALTER TABLE poxy_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_admin_read"   ON poxy_audit_log;
DROP POLICY IF EXISTS "audit_log_admin_insert" ON poxy_audit_log;

CREATE POLICY "audit_log_admin_read" ON poxy_audit_log
  FOR SELECT
  USING (private_is_admin(auth.uid()) OR is_founder(auth.uid()));

CREATE POLICY "audit_log_admin_insert" ON poxy_audit_log
  FOR INSERT
  WITH CHECK (private_is_admin(auth.uid()) OR is_founder(auth.uid()));

-- 4. Enable realtime on the table
-- (run in SQL editor OR via Dashboard → Replication → Tables → enable)
ALTER PUBLICATION supabase_realtime ADD TABLE poxy_audit_log;

-- 5. Helper function: write an audit event from server-side / Edge Functions
CREATE OR REPLACE FUNCTION write_audit_event(
  p_action   TEXT,
  p_user_id  UUID    DEFAULT NULL,
  p_admin_id UUID    DEFAULT NULL,
  p_ip       TEXT    DEFAULT NULL,
  p_detail   JSONB   DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO poxy_audit_log(action, user_id, admin_id, ip, detail)
  VALUES (p_action, p_user_id, p_admin_id, p_ip, p_detail)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- NOTE: column names match the MCU JS queries:
--   action, user_id, admin_id, ip, detail, created_at
--
-- Old code queried: action_type, ip_address, payload  ← WRONG
-- New migration uses: action, ip, detail              ← CORRECT
-- ══════════════════════════════════════════════════════════════

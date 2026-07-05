-- ══════════════════════════════════════════════════════════════
-- Migration: admin_roles
-- Session 7 — Admin Roles module for POXY MCU
-- Apply via Supabase Dashboard → SQL Editor
-- Depends on: admin_emails (migration_admin_emails_table.sql)
-- ══════════════════════════════════════════════════════════════

-- 1. Extend admin_emails
ALTER TABLE public.admin_emails
  ADD COLUMN IF NOT EXISTS added_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

ALTER TABLE public.admin_emails DROP CONSTRAINT IF EXISTS admin_emails_role_check;

UPDATE public.admin_emails SET role = 'superadmin' WHERE role = 'admin';

ALTER TABLE public.admin_emails
  ADD CONSTRAINT admin_emails_role_check
  CHECK (role IN ('superadmin', 'mod', 'support', 'dev_topup'));


-- 2. Staff helpers (auth.users email join — profiles.email is often NULL)
CREATE OR REPLACE FUNCTION public.private_is_staff_member()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_emails ae
    INNER JOIN auth.users u ON lower(u.email) = lower(ae.email)
    WHERE u.id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.private_is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_emails ae
    INNER JOIN auth.users u ON lower(u.email) = lower(ae.email)
    WHERE u.id = auth.uid()
      AND ae.role IN ('superadmin', 'admin')
  );
$$;


-- 3. Current user's MCU role
CREATE OR REPLACE FUNCTION public.get_admin_role(p_user_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE ae.role
    WHEN 'admin' THEN 'superadmin'
    ELSE ae.role
  END
  FROM public.admin_emails ae
  INNER JOIN auth.users u ON lower(u.email) = lower(ae.email)
  WHERE u.id = p_user_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_role(UUID) TO authenticated;


-- 4. Team members list
CREATE OR REPLACE FUNCTION public.get_team_members()
RETURNS TABLE(
  email              TEXT,
  role               TEXT,
  added_at           TIMESTAMPTZ,
  added_by_username  TEXT,
  last_login         TIMESTAMPTZ,
  is_active          BOOLEAN,
  profile_id         UUID
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ae.email,
    CASE WHEN ae.role = 'admin' THEN 'superadmin' ELSE ae.role END AS role,
    ae.created_at AS added_at,
    adder.username AS added_by_username,
    COALESCE(ae.last_login, u.last_sign_in_at) AS last_login,
    (u.id IS NOT NULL) AS is_active,
    u.id AS profile_id
  FROM public.admin_emails ae
  LEFT JOIN auth.users u ON lower(u.email) = lower(ae.email)
  LEFT JOIN public.profiles adder ON adder.id = ae.added_by
  WHERE public.private_is_staff_member()
  ORDER BY ae.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_members() TO authenticated;


-- 5. Add team member (superadmin only)
CREATE OR REPLACE FUNCTION public.admin_add_team_member(
  p_email TEXT,
  p_role  TEXT DEFAULT 'support'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
  v_role  TEXT := lower(trim(p_role));
BEGIN
  IF NOT public.private_is_superadmin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized — superadmin only');
  END IF;

  IF v_email IS NULL OR v_email = '' OR v_email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid email');
  END IF;

  IF v_role NOT IN ('superadmin', 'mod', 'support') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid role — use superadmin, mod, or support');
  END IF;

  INSERT INTO public.admin_emails (email, role, added_by)
  VALUES (v_email, v_role, auth.uid())
  ON CONFLICT (email) DO UPDATE
    SET role = EXCLUDED.role,
        added_by = EXCLUDED.added_by;

  RETURN jsonb_build_object('ok', true, 'email', v_email, 'role', v_role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_add_team_member(TEXT, TEXT) TO authenticated;


-- 6. Remove team member (superadmin only)
CREATE OR REPLACE FUNCTION public.admin_remove_team_member(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
  v_count INT;
BEGIN
  IF NOT public.private_is_superadmin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized — superadmin only');
  END IF;

  DELETE FROM public.admin_emails WHERE lower(email) = v_email;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Member not found');
  END IF;

  RETURN jsonb_build_object('ok', true, 'email', v_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_remove_team_member(TEXT) TO authenticated;


-- 7. Keep private_is_admin() compatible after admin → superadmin rename
CREATE OR REPLACE FUNCTION public.private_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    coalesce(
      (SELECT is_verified_employee FROM public.profiles WHERE id = auth.uid()),
      false
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND 'founder' = ANY (coalesce(badges, array[]::text[]))
    )
    OR EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      INNER JOIN auth.users u ON lower(u.email) = lower(ae.email)
      WHERE u.id = auth.uid() AND ae.role IN ('admin', 'superadmin')
    )
  );
$$;

-- ══════════════════════════════════════════════════════════════
-- RLS on admin_emails: no client policies — RPCs only (SECURITY DEFINER).
-- Seed staff via admin_add_team_member or manual INSERT in SQL Editor.
-- ══════════════════════════════════════════════════════════════

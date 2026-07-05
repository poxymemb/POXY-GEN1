-- Extend admin_emails roles: marketing + dev

ALTER TABLE public.admin_emails DROP CONSTRAINT IF EXISTS admin_emails_role_check;

ALTER TABLE public.admin_emails
  ADD CONSTRAINT admin_emails_role_check
  CHECK (role IN ('superadmin', 'mod', 'support', 'marketing', 'dev', 'dev_topup'));

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

  IF v_role NOT IN ('superadmin', 'mod', 'support', 'marketing', 'dev', 'dev_topup') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid role');
  END IF;

  INSERT INTO public.admin_emails (email, role, added_by)
  VALUES (v_email, v_role, auth.uid())
  ON CONFLICT (email) DO UPDATE
    SET role = EXCLUDED.role,
        added_by = EXCLUDED.added_by;

  RETURN jsonb_build_object('ok', true, 'email', v_email, 'role', v_role);
END;
$$;

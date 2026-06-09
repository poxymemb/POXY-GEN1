-- ══════════════════════════════════════════════════════════════
-- Migration: support_rls_fix_v3
-- Staff RLS policies JOIN admin_emails, but that table has RLS
-- with no client SELECT policies — subqueries always return false.
-- Fix: allow each user to read only their own admin_emails row
-- (matched via profiles.email). Does not expose the full allowlist.
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "staff_read_own_admin_email" ON public.admin_emails;

CREATE POLICY "staff_read_own_admin_email" ON public.admin_emails
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND lower(p.email) = lower(admin_emails.email)
    )
  );

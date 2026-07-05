-- ══════════════════════════════════════════════════════════════
-- Migration: support_rls_fix_v2
-- Fix "permission denied for table users" — auth.users cannot be
-- referenced inside RLS policies for the authenticated role.
-- Solution: backfill profiles.email + staff gate via profiles join.
-- ══════════════════════════════════════════════════════════════

-- 1. Backfill profiles.email from auth.users (SECURITY DEFINER context)
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR lower(p.email) <> lower(u.email));

-- 2. Keep profiles.email in sync when auth email changes
CREATE OR REPLACE FUNCTION public.sync_profile_email_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_sync ON auth.users;
CREATE TRIGGER on_auth_user_email_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_email_from_auth();

-- 3. Revert support staff RLS to admin_emails + profiles join (case-insensitive)
DROP POLICY IF EXISTS "staff_all_tickets"    ON public.support_tickets;
DROP POLICY IF EXISTS "staff_all_messages"   ON public.ticket_messages;
DROP POLICY IF EXISTS "faq_staff_manage"       ON public.support_faq;
DROP POLICY IF EXISTS "quick_replies_staff"    ON public.support_quick_replies;
DROP POLICY IF EXISTS "auto_messages_staff"    ON public.support_auto_messages;

CREATE POLICY "staff_all_tickets" ON public.support_tickets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "staff_all_messages" ON public.ticket_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "faq_staff_manage" ON public.support_faq
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "quick_replies_staff" ON public.support_quick_replies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "auto_messages_staff" ON public.support_auto_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  );

-- 4. close_support_ticket — use SECURITY DEFINER helper (auth.users OK in RPC)
CREATE OR REPLACE FUNCTION public.close_support_ticket(p_ticket_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auto_msg TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'close_support_ticket: not authenticated';
  END IF;

  IF NOT public.private_is_staff_member() THEN
    RAISE EXCEPTION 'close_support_ticket: staff only';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.support_tickets WHERE id = p_ticket_id
  ) THEN
    RAISE EXCEPTION 'close_support_ticket: ticket not found';
  END IF;

  UPDATE public.support_tickets
  SET status = 'closed', closed_at = NOW(), updated_at = NOW()
  WHERE id = p_ticket_id;

  SELECT body INTO v_auto_msg
  FROM public.support_auto_messages
  WHERE trigger = 'ticket_closed' AND is_active = TRUE
  LIMIT 1;

  IF v_auto_msg IS NOT NULL THEN
    INSERT INTO public.ticket_messages (ticket_id, is_staff, body, is_auto)
    VALUES (p_ticket_id, TRUE, v_auto_msg, TRUE);
  END IF;
END;
$$;

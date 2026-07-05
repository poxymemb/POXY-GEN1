-- ══════════════════════════════════════════════════════════════
-- Migration: support_rls_fix
-- Fix support RLS staff gate — profiles.email is often NULL
-- Use auth.users.email join (same pattern as migration_admin_roles.sql)
-- ══════════════════════════════════════════════════════════════

-- Staff gate expression used inline in policies (no helper in RLS):
-- EXISTS (
--   SELECT 1 FROM public.admin_emails ae
--   INNER JOIN auth.users u ON lower(u.email) = lower(ae.email)
--   WHERE u.id = auth.uid()
-- )

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
      INNER JOIN auth.users u ON lower(u.email) = lower(ae.email)
      WHERE u.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      INNER JOIN auth.users u ON lower(u.email) = lower(ae.email)
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "staff_all_messages" ON public.ticket_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      INNER JOIN auth.users u ON lower(u.email) = lower(ae.email)
      WHERE u.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      INNER JOIN auth.users u ON lower(u.email) = lower(ae.email)
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "faq_staff_manage" ON public.support_faq
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      INNER JOIN auth.users u ON lower(u.email) = lower(ae.email)
      WHERE u.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      INNER JOIN auth.users u ON lower(u.email) = lower(ae.email)
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "quick_replies_staff" ON public.support_quick_replies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      INNER JOIN auth.users u ON lower(u.email) = lower(ae.email)
      WHERE u.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      INNER JOIN auth.users u ON lower(u.email) = lower(ae.email)
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "auto_messages_staff" ON public.support_auto_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      INNER JOIN auth.users u ON lower(u.email) = lower(ae.email)
      WHERE u.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      INNER JOIN auth.users u ON lower(u.email) = lower(ae.email)
      WHERE u.id = auth.uid()
    )
  );

-- close_support_ticket RPC staff check
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.admin_emails ae
    INNER JOIN auth.users u ON lower(u.email) = lower(ae.email)
    WHERE u.id = auth.uid()
  ) THEN
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

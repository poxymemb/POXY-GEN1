-- ══════════════════════════════════════════════════════════════
-- Migration: support_delete_ticket
-- Permanent ticket deletion (staff only, audited via admin_actions)
-- Depends on: support_tickets, admin_emails, profiles, admin_actions
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.delete_support_ticket(
  p_ticket_id UUID,
  p_reason    TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_subject TEXT;
  v_status  TEXT;
  v_reason  TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'delete_support_ticket: not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.admin_emails ae
    JOIN public.profiles p ON lower(p.email) = lower(ae.email)
    WHERE p.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'delete_support_ticket: staff only';
  END IF;

  v_reason := trim(coalesce(p_reason, ''));
  IF v_reason = '' THEN
    RAISE EXCEPTION 'delete_support_ticket: reason required';
  END IF;

  SELECT user_id, subject, status
  INTO v_user_id, v_subject, v_status
  FROM public.support_tickets
  WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'delete_support_ticket: ticket not found';
  END IF;

  INSERT INTO public.admin_actions (admin_id, target_user_id, action_type, payload, reason)
  VALUES (
    auth.uid(),
    v_user_id,
    'ticket_delete',
    jsonb_build_object(
      'ticket_id', p_ticket_id,
      'subject', v_subject,
      'status', v_status
    ),
    v_reason
  );

  DELETE FROM public.support_tickets WHERE id = p_ticket_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_support_ticket(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_support_ticket(UUID, TEXT) TO authenticated;

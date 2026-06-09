-- ══════════════════════════════════════════════════════════════
-- Migration: staff_stats_sync
-- Keep staff profile stats in sync when tickets close / staff reply
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.private_upsert_staff_stats(
  p_staff_id UUID,
  p_closed_delta INTEGER DEFAULT 0,
  p_messages_delta INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_staff_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.staff_stats (
    staff_id,
    tickets_closed,
    total_messages_sent,
    last_active,
    updated_at
  )
  VALUES (
    p_staff_id,
    GREATEST(p_closed_delta, 0),
    GREATEST(p_messages_delta, 0),
    NOW(),
    NOW()
  )
  ON CONFLICT (staff_id) DO UPDATE
  SET tickets_closed = staff_stats.tickets_closed + GREATEST(p_closed_delta, 0),
      total_messages_sent = staff_stats.total_messages_sent + GREATEST(p_messages_delta, 0),
      last_active = NOW(),
      updated_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.private_upsert_staff_stats(UUID, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.private_upsert_staff_stats(UUID, INTEGER, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.private_upsert_staff_stats(UUID, INTEGER, INTEGER) FROM authenticated;

-- ── close_support_ticket: assign closer + bump stats ──────────

CREATE OR REPLACE FUNCTION public.close_support_ticket(p_ticket_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auto_msg  TEXT;
  v_staff_id  UUID;
  v_was_open  BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'close_support_ticket: not authenticated';
  END IF;

  IF NOT public.private_is_staff_member() THEN
    RAISE EXCEPTION 'close_support_ticket: staff only';
  END IF;

  SELECT
    (status <> 'closed'),
    COALESCE(assigned_to, auth.uid())
  INTO v_was_open, v_staff_id
  FROM public.support_tickets
  WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'close_support_ticket: ticket not found';
  END IF;

  UPDATE public.support_tickets
  SET status = 'closed',
      closed_at = NOW(),
      updated_at = NOW(),
      assigned_to = COALESCE(assigned_to, auth.uid())
  WHERE id = p_ticket_id;

  IF v_was_open THEN
    PERFORM public.private_upsert_staff_stats(v_staff_id, 1, 0);
  END IF;

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

-- ── Staff replies bump message count ──────────────────────────

CREATE OR REPLACE FUNCTION public.ticket_messages_bump_staff_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_staff AND NOT NEW.is_auto AND NEW.sender_id IS NOT NULL THEN
    PERFORM public.private_upsert_staff_stats(NEW.sender_id, 0, 1);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ticket_messages_bump_staff_stats ON public.ticket_messages;
CREATE TRIGGER ticket_messages_bump_staff_stats
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.ticket_messages_bump_staff_stats();

-- ── get_staff_profile: live counts (not stale cache) ──────────

CREATE OR REPLACE FUNCTION public.get_staff_profile(p_staff_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.admin_emails ae
    JOIN public.profiles p ON lower(p.email) = lower(ae.email)
    WHERE p.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'get_staff_profile: staff only';
  END IF;

  SELECT jsonb_build_object(
    'username', p.username,
    'avatar_url', p.avatar_url,
    'email', ae.email,
    'role', ae.role,
    'tickets_closed', (
      SELECT COUNT(*)::int
      FROM public.support_tickets t
      WHERE t.assigned_to = p_staff_id AND t.status = 'closed'
    ),
    'avg_response_minutes', coalesce(ss.avg_response_minutes, 0),
    'avg_csat', coalesce(ss.avg_csat, 0),
    'total_messages', (
      SELECT COUNT(*)::int
      FROM public.ticket_messages m
      WHERE m.sender_id = p_staff_id AND m.is_staff = TRUE AND m.is_auto = FALSE
    ),
    'complaints', coalesce(ss.complaints, 0),
    'last_active', coalesce(ss.last_active, up.last_seen),
    'member_since', ae.created_at
  )
  INTO v_result
  FROM public.profiles p
  JOIN public.admin_emails ae ON lower(ae.email) = lower(p.email)
  LEFT JOIN public.staff_stats ss ON ss.staff_id = p.id
  LEFT JOIN public.user_presence up ON up.user_id = p.id
  WHERE p.id = p_staff_id;

  RETURN coalesce(v_result, '{}'::jsonb);
END;
$$;

-- ── Backfill assigned_to on already-closed tickets (best effort) ─

UPDATE public.support_tickets t
SET assigned_to = p.id
FROM public.profiles p
JOIN public.admin_emails ae ON lower(ae.email) = lower(p.email)
WHERE t.assigned_to IS NULL
  AND t.status = 'closed'
  AND t.updated_at IS NOT NULL
  AND p.id = (
    SELECT m.sender_id
    FROM public.ticket_messages m
    WHERE m.ticket_id = t.id
      AND m.is_staff = TRUE
      AND m.is_auto = FALSE
      AND m.sender_id IS NOT NULL
    ORDER BY m.created_at DESC
    LIMIT 1
  );

-- Rebuild staff_stats counters from source tables
INSERT INTO public.staff_stats (staff_id, tickets_closed, total_messages_sent, last_active, updated_at)
SELECT
  p.id,
  coalesce(closed.cnt, 0),
  coalesce(msgs.cnt, 0),
  NOW(),
  NOW()
FROM public.profiles p
JOIN public.admin_emails ae ON lower(ae.email) = lower(p.email)
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS cnt
  FROM public.support_tickets t
  WHERE t.assigned_to = p.id AND t.status = 'closed'
) closed ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS cnt
  FROM public.ticket_messages m
  WHERE m.sender_id = p.id AND m.is_staff = TRUE AND m.is_auto = FALSE
) msgs ON TRUE
ON CONFLICT (staff_id) DO UPDATE
SET tickets_closed = EXCLUDED.tickets_closed,
    total_messages_sent = EXCLUDED.total_messages_sent,
    updated_at = NOW();

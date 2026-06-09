-- MCU v3 — Support Tickets extensions (Session 12)
-- Tags, search_tickets, escalate_ticket, player snapshot

-- ── Ticket tags ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.support_ticket_tags (
  ticket_id  UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  tag        TEXT NOT NULL CHECK (tag IN ('bug', 'economy', 'marketplace', 'rng', 'account', 'abuse', 'urgent', 'vip')),
  added_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ticket_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_tags_tag ON public.support_ticket_tags(tag);

ALTER TABLE public.support_ticket_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_only_support_ticket_tags" ON public.support_ticket_tags;
CREATE POLICY "staff_only_support_ticket_tags" ON public.support_ticket_tags
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  );

-- ── search_tickets ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_tickets(p_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q TEXT;
  v_result JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_emails ae
    JOIN public.profiles p ON lower(p.email) = lower(ae.email)
    WHERE p.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'search_tickets: staff only';
  END IF;

  v_q := trim(coalesce(p_query, ''));
  IF length(v_q) < 2 THEN
    RETURN '[]'::JSONB;
  END IF;

  SELECT coalesce(jsonb_agg(row_data ORDER BY (row_data->>'updated_at') DESC), '[]'::JSONB)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', t.id,
      'subject', t.subject,
      'status', t.status,
      'user_id', t.user_id,
      'username', coalesce(pr.username, 'player'),
      'updated_at', t.updated_at,
      'snippet', coalesce(
        (
          SELECT substring(tm.body FROM 1 FOR 120)
          FROM public.ticket_messages tm
          WHERE tm.ticket_id = t.id
            AND tm.body IS NOT NULL
            AND tm.body ILIKE '%' || v_q || '%'
          ORDER BY tm.created_at DESC
          LIMIT 1
        ),
        substring(t.subject FROM 1 FOR 120)
      )
    ) AS row_data
    FROM public.support_tickets t
    JOIN public.profiles pr ON pr.id = t.user_id
    WHERE t.subject ILIKE '%' || v_q || '%'
       OR pr.username ILIKE '%' || v_q || '%'
       OR EXISTS (
         SELECT 1 FROM public.ticket_messages tm
         WHERE tm.ticket_id = t.id
           AND tm.body IS NOT NULL
           AND tm.body ILIKE '%' || v_q || '%'
       )
    ORDER BY t.updated_at DESC
    LIMIT 50
  ) hits;

  RETURN coalesce(v_result, '[]'::JSONB);
END;
$$;

-- ── escalate_ticket ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.escalate_ticket(
  p_ticket_id UUID,
  p_assign_to UUID,
  p_reason    TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reason TEXT;
  v_assignee_username TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'escalate_ticket: not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.admin_emails ae
    JOIN public.profiles p ON lower(p.email) = lower(ae.email)
    WHERE p.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'escalate_ticket: staff only';
  END IF;

  v_reason := trim(coalesce(p_reason, ''));
  IF v_reason = '' THEN
    RAISE EXCEPTION 'escalate_ticket: reason required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.support_tickets WHERE id = p_ticket_id
  ) THEN
    RAISE EXCEPTION 'escalate_ticket: ticket not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.admin_emails ae
    JOIN public.profiles p ON lower(p.email) = lower(ae.email)
    WHERE p.id = p_assign_to
      AND ae.role IN ('superadmin', 'admin', 'mod')
  ) THEN
    RAISE EXCEPTION 'escalate_ticket: assignee must be superadmin or mod';
  END IF;

  SELECT username INTO v_assignee_username
  FROM public.profiles WHERE id = p_assign_to;

  UPDATE public.support_tickets
  SET assigned_to = p_assign_to,
      status = 'in_progress',
      updated_at = NOW()
  WHERE id = p_ticket_id;

  INSERT INTO public.ticket_messages (ticket_id, sender_id, is_staff, body, is_auto)
  VALUES (
    p_ticket_id,
    auth.uid(),
    TRUE,
    '⬆ Escalated to @' || coalesce(v_assignee_username, 'staff') || ': ' || v_reason,
    FALSE
  );

  INSERT INTO public.admin_actions (admin_id, target_user_id, action_type, payload, reason)
  SELECT
    auth.uid(),
    t.user_id,
    'ticket_escalation',
    jsonb_build_object(
      'ticket_id', p_ticket_id,
      'assigned_to', p_assign_to,
      'assignee_username', v_assignee_username
    ),
    v_reason
  FROM public.support_tickets t
  WHERE t.id = p_ticket_id;
END;
$$;

-- ── get_ticket_player_snapshot ────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_ticket_player_snapshot(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_emails ae
    JOIN public.profiles p ON lower(p.email) = lower(ae.email)
    WHERE p.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'get_ticket_player_snapshot: staff only';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'get_ticket_player_snapshot: user not found';
  END IF;

  SELECT jsonb_build_object(
    'user_id', pr.id,
    'username', pr.username,
    'balance', coalesce(pr.balance, 0),
    'assets_count', (
      SELECT COUNT(*)::INTEGER FROM public.user_poxy up WHERE up.user_id = pr.id
    ),
    'rank', (
      SELECT rn FROM (
        SELECT p2.id,
          ROW_NUMBER() OVER (
            ORDER BY (SELECT COUNT(*) FROM public.user_poxy u2 WHERE u2.user_id = p2.id) DESC,
                     coalesce(p2.balance, 0) DESC
          )::INTEGER AS rn
        FROM public.profiles p2
      ) ranked WHERE ranked.id = pr.id
    ),
    'member_since', pr.created_at,
    'last_drops', coalesce((
      SELECT jsonb_agg(upper(coalesce(up.poxy_tier, 'common')) ORDER BY up.dropped_at DESC NULLS LAST)
      FROM (
        SELECT poxy_tier, dropped_at
        FROM public.user_poxy
        WHERE user_id = pr.id
        ORDER BY dropped_at DESC NULLS LAST
        LIMIT 3
      ) up
    ), '[]'::JSONB),
    'compensations_count', (
      SELECT COUNT(*)::INTEGER
      FROM public.admin_actions aa
      WHERE aa.target_user_id = pr.id
        AND aa.action_type = 'compensate_pc'
    ),
    'compensations_total_pc', coalesce((
      SELECT SUM((aa.payload->>'amount_added')::NUMERIC)
      FROM public.admin_actions aa
      WHERE aa.target_user_id = pr.id
        AND aa.action_type = 'compensate_pc'
    ), 0)
  )
  INTO v_result
  FROM public.profiles pr
  WHERE pr.id = p_user_id;

  RETURN coalesce(v_result, '{}'::JSONB);
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_tickets(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.escalate_ticket(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ticket_player_snapshot(UUID) TO authenticated;

-- ══════════════════════════════════════════════════════════════
-- Migration: support_v2
-- Session A — CSAT, staff stats, presence, abuse protection
-- Depends on: support_tickets, profiles, admin_emails, admin_actions,
--             private_notify_telegram (migration_telegram_notify*)
-- Apply via Supabase Dashboard → SQL Editor or supabase db push
-- ══════════════════════════════════════════════════════════════

-- ── Part 1: CSAT ratings ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ticket_ratings (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  UUID        NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating     INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ticket_ratings_ticket_id_key UNIQUE (ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_ratings_user ON public.ticket_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_ratings_ticket ON public.ticket_ratings(ticket_id);

-- ── Part 1: Staff performance stats ───────────────────────────

CREATE TABLE IF NOT EXISTS public.staff_stats (
  staff_id              UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  tickets_closed        INTEGER NOT NULL DEFAULT 0,
  avg_response_minutes  INTEGER NOT NULL DEFAULT 0,
  avg_csat              NUMERIC(3, 2) NOT NULL DEFAULT 0,
  total_messages_sent   INTEGER NOT NULL DEFAULT 0,
  complaints            INTEGER NOT NULL DEFAULT 0,
  last_active           TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Part 1: Online presence ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id    UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_online  BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── Part 4: Abuse protection columns ──────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ticket_banned_until TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS is_abuse BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS abuse_reason TEXT;

-- ── Part 4: Spam keywords ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.support_spam_keywords (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword    TEXT        NOT NULL UNIQUE,
  created_by UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.support_spam_keywords (keyword)
VALUES
  ('refund'),
  ('chargeback'),
  ('scam'),
  ('хочу деньги')
ON CONFLICT (keyword) DO NOTHING;

-- ── RLS ───────────────────────────────────────────────────────

ALTER TABLE public.ticket_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_spam_keywords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own_ratings" ON public.ticket_ratings;
CREATE POLICY "user_own_ratings" ON public.ticket_ratings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "staff_read_ratings" ON public.ticket_ratings;
CREATE POLICY "staff_read_ratings" ON public.ticket_ratings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "staff_stats_read" ON public.staff_stats;
CREATE POLICY "staff_stats_read" ON public.staff_stats
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "presence_owner_write" ON public.user_presence;
CREATE POLICY "presence_owner_write" ON public.user_presence
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "presence_staff_read" ON public.user_presence;
CREATE POLICY "presence_staff_read" ON public.user_presence
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "spam_keywords_staff" ON public.support_spam_keywords;
CREATE POLICY "spam_keywords_staff" ON public.support_spam_keywords
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

-- ── Realtime ──────────────────────────────────────────────────

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_ratings;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── Part 1 + Part 4: submit_ticket_rating (CSAT + abuse guard) ─

CREATE OR REPLACE FUNCTION public.submit_ticket_rating(
  p_ticket_id UUID,
  p_rating    INTEGER,
  p_comment   TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assigned UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'submit_ticket_rating: not authenticated';
  END IF;

  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'submit_ticket_rating: rating must be between 1 and 5';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.support_tickets
    WHERE id = p_ticket_id
      AND user_id = auth.uid()
      AND status = 'closed'
      AND closed_at IS NOT NULL
      AND closed_at <= NOW() - INTERVAL '5 minutes'
  ) THEN
    RAISE EXCEPTION 'Cannot rate this ticket';
  END IF;

  INSERT INTO public.ticket_ratings (ticket_id, user_id, rating, comment)
  VALUES (p_ticket_id, auth.uid(), p_rating, nullif(trim(p_comment), ''))
  ON CONFLICT (ticket_id) DO UPDATE
  SET rating = EXCLUDED.rating,
      comment = EXCLUDED.comment,
      created_at = NOW();

  IF p_rating = 1 AND coalesce(trim(p_comment), '') = '' THEN
    UPDATE public.support_tickets
    SET abuse_reason = coalesce(abuse_reason, 'suspicious_csat: rating=1 without comment')
    WHERE id = p_ticket_id;
  END IF;

  SELECT assigned_to INTO v_assigned
  FROM public.support_tickets
  WHERE id = p_ticket_id;

  IF v_assigned IS NOT NULL THEN
    INSERT INTO public.staff_stats (staff_id, avg_csat, updated_at)
    VALUES (v_assigned, 0, NOW())
    ON CONFLICT (staff_id) DO NOTHING;

    UPDATE public.staff_stats
    SET avg_csat = (
      SELECT ROUND(AVG(r.rating)::numeric, 2)
      FROM public.ticket_ratings r
      JOIN public.support_tickets t ON t.id = r.ticket_id
      WHERE t.assigned_to = staff_stats.staff_id
    ),
    updated_at = NOW()
    WHERE staff_id = v_assigned;
  END IF;
END;
$$;

-- ── Part 1: update_presence ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_presence(p_online BOOLEAN DEFAULT TRUE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'update_presence: not authenticated';
  END IF;

  INSERT INTO public.user_presence (user_id, last_seen, is_online)
  VALUES (auth.uid(), NOW(), coalesce(p_online, TRUE))
  ON CONFLICT (user_id) DO UPDATE
  SET last_seen = NOW(),
      is_online = coalesce(p_online, TRUE);
END;
$$;

-- ── Part 1: get_staff_profile ─────────────────────────────────

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
    'tickets_closed', coalesce(ss.tickets_closed, 0),
    'avg_response_minutes', coalesce(ss.avg_response_minutes, 0),
    'avg_csat', coalesce(ss.avg_csat, 0),
    'total_messages', coalesce(ss.total_messages_sent, 0),
    'complaints', coalesce(ss.complaints, 0),
    'last_active', ss.last_active,
    'member_since', ae.created_at
  )
  INTO v_result
  FROM public.profiles p
  JOIN public.admin_emails ae ON lower(ae.email) = lower(p.email)
  LEFT JOIN public.staff_stats ss ON ss.staff_id = p.id
  WHERE p.id = p_staff_id;

  RETURN coalesce(v_result, '{}'::jsonb);
END;
$$;

-- ── Part 4: create_support_ticket (abuse + telegram notify) ───

CREATE OR REPLACE FUNCTION public.create_support_ticket(
  p_subject       TEXT,
  p_first_message TEXT,
  p_image_url     TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_id   UUID;
  v_auto_msg    TEXT;
  v_username    TEXT;
  v_open_count  INTEGER;
  v_is_banned   BOOLEAN;
  v_spam_match  TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'create_support_ticket: not authenticated';
  END IF;

  IF coalesce(trim(p_subject), '') = '' THEN
    RAISE EXCEPTION 'create_support_ticket: subject required';
  END IF;

  IF coalesce(trim(p_first_message), '') = '' AND p_image_url IS NULL THEN
    RAISE EXCEPTION 'create_support_ticket: message or image required';
  END IF;

  SELECT coalesce(ticket_banned_until > NOW(), FALSE)
  INTO v_is_banned
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_is_banned THEN
    RAISE EXCEPTION 'TICKET_BANNED';
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_open_count
  FROM public.support_tickets
  WHERE user_id = auth.uid()
    AND status IN ('open', 'in_progress');

  IF v_open_count >= 3 THEN
    RAISE EXCEPTION 'MAX_OPEN_TICKETS';
  END IF;

  SELECT keyword
  INTO v_spam_match
  FROM public.support_spam_keywords
  WHERE lower(p_subject) LIKE '%' || lower(keyword) || '%'
     OR lower(coalesce(p_first_message, '')) LIKE '%' || lower(keyword) || '%'
  LIMIT 1;

  SELECT coalesce('@' || nullif(trim(username), ''), '@player')
  INTO v_username
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_username IS NULL THEN
    v_username := '@player';
  END IF;

  INSERT INTO public.support_tickets (user_id, subject, is_abuse)
  VALUES (auth.uid(), trim(p_subject), v_spam_match IS NOT NULL)
  RETURNING id INTO v_ticket_id;

  INSERT INTO public.ticket_messages (ticket_id, sender_id, is_staff, body, image_url)
  VALUES (
    v_ticket_id,
    auth.uid(),
    FALSE,
    nullif(trim(p_first_message), ''),
    p_image_url
  );

  IF v_spam_match IS NOT NULL THEN
    UPDATE public.support_tickets
    SET status = 'closed',
        closed_at = NOW(),
        updated_at = NOW(),
        abuse_reason = 'Auto-closed: spam keyword "' || v_spam_match || '"'
    WHERE id = v_ticket_id;

    RETURN v_ticket_id;
  END IF;

  SELECT body INTO v_auto_msg
  FROM public.support_auto_messages
  WHERE trigger = 'ticket_created' AND is_active = TRUE
  LIMIT 1;

  IF v_auto_msg IS NOT NULL THEN
    INSERT INTO public.ticket_messages (ticket_id, is_staff, body, is_auto)
    VALUES (v_ticket_id, TRUE, v_auto_msg, TRUE);
  END IF;

  PERFORM public.private_notify_telegram(jsonb_build_object(
    'type', 'new_ticket',
    'ticket_id', v_ticket_id,
    'ticket_id_short', RIGHT(v_ticket_id::TEXT, 6),
    'username', v_username,
    'subject', trim(p_subject),
    'created_at', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') || ' UTC'
  ));

  RETURN v_ticket_id;
END;
$$;

-- ── Part 4: ban_ticket_user ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.ban_ticket_user(
  p_user_id UUID,
  p_days    INTEGER,
  p_reason  TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'ban_ticket_user: not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.admin_emails ae
    JOIN public.profiles p ON lower(p.email) = lower(ae.email)
    WHERE p.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF p_days IS NULL OR p_days < 1 THEN
    RAISE EXCEPTION 'ban_ticket_user: p_days must be >= 1';
  END IF;

  IF coalesce(trim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'ban_ticket_user: reason required';
  END IF;

  UPDATE public.profiles
  SET ticket_banned_until = NOW() + (p_days || ' days')::INTERVAL
  WHERE id = p_user_id;

  INSERT INTO public.admin_actions (admin_id, target_user_id, action_type, payload, reason)
  VALUES (
    auth.uid(),
    p_user_id,
    'ticket_ban',
    jsonb_build_object('days', p_days),
    trim(p_reason)
  );
END;
$$;

-- ── Part 4: mark_ticket_abuse ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.mark_ticket_abuse(
  p_ticket_id UUID,
  p_reason    TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'mark_ticket_abuse: not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.admin_emails ae
    JOIN public.profiles p ON lower(p.email) = lower(ae.email)
    WHERE p.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF coalesce(trim(p_reason), '') = '' THEN
    RAISE EXCEPTION 'mark_ticket_abuse: reason required';
  END IF;

  UPDATE public.support_tickets
  SET is_abuse = TRUE,
      abuse_reason = trim(p_reason),
      updated_at = NOW()
  WHERE id = p_ticket_id;
END;
$$;

-- ── Grants ────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.submit_ticket_rating(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_presence(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_support_ticket(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ban_ticket_user(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_ticket_abuse(UUID, TEXT) TO authenticated;

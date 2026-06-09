-- ══════════════════════════════════════════════════════════════
-- Migration: telegram_notify
-- pg_net → notify_telegram Edge Function for support alerts
--
-- Setup (once, after deploy):
--   1. supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... POXY_NOTIFY_SECRET=...
--   2. In SQL Editor (same secret as POXY_NOTIFY_SECRET):
--        ALTER DATABASE postgres SET app.poxy_notify_secret = '<POXY_NOTIFY_SECRET>';
--      Or per-session for testing:
--        SELECT set_config('app.poxy_notify_secret', '<POXY_NOTIFY_SECRET>', false);
-- ══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Internal dispatcher (fire-and-forget via pg_net) ───────────

CREATE OR REPLACE FUNCTION public.private_notify_telegram(p_payload JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret TEXT;
  v_url    TEXT := 'https://rbrtjkfawdnomvvyxwvp.supabase.co/functions/v1/notify_telegram';
BEGIN
  v_secret := current_setting('app.poxy_notify_secret', true);
  IF coalesce(v_secret, '') = '' THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', v_secret
    ),
    body := p_payload
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'private_notify_telegram failed: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.private_notify_telegram(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.private_notify_telegram(JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.private_notify_telegram(JSONB) FROM authenticated;

-- ── create_support_ticket — notify on new ticket ───────────────

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
  v_ticket_id UUID;
  v_auto_msg  TEXT;
  v_username  TEXT;
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

  SELECT coalesce('@' || nullif(trim(username), ''), '@player')
  INTO v_username
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_username IS NULL THEN
    v_username := '@player';
  END IF;

  INSERT INTO public.support_tickets (user_id, subject)
  VALUES (auth.uid(), trim(p_subject))
  RETURNING id INTO v_ticket_id;

  INSERT INTO public.ticket_messages (ticket_id, sender_id, is_staff, body, image_url)
  VALUES (v_ticket_id, auth.uid(), FALSE, nullif(trim(p_first_message), ''), p_image_url);

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

-- ── ticket_messages trigger — notify on new player messages ────

CREATE OR REPLACE FUNCTION public.ticket_messages_notify_telegram()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_subject  TEXT;
  v_preview  TEXT;
  v_count    INT;
BEGIN
  IF NEW.is_staff OR NEW.is_auto THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)::INT
  INTO v_count
  FROM public.ticket_messages
  WHERE ticket_id = NEW.ticket_id
    AND is_staff = FALSE
    AND is_auto = FALSE;

  -- First player message is covered by create_support_ticket → new_ticket
  IF v_count <= 1 THEN
    RETURN NEW;
  END IF;

  SELECT
    coalesce('@' || nullif(trim(p.username), ''), '@player'),
    t.subject
  INTO v_username, v_subject
  FROM public.support_tickets t
  LEFT JOIN public.profiles p ON p.id = NEW.sender_id
  WHERE t.id = NEW.ticket_id;

  v_preview := LEFT(coalesce(nullif(trim(NEW.body), ''), '[image]'), 100);

  PERFORM public.private_notify_telegram(jsonb_build_object(
    'type', 'new_message',
    'ticket_id', NEW.ticket_id,
    'ticket_id_short', RIGHT(NEW.ticket_id::TEXT, 6),
    'username', coalesce(v_username, '@player'),
    'subject', coalesce(v_subject, 'Ticket'),
    'message_preview', v_preview,
    'created_at', to_char(NEW.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') || ' UTC'
  ));

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'ticket_messages_notify_telegram: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ticket_messages_notify_telegram ON public.ticket_messages;
CREATE TRIGGER ticket_messages_notify_telegram
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.ticket_messages_notify_telegram();

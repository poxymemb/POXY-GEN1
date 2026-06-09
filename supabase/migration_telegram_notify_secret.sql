-- ══════════════════════════════════════════════════════════════
-- Migration: telegram_notify_secret
-- Supabase SQL Editor cannot ALTER DATABASE custom params (42501).
-- Store notify secret in a locked table instead.
--
-- Setup (once) — paste your real POXY_NOTIFY_SECRET value:
--   INSERT INTO public.poxy_notify_config (id, notify_secret)
--   VALUES (1, 'your-secret-here')
--   ON CONFLICT (id) DO UPDATE SET notify_secret = EXCLUDED.notify_secret;
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.poxy_notify_config (
  id            SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  notify_secret TEXT NOT NULL DEFAULT ''
);

ALTER TABLE public.poxy_notify_config ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.poxy_notify_config FROM PUBLIC;
REVOKE ALL ON TABLE public.poxy_notify_config FROM anon;
REVOKE ALL ON TABLE public.poxy_notify_config FROM authenticated;

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
  SELECT notify_secret
  INTO v_secret
  FROM public.poxy_notify_config
  WHERE id = 1;

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

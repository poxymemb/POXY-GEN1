-- L3: Landing email subscribe + public stats for logged-out landing page
-- Idempotent — safe to re-run.

-- ── email_subscribers ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_subscribers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  source        TEXT NOT NULL DEFAULT 'landing',
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT email_subscribers_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS email_subscribers_subscribed_idx
  ON public.email_subscribers (subscribed_at DESC);

ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_subscribers_anon_insert ON public.email_subscribers;
CREATE POLICY email_subscribers_anon_insert ON public.email_subscribers
  FOR INSERT TO anon
  WITH CHECK (
    email IS NOT NULL
    AND length(trim(email)) >= 5
    AND position('@' IN email) > 1
  );

DROP POLICY IF EXISTS email_subscribers_auth_insert ON public.email_subscribers;
CREATE POLICY email_subscribers_auth_insert ON public.email_subscribers
  FOR INSERT TO authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(trim(email)) >= 5
    AND position('@' IN email) > 1
  );

-- Staff read via admin_emails join (no private_is_admin in RLS)
DROP POLICY IF EXISTS email_subscribers_staff_read ON public.email_subscribers;
CREATE POLICY email_subscribers_staff_read ON public.email_subscribers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  );

-- ── Public landing stats (aggregates only, no PII) ─────────────
CREATE OR REPLACE FUNCTION public.get_public_landing_stats()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_players', (SELECT COUNT(*)::BIGINT FROM public.profiles),
    'total_minted',  (SELECT COUNT(*)::BIGINT FROM public.user_poxy),
    'total_trades',  (SELECT COUNT(*)::BIGINT FROM public.marketplace WHERE status = 'sold')
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_public_landing_stats() TO anon, authenticated;

-- Allow anon landing to read economy overview aggregates
GRANT EXECUTE ON FUNCTION public.get_supply_overview() TO anon;

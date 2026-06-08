-- ══════════════════════════════════════════════════════════════
-- Migration: alert_system
-- Session 5 — Alert System module for POXY MCU
-- Apply via Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Dismissed alerts log
CREATE TABLE IF NOT EXISTS public.alert_dismissals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_key       TEXT        NOT NULL,
  dismissed_by    UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason          TEXT,
  alert_snapshot  JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_dismissals_created ON public.alert_dismissals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_dismissals_key     ON public.alert_dismissals(alert_key);

ALTER TABLE public.alert_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alert_dismissals_read"   ON public.alert_dismissals;
DROP POLICY IF EXISTS "alert_dismissals_insert" ON public.alert_dismissals;

CREATE POLICY "alert_dismissals_read" ON public.alert_dismissals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_emails ae
      JOIN public.profiles p ON p.email = ae.email
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "alert_dismissals_insert" ON public.alert_dismissals
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_emails ae
      JOIN public.profiles p ON p.email = ae.email
      WHERE p.id = auth.uid()
    )
  );


-- 2. CASE SPAM — users opening too many cases in a window
CREATE OR REPLACE FUNCTION public.check_case_spam(
  p_threshold INT,
  p_since     TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '1 hour')
)
RETURNS TABLE(
  alert_key  TEXT,
  severity   TEXT,
  alert_type TEXT,
  user_id    UUID,
  username   TEXT,
  message    TEXT,
  detail     JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    'case_spam:' || ce.user_id::text                          AS alert_key,
    'high'                                                    AS severity,
    'case_spam'                                               AS alert_type,
    ce.user_id,
    p.username,
    '@' || COALESCE(p.username, ce.user_id::text)
      || ' opened ' || COUNT(*)::text || ' cases in 1 hour'    AS message,
    jsonb_build_object('case_count', COUNT(*), 'since', p_since) AS detail
  FROM public.case_open_events ce
  JOIN public.profiles p ON p.id = ce.user_id
  WHERE ce.created_at >= p_since
  GROUP BY ce.user_id, p.username
  HAVING COUNT(*) >= p_threshold;
$$;

GRANT EXECUTE ON FUNCTION public.check_case_spam(INT, TIMESTAMPTZ) TO authenticated;


-- 3. BURN SPIKE — global burn volume in a short window
CREATE OR REPLACE FUNCTION public.check_burn_spike(
  p_threshold      INT,
  p_window_minutes INT DEFAULT 30
)
RETURNS TABLE(
  alert_key  TEXT,
  severity   TEXT,
  alert_type TEXT,
  user_id    UUID,
  username   TEXT,
  message    TEXT,
  detail     JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    'burn_spike:' || DATE_TRUNC('minute', NOW())::text        AS alert_key,
    'medium'                                                  AS severity,
    'burn_spike'                                              AS alert_type,
    NULL::uuid                                                AS user_id,
    NULL::text                                                AS username,
    'Spike burn: ' || v.cnt::text
      || ' assets in ' || p_window_minutes::text || ' min'    AS message,
    jsonb_build_object(
      'burn_count', v.cnt,
      'window_minutes', p_window_minutes
    ) AS detail
  FROM (
    SELECT COUNT(*)::int AS cnt
    FROM public.burn_log
    WHERE burned_at >= NOW() - (p_window_minutes || ' minutes')::interval
  ) v
  WHERE v.cnt >= p_threshold;
$$;

GRANT EXECUTE ON FUNCTION public.check_burn_spike(INT, INT) TO authenticated;


-- 4. NEW ACCOUNT OTC — young accounts with high-value marketplace listings
CREATE OR REPLACE FUNCTION public.check_new_account_otc(p_threshold NUMERIC DEFAULT 200)
RETURNS TABLE(
  alert_key  TEXT,
  severity   TEXT,
  alert_type TEXT,
  user_id    UUID,
  username   TEXT,
  message    TEXT,
  detail     JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    'new_otc:' || m.id::text                                  AS alert_key,
    'medium'                                                  AS severity,
    'new_account_otc'                                         AS alert_type,
    m.seller_id                                               AS user_id,
    p.username,
    'New account @' || COALESCE(p.username, m.seller_id::text)
      || ': OTC listing ' || m.price::text || ' PC'           AS message,
    jsonb_build_object(
      'listing_id', m.id,
      'price', m.price,
      'account_age_hours',
        EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600
    ) AS detail
  FROM public.marketplace m
  JOIN public.profiles p ON p.id = m.seller_id
  WHERE m.status = 'active'
    AND m.price >= p_threshold
    AND p.created_at >= NOW() - INTERVAL '7 days';
$$;

GRANT EXECUTE ON FUNCTION public.check_new_account_otc(NUMERIC) TO authenticated;


-- 5. LARGE TRANSFER — recent high-value marketplace sales
CREATE OR REPLACE FUNCTION public.check_large_transfers(
  p_threshold NUMERIC DEFAULT 1000,
  p_since     TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '1 hour')
)
RETURNS TABLE(
  alert_key  TEXT,
  severity   TEXT,
  alert_type TEXT,
  user_id    UUID,
  username   TEXT,
  message    TEXT,
  detail     JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    'large_transfer:' || m.id::text                           AS alert_key,
    'medium'                                                  AS severity,
    'large_transfer'                                          AS alert_type,
    m.seller_id                                               AS user_id,
    p.username,
    'Large sale: @' || COALESCE(p.username, m.seller_id::text)
      || ' — ' || m.price::text || ' PC'                      AS message,
    jsonb_build_object(
      'listing_id', m.id,
      'price', m.price,
      'sold_at', m.updated_at
    ) AS detail
  FROM public.marketplace m
  JOIN public.profiles p ON p.id = m.seller_id
  WHERE m.status = 'sold'
    AND m.price >= p_threshold
    AND m.updated_at >= p_since;
$$;

GRANT EXECUTE ON FUNCTION public.check_large_transfers(NUMERIC, TIMESTAMPTZ) TO authenticated;


-- 6. STUCK MINT ROUNDS — committed RNG rounds with no drop (proxy for failed mints)
CREATE OR REPLACE FUNCTION public.check_stuck_mint_rounds(p_threshold INT DEFAULT 5)
RETURNS TABLE(
  alert_key  TEXT,
  severity   TEXT,
  alert_type TEXT,
  user_id    UUID,
  username   TEXT,
  message    TEXT,
  detail     JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    'stuck_mint:' || r.user_id::text                          AS alert_key,
    'info'                                                    AS severity,
    'failed_mint'                                               AS alert_type,
    r.user_id,
    p.username,
    COALESCE(p.username, r.user_id::text)
      || ': ' || COUNT(*)::text
      || ' stuck mint rounds (no drop)'                       AS message,
    jsonb_build_object('stuck_count', COUNT(*))               AS detail
  FROM public.rng_rounds r
  JOIN public.profiles p ON p.id = r.user_id
  LEFT JOIN public.user_poxy up ON up.rng_round_id = r.id
  WHERE r.status = 'committed'
    AND up.id IS NULL
    AND r.committed_at >= NOW() - INTERVAL '1 hour'
    AND r.committed_at <  NOW() - INTERVAL '15 minutes'
  GROUP BY r.user_id, p.username
  HAVING COUNT(*) >= p_threshold;
$$;

GRANT EXECUTE ON FUNCTION public.check_stuck_mint_rounds(INT) TO authenticated;


-- 7. DISMISS an alert
CREATE OR REPLACE FUNCTION public.dismiss_alert(
  p_alert_key      TEXT,
  p_reason         TEXT DEFAULT '',
  p_alert_snapshot JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.alert_dismissals(alert_key, dismissed_by, reason, alert_snapshot)
  VALUES (p_alert_key, auth.uid(), p_reason, p_alert_snapshot)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dismiss_alert(TEXT, TEXT, JSONB) TO authenticated;


-- 8. DISMISSED HISTORY
CREATE OR REPLACE FUNCTION public.get_dismissed_alerts(p_limit INT DEFAULT 20)
RETURNS TABLE(
  id                    UUID,
  alert_key             TEXT,
  dismissed_by          UUID,
  dismissed_by_username TEXT,
  reason                TEXT,
  alert_snapshot        JSONB,
  created_at            TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ad.id,
    ad.alert_key,
    ad.dismissed_by,
    dp.username AS dismissed_by_username,
    ad.reason,
    ad.alert_snapshot,
    ad.created_at
  FROM public.alert_dismissals ad
  LEFT JOIN public.profiles dp ON dp.id = ad.dismissed_by
  ORDER BY ad.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_dismissed_alerts(INT) TO authenticated;

-- ══════════════════════════════════════════════════════════════
-- NOTE: requires admin_emails table + case_open_events, burn_log,
-- marketplace, rng_rounds, user_poxy.
-- ══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
-- Migration: economy_health
-- Session 4 — Economy Health module for POXY MCU
-- Apply via Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. RARITY DISTRIBUTION
--    Returns count of active (non-burned) assets per tier from user_poxy.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_rarity_distribution()
RETURNS TABLE(tier TEXT, cnt BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    poxy_tier AS tier,
    COUNT(*)  AS cnt
  FROM public.user_poxy
  GROUP BY poxy_tier
  ORDER BY
    CASE poxy_tier
      WHEN 'common'    THEN 1
      WHEN 'uncommon'  THEN 2
      WHEN 'rare'      THEN 3
      WHEN 'epic'      THEN 4
      WHEN 'legendary' THEN 5
      WHEN 'mythic'    THEN 6
      WHEN 'secret'    THEN 7
      ELSE 8
    END;
$$;

GRANT EXECUTE ON FUNCTION public.get_rarity_distribution() TO authenticated;


-- 2. ECONOMY METRICS (mint vs burn, 7-day window)
--    Returns one row per day for the last `days` days with:
--      mints    — user_poxy rows created that day (case_open_events)
--      burns    — burn_log rows that day
--      net      — mints - burns
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_economy_metrics(days INT DEFAULT 7)
RETURNS TABLE(
  day        DATE,
  mints      BIGINT,
  burns      BIGINT,
  net        BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH date_series AS (
    SELECT generate_series(
      (CURRENT_DATE - (days - 1) * INTERVAL '1 day'),
      CURRENT_DATE,
      INTERVAL '1 day'
    )::date AS day
  ),
  daily_mints AS (
    SELECT DATE(dropped_at) AS day, COUNT(*) AS cnt
    FROM   public.user_poxy
    WHERE  dropped_at >= CURRENT_DATE - (days - 1) * INTERVAL '1 day'
    GROUP  BY DATE(dropped_at)
  ),
  daily_burns AS (
    SELECT DATE(burned_at) AS day, COUNT(*) AS cnt
    FROM   public.burn_log
    WHERE  burned_at >= CURRENT_DATE - (days - 1) * INTERVAL '1 day'
    GROUP  BY DATE(burned_at)
  )
  SELECT
    ds.day,
    COALESCE(dm.cnt, 0) AS mints,
    COALESCE(db.cnt, 0) AS burns,
    COALESCE(dm.cnt, 0) - COALESCE(db.cnt, 0) AS net
  FROM   date_series ds
  LEFT   JOIN daily_mints dm ON dm.day = ds.day
  LEFT   JOIN daily_burns db ON db.day = ds.day
  ORDER  BY ds.day;
$$;

GRANT EXECUTE ON FUNCTION public.get_economy_metrics(INT) TO authenticated;


-- 3. SUPPLY OVERVIEW STATS
--    Single-row snapshot: total_pc, total_burns, total_minted, total_players
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_supply_overview()
RETURNS TABLE(
  total_pc_circulation  NUMERIC,
  total_pc_spent        NUMERIC,
  total_minted          BIGINT,
  total_burned          BIGINT,
  total_players         BIGINT,
  inflation_rate_7d     NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH week_mints AS (
    SELECT COUNT(*) AS cnt FROM public.user_poxy
    WHERE  dropped_at >= NOW() - INTERVAL '7 days'
  ),
  week_burns AS (
    SELECT COUNT(*) AS cnt FROM public.burn_log
    WHERE  burned_at >= NOW() - INTERVAL '7 days'
  )
  SELECT
    (SELECT COALESCE(SUM(balance), 0) FROM public.profiles)                 AS total_pc_circulation,
    (SELECT COALESCE(SUM(dust),    0) FROM public.profiles)                 AS total_pc_spent,
    (SELECT COUNT(*)                  FROM public.user_poxy)                AS total_minted,
    (SELECT COUNT(*)                  FROM public.burn_log)                 AS total_burned,
    (SELECT COUNT(*)                  FROM public.profiles)                 AS total_players,
    CASE
      WHEN (SELECT cnt FROM week_burns) = 0 THEN 100
      ELSE ROUND(
        ((SELECT cnt::numeric FROM week_mints) - (SELECT cnt::numeric FROM week_burns))
        / NULLIF((SELECT cnt::numeric FROM week_burns), 0) * 100, 1
      )
    END AS inflation_rate_7d;
$$;

GRANT EXECUTE ON FUNCTION public.get_supply_overview() TO authenticated;


-- ══════════════════════════════════════════════════════════════
-- NOTE: All three RPCs are SECURITY DEFINER so they bypass RLS
-- on burn_log / user_poxy for aggregate reads. They return only
-- aggregated counts — no PII exposed.
-- ══════════════════════════════════════════════════════════════

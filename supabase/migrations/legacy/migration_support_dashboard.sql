-- Support Dashboard RPC (Session 10)
-- get_support_dashboard(p_days) — metrics for tab-supportdash

CREATE OR REPLACE FUNCTION public.get_support_dashboard(p_days INTEGER DEFAULT 14)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_start TIMESTAMPTZ;
  v_week_start TIMESTAMPTZ;
  v_month_start TIMESTAMPTZ;
  v_period_start TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_emails ae
    JOIN public.profiles p ON lower(p.email) = lower(ae.email)
    WHERE p.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'get_support_dashboard: staff only';
  END IF;

  p_days := GREATEST(LEAST(coalesce(p_days, 14), 30), 7);
  v_today_start := date_trunc('day', NOW());
  v_week_start := v_today_start - INTERVAL '7 days';
  v_month_start := v_today_start - INTERVAL '30 days';
  v_period_start := v_today_start - ((p_days - 1) || ' days')::INTERVAL;

  SELECT jsonb_build_object(
    'today', jsonb_build_object(
      'opened', (
        SELECT COUNT(*)::INTEGER FROM public.support_tickets
        WHERE created_at >= v_today_start
      ),
      'closed', (
        SELECT COUNT(*)::INTEGER FROM public.support_tickets
        WHERE closed_at >= v_today_start
      ),
      'in_progress', (
        SELECT COUNT(*)::INTEGER FROM public.support_tickets
        WHERE status = 'in_progress'
      ),
      'sla_breach', (
        WITH last_player AS (
          SELECT tm.ticket_id, MAX(tm.created_at) AS last_at
          FROM public.ticket_messages tm
          WHERE tm.is_staff = FALSE AND tm.is_auto = FALSE
          GROUP BY tm.ticket_id
        )
        SELECT COUNT(*)::INTEGER
        FROM public.support_tickets t
        JOIN last_player lp ON lp.ticket_id = t.id
        WHERE t.status IN ('open', 'in_progress')
          AND lp.last_at < NOW() - INTERVAL '4 hours'
          AND NOT EXISTS (
            SELECT 1 FROM public.ticket_messages sm
            WHERE sm.ticket_id = t.id
              AND sm.is_staff = TRUE
              AND sm.is_auto = FALSE
              AND sm.created_at > lp.last_at
          )
      )
    ),
    'csat', jsonb_build_object(
      'week_avg', coalesce((
        SELECT ROUND(AVG(tr.rating)::NUMERIC, 2)
        FROM public.ticket_ratings tr
        WHERE tr.created_at >= v_week_start
      ), 0),
      'month_avg', coalesce((
        SELECT ROUND(AVG(tr.rating)::NUMERIC, 2)
        FROM public.ticket_ratings tr
        WHERE tr.created_at >= v_month_start
      ), 0)
    ),
    'volume', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', d.day::TEXT,
          'opened', coalesce(o.cnt, 0),
          'closed', coalesce(c.cnt, 0)
        )
        ORDER BY d.day
      )
      FROM (
        SELECT generate_series(v_period_start::DATE, v_today_start::DATE, '1 day'::INTERVAL)::DATE AS day
      ) d
      LEFT JOIN (
        SELECT created_at::DATE AS day, COUNT(*)::INTEGER AS cnt
        FROM public.support_tickets
        WHERE created_at >= v_period_start
        GROUP BY 1
      ) o ON o.day = d.day
      LEFT JOIN (
        SELECT closed_at::DATE AS day, COUNT(*)::INTEGER AS cnt
        FROM public.support_tickets
        WHERE closed_at >= v_period_start
        GROUP BY 1
      ) c ON c.day = d.day
    ), '[]'::JSONB),
    'heatmap', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object('hour', h.hour, 'count', coalesce(x.cnt, 0))
        ORDER BY h.hour
      )
      FROM generate_series(0, 23) AS h(hour)
      LEFT JOIN (
        SELECT EXTRACT(HOUR FROM created_at)::INTEGER AS hour, COUNT(*)::INTEGER AS cnt
        FROM public.support_tickets
        WHERE created_at >= v_month_start
        GROUP BY 1
      ) x ON x.hour = h.hour
    ), '[]'::JSONB),
    'top_tags', coalesce((
      SELECT jsonb_agg(jsonb_build_object('tag', top5.tag, 'count', top5.cnt) ORDER BY top5.cnt DESC)
      FROM (
        SELECT tag, COUNT(*)::INTEGER AS cnt
        FROM (
          SELECT CASE
            WHEN subject ILIKE '%bug%' OR subject ILIKE '%error%' OR subject ILIKE '%broken%' THEN 'bug'
            WHEN subject ILIKE '%econom%' OR subject ILIKE '%coin%' OR subject ILIKE '% pc%' OR subject ILIKE '%balance%' THEN 'economy'
            WHEN subject ILIKE '%market%' OR subject ILIKE '%trade%' OR subject ILIKE '%otc%' THEN 'marketplace'
            WHEN subject ILIKE '%rng%' OR subject ILIKE '%drop%' OR subject ILIKE '%gacha%' OR subject ILIKE '%loot%' THEN 'rng'
            WHEN subject ILIKE '%account%' OR subject ILIKE '%login%' OR subject ILIKE '%password%' THEN 'account'
            WHEN is_abuse = TRUE OR subject ILIKE '%abuse%' OR subject ILIKE '%scam%' THEN 'abuse'
            WHEN subject ILIKE '%urgent%' OR subject ILIKE '%asap%' THEN 'urgent'
            WHEN subject ILIKE '%vip%' OR subject ILIKE '%founder%' THEN 'vip'
            ELSE 'general'
          END AS tag
          FROM public.support_tickets
          WHERE created_at >= v_period_start
        ) tagged
        GROUP BY tag
        ORDER BY COUNT(*) DESC
        LIMIT 5
      ) top5
    ), '[]'::JSONB),
    'csat_distribution', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'rating', r.rating,
          'count', r.cnt,
          'pct', CASE WHEN t.total > 0 THEN ROUND((r.cnt::NUMERIC / t.total) * 100, 1) ELSE 0 END
        )
        ORDER BY r.rating DESC
      )
      FROM (
        SELECT rating, COUNT(*)::INTEGER AS cnt
        FROM public.ticket_ratings
        WHERE created_at >= v_period_start
        GROUP BY rating
      ) r
      CROSS JOIN (
        SELECT COUNT(*)::INTEGER AS total
        FROM public.ticket_ratings
        WHERE created_at >= v_period_start
      ) t
    ), '[]'::JSONB),
    'staff', coalesce((
      SELECT jsonb_agg(row_data ORDER BY (row_data->>'tickets_closed')::INTEGER DESC, (row_data->>'avg_csat')::NUMERIC DESC)
      FROM (
        SELECT jsonb_build_object(
          'profile_id', p.id,
          'username', p.username,
          'avatar_url', p.avatar_url,
          'tickets_closed', coalesce(cl.cnt, 0),
          'avg_csat', coalesce(ss.avg_csat, 0),
          'avg_response_minutes', coalesce(ss.avg_response_minutes, 0)
        ) AS row_data
        FROM public.profiles p
        INNER JOIN public.admin_emails ae ON lower(ae.email) = lower(p.email)
        LEFT JOIN public.staff_stats ss ON ss.staff_id = p.id
        LEFT JOIN (
          SELECT assigned_to, COUNT(*)::INTEGER AS cnt
          FROM public.support_tickets
          WHERE status = 'closed'
            AND closed_at >= v_period_start
            AND assigned_to IS NOT NULL
          GROUP BY assigned_to
        ) cl ON cl.assigned_to = p.id
        WHERE ae.role IN ('superadmin', 'admin', 'mod', 'support')
      ) staff_rows
    ), '[]'::JSONB)
  ) INTO v_result;

  RETURN coalesce(v_result, '{}'::JSONB);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_support_dashboard(INTEGER) TO authenticated;

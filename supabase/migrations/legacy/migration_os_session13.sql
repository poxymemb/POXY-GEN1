-- Session 13: Quick reply categories + staff shifts + online staff

-- ── Quick reply categories ────────────────────────────────────

ALTER TABLE public.support_quick_replies
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';

ALTER TABLE public.support_quick_replies
  DROP CONSTRAINT IF EXISTS support_quick_replies_category_check;

ALTER TABLE public.support_quick_replies
  ADD CONSTRAINT support_quick_replies_category_check
  CHECK (category IN ('technical', 'economy', 'marketplace', 'general', 'refusals'));

UPDATE public.support_quick_replies SET category = 'technical'
WHERE category = 'general' AND (
  title ILIKE '%rng%' OR title ILIKE '%serial%' OR title ILIKE '%serial%' OR title ILIKE '%аккаунт%'
  OR title ILIKE '%account%' OR title ILIKE '%craft%' OR title ILIKE '%кейс%' OR title ILIKE '%dev%'
  OR title ILIKE '%faq%' OR title ILIKE '%техн%'
);

UPDATE public.support_quick_replies SET category = 'economy'
WHERE category = 'general' AND (
  title ILIKE '%баланс%' OR title ILIKE '%pc%' OR title ILIKE '%dust%' OR title ILIKE '%founder%'
  OR title ILIKE '%эконом%'
);

UPDATE public.support_quick_replies SET category = 'marketplace'
WHERE category = 'general' AND (
  title ILIKE '%маркет%' OR title ILIKE '%market%' OR title ILIKE '%otc%' OR title ILIKE '%листинг%'
  OR title ILIKE '%trade%'
);

UPDATE public.support_quick_replies SET category = 'refusals'
WHERE category = 'general' AND (
  title ILIKE '%возврат%' OR title ILIKE '%refund%' OR title ILIKE '%невозможен%' OR title ILIKE '%refusal%'
);

-- ── Staff shifts ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.staff_shifts (
  staff_id   UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'online'
               CHECK (status IN ('online', 'away', 'busy', 'offline')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_shifts_read" ON public.staff_shifts;
CREATE POLICY "staff_shifts_read" ON public.staff_shifts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "staff_shifts_upsert_own" ON public.staff_shifts;
CREATE POLICY "staff_shifts_upsert_own" ON public.staff_shifts
  FOR ALL
  USING (staff_id = auth.uid())
  WITH CHECK (staff_id = auth.uid());

CREATE OR REPLACE FUNCTION public.upsert_staff_shift(p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'upsert_staff_shift: not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.admin_emails ae
    JOIN public.profiles p ON lower(p.email) = lower(ae.email)
    WHERE p.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'upsert_staff_shift: staff only';
  END IF;

  p_status := lower(trim(coalesce(p_status, 'online')));
  IF p_status NOT IN ('online', 'away', 'busy', 'offline') THEN
    RAISE EXCEPTION 'upsert_staff_shift: invalid status';
  END IF;

  INSERT INTO public.staff_shifts (staff_id, status, updated_at)
  VALUES (auth.uid(), p_status, NOW())
  ON CONFLICT (staff_id)
  DO UPDATE SET status = EXCLUDED.status, updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_online_staff()
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
    RAISE EXCEPTION 'get_online_staff: staff only';
  END IF;

  SELECT coalesce(jsonb_agg(row_data ORDER BY sort_key, username), '[]'::JSONB)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'profile_id', p.id,
      'username', p.username,
      'avatar_url', p.avatar_url,
      'status', coalesce(ss.status, 'offline'),
      'updated_at', ss.updated_at
    ) AS row_data,
    CASE coalesce(ss.status, 'offline')
      WHEN 'online' THEN 0
      WHEN 'away' THEN 1
      WHEN 'busy' THEN 2
      ELSE 9
    END AS sort_key,
    p.username
    FROM public.admin_emails ae
    JOIN public.profiles p ON lower(p.email) = lower(ae.email)
    LEFT JOIN public.staff_shifts ss ON ss.staff_id = p.id
    WHERE p.id IS NOT NULL
      AND coalesce(ss.status, 'offline') IN ('online', 'away', 'busy')
  ) rows;

  RETURN coalesce(v_result, '[]'::JSONB);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_staff_shift(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_online_staff() TO authenticated;

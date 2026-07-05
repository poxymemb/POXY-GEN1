-- S2: Rate limiting for Edge Functions (atomic windowed counter)
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- No client policies — only service-role / SECURITY DEFINER RPC may touch this table.

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_max INTEGER DEFAULT 30,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_start TIMESTAMPTZ;
BEGIN
  IF p_key IS NULL OR length(trim(p_key)) = 0 THEN
    RETURN FALSE;
  END IF;

  IF p_max IS NULL OR p_max < 1 THEN
    RETURN FALSE;
  END IF;

  IF p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    RETURN FALSE;
  END IF;

  SELECT count, window_start
  INTO v_count, v_start
  FROM public.rate_limit_log
  WHERE key = p_key
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.rate_limit_log (key, count, window_start)
    VALUES (p_key, 1, NOW());
    RETURN TRUE;
  END IF;

  IF v_start < NOW() - make_interval(secs => p_window_seconds) THEN
    UPDATE public.rate_limit_log
    SET count = 1, window_start = NOW()
    WHERE key = p_key;
    RETURN TRUE;
  END IF;

  IF v_count >= p_max THEN
    RETURN FALSE;
  END IF;

  UPDATE public.rate_limit_log
  SET count = count + 1
  WHERE key = p_key;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

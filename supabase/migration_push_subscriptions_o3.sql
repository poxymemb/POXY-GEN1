-- O3: Web Push subscriptions table + save RPC

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_push" ON public.push_subscriptions;
CREATE POLICY "own_push" ON public.push_subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.save_push_subscription(p_subscription JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_AUTHENTICATED');
  END IF;
  IF p_subscription IS NULL OR p_subscription = 'null'::jsonb OR NOT (p_subscription ? 'endpoint') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_SUBSCRIPTION');
  END IF;

  INSERT INTO public.push_subscriptions (user_id, subscription, updated_at)
  VALUES (v_uid, p_subscription, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET subscription = EXCLUDED.subscription,
        updated_at = NOW();

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.save_push_subscription(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_push_subscription(JSONB) TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

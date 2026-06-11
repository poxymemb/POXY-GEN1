-- O1: New player onboarding — metadata flag, secure free case grant, completion XP

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.grant_onboarding_free_case()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_created   TIMESTAMPTZ;
  v_meta      JSONB;
  v_dragons   INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  SELECT created_at, COALESCE(metadata, '{}'::jsonb)
  INTO v_created, v_meta
  FROM public.profiles
  WHERE id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'PROFILE_NOT_FOUND');
  END IF;

  IF COALESCE(v_meta->>'onboarding_done', 'false') = 'true' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ONBOARDING_COMPLETE');
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_dragons
  FROM public.user_poxy
  WHERE user_id = v_uid;

  IF v_dragons > 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ALREADY_HAS_DRAGON');
  END IF;

  IF v_created IS NULL OR (NOW() - v_created) > INTERVAL '10 minutes' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ONBOARDING_WINDOW_EXPIRED');
  END IF;

  IF COALESCE(v_meta->>'onboarding_case_granted', 'false') = 'true' THEN
    RETURN jsonb_build_object('ok', true, 'already_granted', true);
  END IF;

  PERFORM public.grant_case_token(v_uid, 'standard', 1);

  UPDATE public.profiles
  SET metadata = v_meta || jsonb_build_object('onboarding_case_granted', true)
  WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true, 'already_granted', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_onboarding()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_meta  JSONB;
  v_xp    JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  SELECT COALESCE(metadata, '{}'::jsonb) INTO v_meta
  FROM public.profiles
  WHERE id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'PROFILE_NOT_FOUND');
  END IF;

  IF COALESCE(v_meta->>'onboarding_done', 'false') = 'true' THEN
    RETURN jsonb_build_object('ok', true, 'already_complete', true);
  END IF;

  UPDATE public.profiles
  SET metadata = v_meta || jsonb_build_object('onboarding_done', true)
  WHERE id = v_uid;

  v_xp := public.award_xp(v_uid, 500, 'ONBOARDING_COMPLETE', 'Welcome tour complete');

  RETURN jsonb_build_object(
    'ok', true,
    'already_complete', false,
    'xp_awarded', COALESCE((v_xp->>'xp_awarded')::INTEGER, 500)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grant_onboarding_free_case() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_onboarding() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_onboarding_free_case() TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_onboarding() TO authenticated;

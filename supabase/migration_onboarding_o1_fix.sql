-- Fix: allow onboarding free case for any eligible new player (no 10-minute window)
-- Eligibility: no dragons yet, onboarding not completed, one-time grant flag

CREATE OR REPLACE FUNCTION public.grant_onboarding_free_case()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID := auth.uid();
  v_meta      JSONB;
  v_dragons   INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  SELECT COALESCE(metadata, '{}'::jsonb)
  INTO v_meta
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

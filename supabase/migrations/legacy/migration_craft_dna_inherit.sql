-- ══════════════════════════════════════════════════════════════
-- Migration: craft_dna_inherit — optional DNA trait on craft upgrade
-- ══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.craft_upgrade(UUID, UUID[]);

CREATE OR REPLACE FUNCTION public.craft_upgrade(
  p_user_id        UUID,
  p_poxy_ids       UUID[],
  p_inherit_trait  JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count        INT;
  v_all_common   INT;
  v_listed       INT;
  v_new_id       UUID;
  v_serial       TEXT;
  v_traits       JSONB := '{}'::jsonb;
  v_hash         TEXT;
  v_cat          TEXT;
  v_source_id    UUID;
  v_source_traits JSONB;
  v_inherited    JSONB;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;
  IF p_poxy_ids IS NULL OR array_length(p_poxy_ids, 1) <> 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Need exactly 5 POXY');
  END IF;

  SELECT count(*) INTO v_count
  FROM public.user_poxy
  WHERE id = ANY(p_poxy_ids) AND user_id = p_user_id;

  IF v_count <> 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Items not yours');
  END IF;

  SELECT count(*) INTO v_all_common
  FROM public.user_poxy
  WHERE id = ANY(p_poxy_ids) AND user_id = p_user_id AND poxy_tier = 'common';

  IF v_all_common <> 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'All 5 must be Common');
  END IF;

  SELECT count(*) INTO v_listed
  FROM public.marketplace
  WHERE poxy_id = ANY(p_poxy_ids) AND status = 'active';
  IF v_listed > 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'One or more items are listed');
  END IF;

  IF p_inherit_trait IS NOT NULL AND p_inherit_trait <> 'null'::jsonb THEN
    v_cat := p_inherit_trait->>'category';
    v_source_id := NULLIF(p_inherit_trait->>'source_id', '')::UUID;

    IF v_cat IS NULL OR v_cat = '' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Invalid inherit trait category');
    END IF;
    IF v_source_id IS NULL OR NOT (v_source_id = ANY(p_poxy_ids)) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Inherit source must be one of the crafted POXY');
    END IF;

    SELECT traits INTO v_source_traits
    FROM public.user_poxy
    WHERE id = v_source_id AND user_id = p_user_id;

    v_inherited := v_source_traits -> v_cat;
    IF v_inherited IS NULL OR v_inherited = 'null'::jsonb THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Source POXY has no trait in that category');
    END IF;
    v_traits := jsonb_build_object(v_cat, v_inherited);
  END IF;

  DELETE FROM public.user_poxy WHERE id = ANY(p_poxy_ids) AND user_id = p_user_id;

  v_serial := 'CR-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  IF v_traits <> '{}'::jsonb THEN
    v_hash := encode(extensions.digest(convert_to(v_traits::text, 'UTF8'), 'sha256'), 'hex');
    INSERT INTO public.user_poxy (user_id, poxy_tier, serial_number, case_origin, traits, dna_hash)
    VALUES (p_user_id, 'uncommon', v_serial, 'craft', v_traits, v_hash)
    RETURNING id INTO v_new_id;
  ELSE
    INSERT INTO public.user_poxy (user_id, poxy_tier, serial_number, case_origin)
    VALUES (p_user_id, 'uncommon', v_serial, 'craft')
    RETURNING id INTO v_new_id;
  END IF;

  PERFORM public.award_xp(p_user_id, 50, 'CRAFT', 'Crafted 5 Common → 1 Uncommon');

  RETURN jsonb_build_object(
    'ok', true,
    'new_id', v_new_id,
    'serial', v_serial,
    'inherited', CASE WHEN v_traits <> '{}'::jsonb THEN v_traits ELSE NULL END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.craft_upgrade(UUID, UUID[], JSONB) TO authenticated;

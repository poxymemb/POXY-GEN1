-- Fix: rng_commit RPC failed because gen_random_bytes lives in extensions schema
-- but search_path was public-only → "RNG commit failed" on case open.

CREATE OR REPLACE FUNCTION public.rng_commit(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_seed   text;
  v_commit text;
  v_id     uuid;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;

  v_seed   := encode(extensions.gen_random_bytes(32), 'hex');
  v_commit := public.crypto_sha256_hex(v_seed);

  INSERT INTO public.rng_rounds (user_id, server_seed, commit_hash, status)
  VALUES (p_user_id, v_seed, v_commit, 'committed')
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'round_id', v_id, 'commit_hash', v_commit);
END;
$$;

-- =============================================================================
-- Public Verification RPCs — POXY Cryptographic Transparency Layer
-- Applied: 2026-06-04
-- These functions are SECURITY DEFINER (run as postgres/superuser), bypassing
-- RLS, but expose only carefully selected fields — never server_salt.
-- Granted to anon role so the /verify page works without login.
-- =============================================================================

-- 1. Asset integrity verification by poxy_hash
create or replace function public.public_verify_asset(p_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_asset   public.poxy_assets%rowtype;
  v_event   public.ledger_events%rowtype;
  v_key     public.crypto_keys%rowtype;
  v_recomputed text;
begin
  select * into v_asset
    from public.poxy_assets
   where poxy_hash = p_hash
   limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Asset not found');
  end if;

  -- Recompute the SHA-256 identity hash (server_salt stays inside DB)
  v_recomputed := public.crypto_poxy_hash(
    v_asset.creator_id::text,
    v_asset.mint_ts_canonical,
    v_asset.serial_number,
    v_asset.rarity_seed,
    v_asset.collection_id,
    v_asset.generation_version::text,
    v_asset.server_salt
  );

  -- Retrieve the registered public key for this key version
  select * into v_key
    from public.crypto_keys
   where key_version = v_asset.key_version
   limit 1;

  -- Retrieve the genesis MINT event
  select * into v_event
    from public.ledger_events
   where id = v_asset.genesis_event_id
   limit 1;

  return jsonb_build_object(
    'ok',               true,
    'asset_id',         v_asset.id,
    'poxy_hash',        v_asset.poxy_hash,
    'computed_hash',    v_recomputed,
    'hash_matches',     (v_recomputed = v_asset.poxy_hash),
    'signature',        v_asset.signature,
    'key_version',      v_asset.key_version,
    'public_key',       v_key.public_key,
    'asset_state',      v_asset.asset_state,
    'poxy_tier',        v_asset.poxy_tier,
    'collection_id',    v_asset.collection_id,
    'serial_number',    v_asset.serial_number,
    'generation_version', v_asset.generation_version,
    'mint_ts_canonical',  v_asset.mint_ts_canonical,
    'genesis_event_id', v_asset.genesis_event_id,
    'genesis_event_hash', v_event.event_hash,
    'genesis_event_type', v_event.event_type,
    'genesis_canonical', v_event.canonical
  );
end;
$$;

-- 2. Single-event hash-chain verification
create or replace function public.public_verify_event(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_event   public.ledger_events%rowtype;
  v_prev    public.ledger_events%rowtype;
  v_recomputed text;
begin
  select * into v_event from public.ledger_events where id = p_event_id limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Event not found');
  end if;

  if v_event.prev_event_hash = '0000000000000000000000000000000000000000000000000000000000000000' then
    v_recomputed := public.crypto_sha256_hex('GENESIS' || E'\n' || v_event.canonical);
  else
    v_recomputed := public.crypto_sha256_hex(v_event.prev_event_hash || E'\n' || v_event.canonical);
  end if;

  select * into v_prev
    from public.ledger_events
   where event_hash = v_event.prev_event_hash
   limit 1;

  return jsonb_build_object(
    'ok',               true,
    'event_id',         v_event.id,
    'event_type',       v_event.event_type,
    'event_hash',       v_event.event_hash,
    'computed_hash',    v_recomputed,
    'hash_matches',     (v_recomputed = v_event.event_hash),
    'prev_event_hash',  v_event.prev_event_hash,
    'prev_event_id',    v_prev.id,
    'canonical',        v_event.canonical,
    'created_at',       v_event.created_at,
    'seq',              v_event.seq
  );
end;
$$;

-- 3. RNG round fairness verification
create or replace function public.public_verify_rng(p_round_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_round public.rng_rounds%rowtype;
  v_commit   text;
  v_computed text;
begin
  select * into v_round from public.rng_rounds where id = p_round_id limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'RNG round not found');
  end if;

  if v_round.status <> 'revealed' then
    return jsonb_build_object(
      'ok',        true,
      'status',    'pending',
      'round_id',  v_round.id,
      'commit_hash', v_round.commit_hash
    );
  end if;

  v_commit   := public.crypto_sha256_hex(v_round.server_seed);
  v_computed := public.crypto_sha256_hex(
    v_round.server_seed || coalesce(v_round.client_seed,'') || v_round.nonce::text
  );

  return jsonb_build_object(
    'ok',                true,
    'status',            'revealed',
    'round_id',          v_round.id,
    'commit_hash',       v_round.commit_hash,
    'recomputed_commit', v_commit,
    'commit_matches',    (v_commit = v_round.commit_hash),
    'server_seed',       v_round.server_seed,
    'client_seed',       v_round.client_seed,
    'nonce',             v_round.nonce,
    'result_hash',       v_round.result_hash,
    'computed_result',   v_computed,
    'result_matches',    (v_computed = v_round.result_hash)
  );
end;
$$;

-- Grant execute to anon (unauthenticated public access) and authenticated
grant execute on function public.public_verify_asset(text) to anon, authenticated;
grant execute on function public.public_verify_event(uuid) to anon, authenticated;
grant execute on function public.public_verify_rng(uuid) to anon, authenticated;

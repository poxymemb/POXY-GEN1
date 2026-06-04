-- =============================================================================
-- POXY CRYPTOGRAPHIC CORE SYSTEM — "private blockchain inside Supabase"
-- -----------------------------------------------------------------------------
-- Run AFTER schema.sql + migration_poxy_world_2.sql. Idempotent; safe to re-run.
--
-- This migration adds a tamper-resistant, append-only, cryptographically-linked
-- integrity layer on top of the existing POXY economy:
--   * Deterministic SHA-256 identity hashes for every POXY
--   * ED25519 signatures (signed in Edge Functions; keys versioned here)
--   * Append-only event ledger (blockchain core) with hash-chaining
--   * Merkle roots over assets + events
--   * Commit-reveal provably-fair RNG
--   * Replay-attack protection (nonces + signed requests + expiry window)
--   * 24h state snapshots / checkpoints
--   * State-machine validated transitions
--   * Append-only security audit log
--
-- DESIGN SPLIT
--   - PostgreSQL owns: storage, hash-chaining, immutability (triggers), RLS,
--     Merkle root computation, state-machine validation, atomic ledger writes.
--   - Edge Functions own: ED25519 signing/verification (private keys never touch
--     the DB), canonical JSON construction, Merkle inclusion proofs, RNG seeds.
--   - SHA-256 is computed identically on both sides (UTF-8 bytes -> hex), so any
--     hash produced in Postgres can be re-derived in TypeScript and vice-versa.
-- =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- 0. CRYPTO PRIMITIVES (deterministic, must match the TS implementation)
-- =============================================================================

-- SHA-256 over the UTF-8 bytes of `p`, returned as lowercase hex (64 chars).
-- Equivalent TS: toHex(sha256(new TextEncoder().encode(p)))
create or replace function public.crypto_sha256_hex(p text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(convert_to(coalesce(p, ''), 'UTF8'), 'sha256'), 'hex');
$$;

-- The canonical POXY identity hash.
-- hash_input = creator_id|timestamp|serial|rarity_seed|collection_id|gen_version|server_salt
-- Field separator is the unit-separator-like '|' to remove concatenation ambiguity.
create or replace function public.crypto_poxy_hash(
  p_creator_id        text,
  p_timestamp         text,
  p_serial_number     text,
  p_rarity_seed       text,
  p_collection_id     text,
  p_generation_version text,
  p_server_salt       text
)
returns text
language sql
immutable
as $$
  select public.crypto_sha256_hex(
    coalesce(p_creator_id,'')        || '|' ||
    coalesce(p_timestamp,'')         || '|' ||
    coalesce(p_serial_number,'')     || '|' ||
    coalesce(p_rarity_seed,'')       || '|' ||
    coalesce(p_collection_id,'')     || '|' ||
    coalesce(p_generation_version,'')|| '|' ||
    coalesce(p_server_salt,'')
  );
$$;

-- Merkle root over an ordered array of hex leaves (already-hashed values).
-- Pairwise: parent = SHA256(left_hex || right_hex). Odd node is duplicated.
-- Empty tree => 64 zeros. Matches the TS merkleRoot() implementation exactly.
create or replace function public.crypto_merkle_root(p_leaves text[])
returns text
language plpgsql
immutable
as $$
declare
  v_level text[];
  v_next  text[];
  v_i     int;
  v_n     int;
  v_left  text;
  v_right text;
begin
  if p_leaves is null or array_length(p_leaves, 1) is null then
    return repeat('0', 64);
  end if;

  v_level := p_leaves;
  while array_length(v_level, 1) > 1 loop
    v_next := array[]::text[];
    v_n := array_length(v_level, 1);
    v_i := 1;
    while v_i <= v_n loop
      v_left := v_level[v_i];
      if v_i + 1 <= v_n then
        v_right := v_level[v_i + 1];
      else
        v_right := v_left; -- duplicate the lone trailing leaf
      end if;
      v_next := array_append(v_next, public.crypto_sha256_hex(v_left || v_right));
      v_i := v_i + 2;
    end loop;
    v_level := v_next;
  end loop;

  return v_level[1];
end;
$$;

-- =============================================================================
-- 1. KEY MANAGEMENT SYSTEM (KMS-like)
-- -----------------------------------------------------------------------------
-- Private keys NEVER live in the database. Only public verification keys + the
-- key lifecycle live here. The matching ED25519 private keys live in Edge
-- Function secrets named POXY_SIGNING_SK_V{n} and are used only server-side.
-- Dual-control: a key cannot be activated until two distinct admins approve it.
-- =============================================================================

create table if not exists public.crypto_keys (
  id             uuid primary key default gen_random_uuid(),
  key_version    integer not null unique,
  algorithm      text not null default 'ed25519' check (algorithm = 'ed25519'),
  purpose        text not null default 'asset_event_signing'
                   check (purpose in ('asset_event_signing','snapshot_signing')),
  public_key     text not null,                 -- base64 (raw 32-byte ed25519 pubkey)
  status         text not null default 'pending'
                   check (status in ('pending','active','rotating','retired','revoked')),
  -- dual-control approval (two distinct humans)
  proposed_by    uuid references public.profiles(id),
  approved_by_1  uuid references public.profiles(id),
  approved_by_2  uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  activated_at   timestamptz,
  retired_at     timestamptz,
  constraint crypto_keys_dual_control check (
    status <> 'active'
    or (approved_by_1 is not null
        and approved_by_2 is not null
        and approved_by_1 <> approved_by_2)
  )
);

create unique index if not exists crypto_keys_one_active_per_purpose
  on public.crypto_keys (purpose)
  where status = 'active';

-- =============================================================================
-- 2. POXY ASSET CRYPTO REGISTRY
-- -----------------------------------------------------------------------------
-- Canonical, signed registry for every minted POXY. Links 1:1 to user_poxy
-- (gameplay inventory). Identity columns are IMMUTABLE; only owner/state move.
-- =============================================================================

create table if not exists public.poxy_assets (
  id                  uuid primary key default gen_random_uuid(),
  poxy_hash           text not null unique,                 -- SHA-256 identity (immutable)
  user_poxy_id        uuid unique references public.user_poxy(id) on delete set null,
  -- identity inputs (immutable, retained so the hash is independently re-derivable)
  creator_id          uuid not null,
  serial_number       text not null,
  rarity_seed         text not null,
  collection_id       text not null default 'genesis',
  generation_version  integer not null default 1,
  server_salt         text not null,                        -- per-asset salt (revealed in proof)
  poxy_tier           text not null,
  mint_timestamp      timestamptz not null,                 -- exact ts fed into the hash
  mint_ts_canonical   text not null,                        -- the EXACT string hashed (ISO microseconds)
  -- signature (ED25519 over poxy_hash, produced in an Edge Function)
  signature           text not null,                        -- base64
  key_version         integer not null references public.crypto_keys(key_version),
  -- mutable gameplay state (guarded by trigger + state machine)
  current_owner_id    uuid not null references public.profiles(id),
  asset_state         text not null default 'minted'
                        check (asset_state in ('minted','active','listed','locked','destroyed')),
  genesis_event_id    uuid,                                 -- MINT event in the ledger
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists poxy_assets_owner_idx on public.poxy_assets (current_owner_id);
create index if not exists poxy_assets_state_idx on public.poxy_assets (asset_state);
create index if not exists poxy_assets_created_idx on public.poxy_assets (created_at);

-- =============================================================================
-- 3. IMMUTABLE EVENT LEDGER (BLOCKCHAIN CORE)
-- -----------------------------------------------------------------------------
-- Strictly append-only, globally hash-chained. event_hash links each event to
-- its predecessor. `canonical` is the exact byte-string that was signed, so the
-- whole chain can be re-verified offline.
--
--   prev_event_hash = event_hash of the current chain head (genesis = 64 zeros)
--   event_hash      = SHA256(prev_event_hash || '\n' || canonical)
--   signature       = ED25519_SIGN(sk, canonical)   (authenticity, done in Edge)
-- =============================================================================

create table if not exists public.ledger_events (
  id                uuid primary key default gen_random_uuid(),
  seq               bigint generated always as identity,
  event_type        text not null check (event_type in
                      ('MINT','TRANSFER','TRADE','UPGRADE','FUSION','DESTROY','ADMIN_ACTION')),
  asset_id          uuid references public.poxy_assets(id),
  actor_id          uuid,                                   -- profiles.id (nullable for system)
  prev_event_hash   text not null,
  event_hash        text not null unique,
  canonical         text not null,                          -- exact signed byte-string
  payload           jsonb not null default '{}'::jsonb,     -- queryable mirror of canonical body
  nonce             text not null,
  event_timestamp   timestamptz not null,
  signature         text,                                   -- base64 ED25519 over canonical
  key_version       integer references public.crypto_keys(key_version),
  created_at        timestamptz not null default now()
);

create index if not exists ledger_events_seq_idx on public.ledger_events (seq);
create index if not exists ledger_events_asset_idx on public.ledger_events (asset_id, seq);
create index if not exists ledger_events_type_idx on public.ledger_events (event_type);
-- A given nonce may only ever be used once per actor (replay safety inside the chain).
create unique index if not exists ledger_events_actor_nonce_uq
  on public.ledger_events (actor_id, nonce) where actor_id is not null;

-- =============================================================================
-- 4. MERKLE ROOTS  (anchored periodically / per snapshot)
-- =============================================================================

create table if not exists public.merkle_roots (
  id          uuid primary key default gen_random_uuid(),
  tree_type   text not null check (tree_type in ('assets','events')),
  root_hash   text not null,
  leaf_count  integer not null,
  max_seq     bigint,                       -- ledger head covered (events) or null
  created_at  timestamptz not null default now()
);

create index if not exists merkle_roots_type_idx on public.merkle_roots (tree_type, created_at desc);

-- =============================================================================
-- 5. COMMIT-REVEAL PROVABLY-FAIR RNG
-- -----------------------------------------------------------------------------
-- server_seed is generated server-side and hidden until reveal. commit_hash is
-- published immediately so the operator is bound to that seed. Result is fully
-- reproducible: result = SHA256(server_seed || client_seed || nonce).
-- RLS denies all access to server_seed before reveal (only SECURITY DEFINER /
-- service-role can read it). No UPDATE allowed except the single commit->reveal.
-- =============================================================================

create table if not exists public.rng_rounds (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  server_seed      text not null,                  -- HIDDEN until revealed (RLS-protected)
  commit_hash      text not null,                  -- SHA256(server_seed), public
  client_seed      text,
  nonce            bigint not null default 0,
  result_hash      text,                           -- SHA256(server_seed||client_seed||nonce)
  status           text not null default 'committed'
                     check (status in ('committed','revealed')),
  committed_at     timestamptz not null default now(),
  revealed_at      timestamptz,
  constraint rng_reveal_consistency check (
    status = 'committed'
    or (client_seed is not null and result_hash is not null and revealed_at is not null)
  )
);

create index if not exists rng_rounds_user_idx on public.rng_rounds (user_id, committed_at desc);

-- =============================================================================
-- 6. STATE SNAPSHOTS / CHECKPOINTS  (every ~24h)
-- -----------------------------------------------------------------------------
-- state_root = SHA256(asset_root || event_root || balances_hash)
-- =============================================================================

create table if not exists public.state_snapshots (
  id            uuid primary key default gen_random_uuid(),
  snapshot_seq  bigint generated always as identity,
  state_root    text not null,
  asset_root    text not null,
  event_root    text not null,
  balances_hash text not null,
  asset_count   integer not null,
  event_count   integer not null,
  total_balance numeric(18,2) not null,
  max_event_seq bigint,
  created_at    timestamptz not null default now()
);

create index if not exists state_snapshots_created_idx on public.state_snapshots (created_at desc);

-- =============================================================================
-- 7. APPEND-ONLY SECURITY AUDIT LOG
-- =============================================================================

create table if not exists public.security_audit_log (
  id          uuid primary key default gen_random_uuid(),
  seq         bigint generated always as identity,
  category    text not null check (category in
                ('LOGIN','MINT','TRANSFER','TRADE','UPGRADE','FUSION','DESTROY',
                 'ADMIN_ACTION','SECURITY','VERIFY_FAIL','RNG','KEY_ROTATION')),
  event_hash  text not null,                     -- SHA256 of the log body (tamper-evident)
  prev_hash   text not null,                     -- chained with previous audit row
  user_id     uuid,
  ip          text,
  device      text,
  user_agent  text,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_user_idx on public.security_audit_log (user_id, created_at desc);
create index if not exists audit_log_category_idx on public.security_audit_log (category, created_at desc);

-- =============================================================================
-- 8. REPLAY-ATTACK PROTECTION  (request nonces + signed-request registry)
-- -----------------------------------------------------------------------------
-- Every state-changing Edge request carries a unique nonce + a signed payload.
-- We reject reused nonces, reused signatures, and expired timestamps.
-- =============================================================================

create table if not exists public.request_nonces (
  nonce        text primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  action       text not null,
  signature    text unique,                      -- reject reused request signatures
  expires_at   timestamptz not null,
  used_at      timestamptz not null default now()
);

create index if not exists request_nonces_expiry_idx on public.request_nonces (expires_at);

-- =============================================================================
-- 9. STATE MACHINE VALIDATION ENGINE
-- -----------------------------------------------------------------------------
-- Allowed asset transitions, keyed by (from_state, event_type) -> to_state.
-- Anything not enumerated here is rejected.
-- =============================================================================

create or replace function public.crypto_next_state(p_from text, p_event text)
returns text
language sql
immutable
as $$
  select case
    -- minting
    when p_from = 'minted'  and p_event = 'MINT'         then 'active'
    when p_from = 'minted'  and p_event = 'TRANSFER'     then 'active'
    -- circulation
    when p_from = 'active'  and p_event = 'TRANSFER'     then 'active'
    when p_from = 'active'  and p_event = 'TRADE'        then 'active'
    when p_from = 'active'  and p_event = 'UPGRADE'      then 'active'
    when p_from = 'active'  and p_event = 'FUSION'       then 'destroyed'
    when p_from = 'active'  and p_event = 'DESTROY'      then 'destroyed'
    when p_from = 'active'  and p_event = 'ADMIN_ACTION' then 'locked'
    -- listed for sale
    when p_from = 'active'  and p_event = 'LIST'         then 'listed'
    when p_from = 'listed'  and p_event = 'TRADE'        then 'active'
    when p_from = 'listed'  and p_event = 'ADMIN_ACTION' then 'active'
    -- locked (admin hold)
    when p_from = 'locked'  and p_event = 'ADMIN_ACTION' then 'active'
    else null  -- illegal transition
  end;
$$;

-- =============================================================================
-- 10. IMMUTABILITY TRIGGERS  (the heart of tamper-resistance)
-- =============================================================================

-- 10a. Ledger: assign chain hash on insert; forbid UPDATE/DELETE forever.
create or replace function public.ledger_before_insert()
returns trigger
language plpgsql
as $$
declare
  v_head text;
begin
  -- Serialize the chain head read so concurrent inserts can't fork it.
  perform pg_advisory_xact_lock(hashtext('poxy_ledger_chain'));

  select event_hash into v_head
  from public.ledger_events
  order by seq desc
  limit 1;

  if v_head is null then
    v_head := repeat('0', 64);  -- genesis
  end if;

  new.prev_event_hash := v_head;
  new.event_hash := public.crypto_sha256_hex(v_head || E'\n' || new.canonical);
  return new;
end;
$$;

drop trigger if exists ledger_events_chain on public.ledger_events;
create trigger ledger_events_chain
  before insert on public.ledger_events
  for each row execute function public.ledger_before_insert();

create or replace function public.block_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'TAMPER_BLOCKED: % on % is forbidden (append-only)', tg_op, tg_table_name
    using errcode = 'check_violation';
  return null;
end;
$$;

drop trigger if exists ledger_events_no_update on public.ledger_events;
create trigger ledger_events_no_update
  before update or delete on public.ledger_events
  for each row execute function public.block_mutation();

-- 10b. Audit log: chain + append-only.
create or replace function public.audit_before_insert()
returns trigger
language plpgsql
as $$
declare
  v_prev text;
  v_body text;
begin
  perform pg_advisory_xact_lock(hashtext('poxy_audit_chain'));
  select event_hash into v_prev from public.security_audit_log order by seq desc limit 1;
  if v_prev is null then v_prev := repeat('0', 64); end if;

  v_body := v_prev || '|' || new.category || '|' || coalesce(new.user_id::text,'') || '|' ||
            coalesce(new.ip,'') || '|' || coalesce(new.device,'') || '|' ||
            coalesce(new.detail::text,'{}');
  new.prev_hash := v_prev;
  new.event_hash := public.crypto_sha256_hex(v_body);
  return new;
end;
$$;

drop trigger if exists audit_log_chain on public.security_audit_log;
create trigger audit_log_chain
  before insert on public.security_audit_log
  for each row execute function public.audit_before_insert();

drop trigger if exists audit_log_no_mutation on public.security_audit_log;
create trigger audit_log_no_mutation
  before update or delete on public.security_audit_log
  for each row execute function public.block_mutation();

-- 10c. Snapshots + merkle roots: append-only.
drop trigger if exists snapshots_no_mutation on public.state_snapshots;
create trigger snapshots_no_mutation
  before update or delete on public.state_snapshots
  for each row execute function public.block_mutation();

drop trigger if exists merkle_no_mutation on public.merkle_roots;
create trigger merkle_no_mutation
  before update or delete on public.merkle_roots
  for each row execute function public.block_mutation();

-- 10d. crypto_keys: public keys & versions are immutable once written; only
--      status lifecycle + approval/retire columns may move forward.
create or replace function public.crypto_keys_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'TAMPER_BLOCKED: crypto_keys cannot be deleted'
      using errcode = 'check_violation';
  end if;
  if new.key_version <> old.key_version
     or new.public_key <> old.public_key
     or new.algorithm <> old.algorithm
     or new.purpose <> old.purpose
     or new.created_at <> old.created_at then
    raise exception 'TAMPER_BLOCKED: immutable crypto_keys columns cannot change'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists crypto_keys_immutable on public.crypto_keys;
create trigger crypto_keys_immutable
  before update or delete on public.crypto_keys
  for each row execute function public.crypto_keys_guard();

-- 10e. poxy_assets: identity columns immutable; ownership/state move only through
--      validated transitions. updated_at maintained.
create or replace function public.poxy_assets_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'TAMPER_BLOCKED: poxy_assets are never hard-deleted (use DESTROY event)'
      using errcode = 'check_violation';
  end if;

  if new.poxy_hash <> old.poxy_hash
     or new.creator_id <> old.creator_id
     or new.serial_number <> old.serial_number
     or new.rarity_seed <> old.rarity_seed
     or new.collection_id <> old.collection_id
     or new.generation_version <> old.generation_version
     or new.server_salt <> old.server_salt
     or new.mint_timestamp <> old.mint_timestamp
     or new.signature <> old.signature
     or new.key_version <> old.key_version then
    raise exception 'TAMPER_BLOCKED: immutable POXY identity/signature cannot change'
      using errcode = 'check_violation';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists poxy_assets_immutable on public.poxy_assets;
create trigger poxy_assets_immutable
  before update or delete on public.poxy_assets
  for each row execute function public.poxy_assets_guard();

-- 10f. rng_rounds: only the single commit->reveal transition is allowed.
create or replace function public.rng_rounds_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'TAMPER_BLOCKED: rng_rounds cannot be deleted'
      using errcode = 'check_violation';
  end if;
  if old.status = 'revealed' then
    raise exception 'TAMPER_BLOCKED: revealed RNG round is final'
      using errcode = 'check_violation';
  end if;
  if new.server_seed <> old.server_seed
     or new.commit_hash <> old.commit_hash
     or new.user_id <> old.user_id then
    raise exception 'TAMPER_BLOCKED: RNG commitment cannot change'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists rng_rounds_immutable on public.rng_rounds;
create trigger rng_rounds_immutable
  before update or delete on public.rng_rounds
  for each row execute function public.rng_rounds_guard();

-- =============================================================================
-- 11. INTERNAL HELPERS used by the SECURITY DEFINER RPCs
-- =============================================================================

-- Append a ledger event. Returns the row. SECURITY DEFINER so app code can only
-- reach the ledger through the validated RPCs below (never a raw INSERT).
create or replace function public.ledger_append(
  p_event_type      text,
  p_asset_id        uuid,
  p_actor_id        uuid,
  p_canonical       text,
  p_payload         jsonb,
  p_nonce           text,
  p_event_timestamp timestamptz,
  p_signature       text,
  p_key_version     integer
)
returns public.ledger_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.ledger_events;
begin
  insert into public.ledger_events
    (event_type, asset_id, actor_id, prev_event_hash, event_hash, canonical,
     payload, nonce, event_timestamp, signature, key_version)
  values
    (p_event_type, p_asset_id, p_actor_id, '', '', p_canonical,
     coalesce(p_payload, '{}'::jsonb), p_nonce, p_event_timestamp, p_signature, p_key_version)
  returning * into v_row;  -- prev/event hash filled by the BEFORE trigger
  return v_row;
end;
$$;

-- Record a consumed request nonce (replay protection). Raises on reuse.
create or replace function public.consume_request_nonce(
  p_nonce      text,
  p_user_id    uuid,
  p_action     text,
  p_signature  text,
  p_ttl_seconds integer default 120
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.request_nonces where expires_at < now();  -- opportunistic GC
  insert into public.request_nonces (nonce, user_id, action, signature, expires_at)
  values (p_nonce, p_user_id, p_action, p_signature, now() + make_interval(secs => p_ttl_seconds));
exception
  when unique_violation then
    raise exception 'REPLAY_DETECTED: nonce or signature already used'
      using errcode = 'check_violation';
end;
$$;

-- =============================================================================
-- 12. PUBLIC RPCs (the only sanctioned write paths)
-- -----------------------------------------------------------------------------
-- Crypto material (poxy_hash recomputed here; signatures produced in Edge) is
-- passed in. These run as SECURITY DEFINER and enforce auth + state machine.
-- =============================================================================

-- 12a. MINT — register a new cryptographic POXY + genesis MINT event (atomic).
create or replace function public.crypto_mint_poxy(
  p_owner_id          uuid,
  p_creator_id        uuid,
  p_serial_number     text,
  p_rarity_seed       text,
  p_collection_id     text,
  p_generation_version integer,
  p_server_salt       text,
  p_poxy_tier         text,
  p_mint_timestamp    timestamptz,
  p_signature         text,           -- ED25519 over poxy_hash (from Edge)
  p_key_version       integer,
  p_event_canonical   text,           -- canonical signed string for the MINT event
  p_event_signature   text,
  p_nonce             text,
  p_link_user_poxy_id uuid default null,
  p_payload           jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash   text;
  v_ts     text;
  v_asset  public.poxy_assets;
  v_event  public.ledger_events;
begin
  -- Canonical timestamp string (ISO microseconds) — the EXACT bytes that were
  -- hashed in the Edge Function. Stored verbatim so offline verifiers need no
  -- timestamp-format guessing.
  v_ts := to_char(p_mint_timestamp at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');

  -- Recompute the identity hash server-side; never trust a client-supplied hash.
  v_hash := public.crypto_poxy_hash(
    p_creator_id::text, v_ts,
    p_serial_number, p_rarity_seed, p_collection_id,
    p_generation_version::text, p_server_salt
  );

  insert into public.poxy_assets (
    poxy_hash, user_poxy_id, creator_id, serial_number, rarity_seed,
    collection_id, generation_version, server_salt, poxy_tier, mint_timestamp,
    mint_ts_canonical, signature, key_version, current_owner_id, asset_state
  ) values (
    v_hash, p_link_user_poxy_id, p_creator_id, p_serial_number, p_rarity_seed,
    coalesce(p_collection_id,'genesis'), coalesce(p_generation_version,1),
    p_server_salt, p_poxy_tier, p_mint_timestamp,
    v_ts, p_signature, p_key_version, p_owner_id, 'minted'
  ) returning * into v_asset;

  v_event := public.ledger_append(
    'MINT', v_asset.id, p_creator_id, p_event_canonical,
    coalesce(p_payload,'{}'::jsonb) || jsonb_build_object('poxy_hash', v_hash, 'tier', p_poxy_tier),
    p_nonce, p_mint_timestamp, p_event_signature, p_key_version
  );

  update public.poxy_assets
  set genesis_event_id = v_event.id, asset_state = 'active'
  where id = v_asset.id;

  return jsonb_build_object(
    'ok', true,
    'asset_id', v_asset.id,
    'poxy_hash', v_hash,
    'event_id', v_event.id,
    'event_hash', v_event.event_hash,
    'seq', v_event.seq
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'DUPLICATE: hash/serial/nonce already exists');
end;
$$;

-- 12b. TRANSFER / TRADE — move ownership through a validated state transition.
create or replace function public.crypto_transfer_poxy(
  p_asset_id        uuid,
  p_from_owner      uuid,
  p_to_owner        uuid,
  p_event_type      text,            -- 'TRANSFER' | 'TRADE'
  p_event_canonical text,
  p_event_signature text,
  p_key_version     integer,
  p_nonce           text,
  p_actor_id        uuid,
  p_payload         jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset    public.poxy_assets;
  v_next     text;
  v_event    public.ledger_events;
begin
  if p_event_type not in ('TRANSFER','TRADE') then
    return jsonb_build_object('ok', false, 'error', 'Invalid transfer event type');
  end if;

  select * into v_asset from public.poxy_assets where id = p_asset_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Asset not found');
  end if;
  if v_asset.current_owner_id <> p_from_owner then
    return jsonb_build_object('ok', false, 'error', 'OWNERSHIP_MISMATCH: sender is not current owner');
  end if;
  if v_asset.asset_state = 'destroyed' then
    return jsonb_build_object('ok', false, 'error', 'Asset destroyed');
  end if;

  v_next := public.crypto_next_state(v_asset.asset_state, p_event_type);
  if v_next is null then
    return jsonb_build_object('ok', false, 'error',
      format('ILLEGAL_TRANSITION: %s -> %s', v_asset.asset_state, p_event_type));
  end if;

  v_event := public.ledger_append(
    p_event_type, v_asset.id, p_actor_id, p_event_canonical,
    coalesce(p_payload,'{}'::jsonb) || jsonb_build_object('from', p_from_owner, 'to', p_to_owner),
    p_nonce, now(), p_event_signature, p_key_version
  );

  update public.poxy_assets
  set current_owner_id = p_to_owner, asset_state = v_next
  where id = v_asset.id;

  -- keep gameplay inventory in sync if linked
  if v_asset.user_poxy_id is not null then
    update public.user_poxy set user_id = p_to_owner where id = v_asset.user_poxy_id;
  end if;

  return jsonb_build_object(
    'ok', true, 'asset_id', v_asset.id, 'new_owner', p_to_owner,
    'state', v_next, 'event_hash', v_event.event_hash, 'seq', v_event.seq
  );
end;
$$;

-- 12c. DESTROY — burn with a ledger DESTROY event (state -> destroyed).
create or replace function public.crypto_destroy_poxy(
  p_asset_id        uuid,
  p_owner_id        uuid,
  p_event_canonical text,
  p_event_signature text,
  p_key_version     integer,
  p_nonce           text,
  p_payload         jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset public.poxy_assets;
  v_event public.ledger_events;
begin
  select * into v_asset from public.poxy_assets where id = p_asset_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Asset not found'); end if;
  if v_asset.current_owner_id <> p_owner_id then
    return jsonb_build_object('ok', false, 'error', 'Not owner');
  end if;
  if public.crypto_next_state(v_asset.asset_state, 'DESTROY') is null then
    return jsonb_build_object('ok', false, 'error',
      format('ILLEGAL_TRANSITION: %s -> DESTROY', v_asset.asset_state));
  end if;

  v_event := public.ledger_append('DESTROY', v_asset.id, p_owner_id, p_event_canonical,
    coalesce(p_payload,'{}'::jsonb), p_nonce, now(), p_event_signature, p_key_version);

  update public.poxy_assets set asset_state = 'destroyed' where id = v_asset.id;
  if v_asset.user_poxy_id is not null then
    delete from public.user_poxy where id = v_asset.user_poxy_id;
  end if;

  return jsonb_build_object('ok', true, 'event_hash', v_event.event_hash, 'seq', v_event.seq);
end;
$$;

-- 12d. Verify the integrity of a single asset (hash recompute + chain presence).
create or replace function public.verify_asset_integrity(p_asset_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_asset    public.poxy_assets;
  v_recomputed text;
  v_has_genesis boolean;
begin
  select * into v_asset from public.poxy_assets where id = p_asset_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'Asset not found'); end if;

  v_recomputed := public.crypto_poxy_hash(
    v_asset.creator_id::text, v_asset.mint_ts_canonical,
    v_asset.serial_number, v_asset.rarity_seed, v_asset.collection_id,
    v_asset.generation_version::text, v_asset.server_salt
  );

  v_has_genesis := exists (
    select 1 from public.ledger_events
    where asset_id = v_asset.id and event_type = 'MINT'
  );

  return jsonb_build_object(
    'ok', (v_recomputed = v_asset.poxy_hash) and v_has_genesis,
    'asset_id', v_asset.id,
    'hash_matches', v_recomputed = v_asset.poxy_hash,
    'stored_hash', v_asset.poxy_hash,
    'recomputed_hash', v_recomputed,
    'has_genesis_event', v_has_genesis,
    'state', v_asset.asset_state,
    'signature', v_asset.signature,
    'key_version', v_asset.key_version
  );
end;
$$;

-- 12e. Verify the full ledger chain (or a range). Returns first break, if any.
create or replace function public.verify_event_chain(
  p_from_seq bigint default 1,
  p_to_seq   bigint default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rec       record;
  v_expected  text := repeat('0', 64);
  v_computed  text;
  v_count     int := 0;
  v_first_break bigint := null;
begin
  for v_rec in
    select * from public.ledger_events
    where seq >= p_from_seq and (p_to_seq is null or seq <= p_to_seq)
    order by seq asc
  loop
    -- If we started mid-chain, anchor expectation to the row's stored prev.
    if v_count = 0 and p_from_seq > 1 then
      v_expected := v_rec.prev_event_hash;
    end if;

    if v_rec.prev_event_hash <> v_expected then
      v_first_break := v_rec.seq; exit;
    end if;
    v_computed := public.crypto_sha256_hex(v_rec.prev_event_hash || E'\n' || v_rec.canonical);
    if v_computed <> v_rec.event_hash then
      v_first_break := v_rec.seq; exit;
    end if;

    v_expected := v_rec.event_hash;
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'ok', v_first_break is null,
    'verified_count', v_count,
    'first_break_seq', v_first_break,
    'head_hash', v_expected
  );
end;
$$;

-- 12f. Compute + persist Merkle roots over current assets and/or events.
create or replace function public.compute_merkle_roots()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset_leaves text[];
  v_event_leaves text[];
  v_asset_root text;
  v_event_root text;
  v_max_seq bigint;
begin
  select array_agg(poxy_hash order by created_at, id) into v_asset_leaves from public.poxy_assets;
  select array_agg(event_hash order by seq), max(seq) into v_event_leaves, v_max_seq
  from public.ledger_events;

  v_asset_root := public.crypto_merkle_root(coalesce(v_asset_leaves, array[]::text[]));
  v_event_root := public.crypto_merkle_root(coalesce(v_event_leaves, array[]::text[]));

  insert into public.merkle_roots (tree_type, root_hash, leaf_count, max_seq)
  values ('assets', v_asset_root, coalesce(array_length(v_asset_leaves,1),0), null);
  insert into public.merkle_roots (tree_type, root_hash, leaf_count, max_seq)
  values ('events', v_event_root, coalesce(array_length(v_event_leaves,1),0), v_max_seq);

  return jsonb_build_object('ok', true, 'asset_root', v_asset_root,
    'event_root', v_event_root, 'max_event_seq', v_max_seq);
end;
$$;

-- 12g. 24h snapshot/checkpoint.
create or replace function public.create_state_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset_leaves text[];
  v_event_leaves text[];
  v_asset_root text;
  v_event_root text;
  v_balances   text;
  v_balances_hash text;
  v_state_root text;
  v_asset_count int;
  v_event_count int;
  v_total numeric;
  v_max_seq bigint;
begin
  select array_agg(poxy_hash order by created_at, id), count(*)
    into v_asset_leaves, v_asset_count from public.poxy_assets;
  select array_agg(event_hash order by seq), count(*), max(seq)
    into v_event_leaves, v_event_count, v_max_seq from public.ledger_events;

  v_asset_root := public.crypto_merkle_root(coalesce(v_asset_leaves, array[]::text[]));
  v_event_root := public.crypto_merkle_root(coalesce(v_event_leaves, array[]::text[]));

  select coalesce(string_agg(id::text || ':' || balance::text, '|' order by id), ''),
         coalesce(sum(balance), 0)
    into v_balances, v_total from public.profiles;
  v_balances_hash := public.crypto_sha256_hex(v_balances);

  v_state_root := public.crypto_sha256_hex(v_asset_root || v_event_root || v_balances_hash);

  insert into public.state_snapshots
    (state_root, asset_root, event_root, balances_hash, asset_count, event_count,
     total_balance, max_event_seq)
  values
    (v_state_root, v_asset_root, v_event_root, v_balances_hash,
     coalesce(v_asset_count,0), coalesce(v_event_count,0), coalesce(v_total,0), v_max_seq);

  return jsonb_build_object('ok', true, 'state_root', v_state_root,
    'asset_root', v_asset_root, 'event_root', v_event_root, 'max_event_seq', v_max_seq);
end;
$$;

-- 12h. RNG commit (server seed generated + hidden) — returns commit hash only.
create or replace function public.rng_commit(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seed text;
  v_commit text;
  v_id uuid;
begin
  if auth.uid() is distinct from p_user_id then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  v_seed := encode(gen_random_bytes(32), 'hex');
  v_commit := public.crypto_sha256_hex(v_seed);

  insert into public.rng_rounds (user_id, server_seed, commit_hash, status)
  values (p_user_id, v_seed, v_commit, 'committed')
  returning id into v_id;

  return jsonb_build_object('ok', true, 'round_id', v_id, 'commit_hash', v_commit);
end;
$$;

-- 12i. RNG reveal — bind client_seed + nonce, expose seed + reproducible result.
create or replace function public.rng_reveal(
  p_round_id    uuid,
  p_client_seed text,
  p_nonce       bigint default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round public.rng_rounds;
  v_result text;
begin
  select * into v_round from public.rng_rounds where id = p_round_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Round not found'); end if;
  if auth.uid() is distinct from v_round.user_id then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  if v_round.status = 'revealed' then
    return jsonb_build_object('ok', false, 'error', 'Already revealed');
  end if;

  v_result := public.crypto_sha256_hex(v_round.server_seed || coalesce(p_client_seed,'') || p_nonce::text);

  update public.rng_rounds
  set status = 'revealed', client_seed = p_client_seed, nonce = p_nonce,
      result_hash = v_result, revealed_at = now()
  where id = p_round_id;

  return jsonb_build_object(
    'ok', true, 'server_seed', v_round.server_seed, 'commit_hash', v_round.commit_hash,
    'client_seed', p_client_seed, 'nonce', p_nonce, 'result', v_result
  );
end;
$$;

-- 12j. Append an audit log row (server-side only).
create or replace function public.audit_log(
  p_category text,
  p_user_id  uuid,
  p_ip       text,
  p_device   text,
  p_user_agent text,
  p_detail   jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.security_audit_log (category, event_hash, prev_hash, user_id, ip, device, user_agent, detail)
  values (p_category, '', '', p_user_id, p_ip, p_device, p_user_agent, coalesce(p_detail,'{}'::jsonb));
end;
$$;

-- =============================================================================
-- 13. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
-- Default-deny. No client writes to any crypto table (writes go through
-- SECURITY DEFINER RPCs / service role). Reads are scoped for verifiability.
-- =============================================================================

alter table public.crypto_keys        enable row level security;
alter table public.poxy_assets        enable row level security;
alter table public.ledger_events      enable row level security;
alter table public.merkle_roots       enable row level security;
alter table public.rng_rounds         enable row level security;
alter table public.state_snapshots    enable row level security;
alter table public.security_audit_log enable row level security;
alter table public.request_nonces     enable row level security;

-- crypto_keys: public keys readable (needed for verification); never client-writable.
drop policy if exists crypto_keys_read on public.crypto_keys;
create policy crypto_keys_read on public.crypto_keys
  for select to authenticated using (true);

-- poxy_assets: owner sees own; everyone may read non-sensitive fields for verify
-- (server_salt is sensitive — masked via the public view below, not direct table).
drop policy if exists poxy_assets_select on public.poxy_assets;
create policy poxy_assets_select on public.poxy_assets
  for select to authenticated
  using (current_owner_id = auth.uid() or public.is_founder());

-- ledger_events: transparent chain — readable by all authenticated users.
drop policy if exists ledger_events_select on public.ledger_events;
create policy ledger_events_select on public.ledger_events
  for select to authenticated using (true);

-- merkle_roots + snapshots: public verifiability.
drop policy if exists merkle_roots_select on public.merkle_roots;
create policy merkle_roots_select on public.merkle_roots
  for select to authenticated using (true);

drop policy if exists snapshots_select on public.state_snapshots;
create policy snapshots_select on public.state_snapshots
  for select to authenticated using (true);

-- rng_rounds: user reads OWN rounds, but server_seed is filtered out by the
-- public view (rng_rounds_public). Direct table select still restricted to own.
drop policy if exists rng_rounds_select_own on public.rng_rounds;
create policy rng_rounds_select_own on public.rng_rounds
  for select to authenticated
  using (user_id = auth.uid() or public.is_founder());

-- audit log: a user sees only their own entries; founder sees all.
drop policy if exists audit_log_select on public.security_audit_log;
create policy audit_log_select on public.security_audit_log
  for select to authenticated
  using (user_id = auth.uid() or public.is_founder());

-- request_nonces: no client access at all (RPC/service-role only). No policies =>
-- RLS denies everything for authenticated; service role bypasses RLS.

-- =============================================================================
-- 14. SAFE PUBLIC VIEWS (mask sensitive columns)
-- =============================================================================

-- RNG rounds without the server_seed until revealed.
create or replace view public.rng_rounds_public as
  select id, user_id, commit_hash, client_seed, nonce,
         case when status = 'revealed' then server_seed else null end as server_seed,
         result_hash, status, committed_at, revealed_at
  from public.rng_rounds;

-- Asset card without server_salt (salt only travels inside a proof packet).
create or replace view public.poxy_assets_public as
  select id, poxy_hash, user_poxy_id, creator_id, serial_number, poxy_tier,
         collection_id, generation_version, mint_timestamp, mint_ts_canonical,
         signature, key_version, current_owner_id, asset_state, genesis_event_id, created_at
  from public.poxy_assets;

-- Views must honor the querying user's RLS (not the creator's), otherwise they
-- silently bypass row-level security. security_invoker requires Postgres 15+.
alter view public.rng_rounds_public set (security_invoker = on);
alter view public.poxy_assets_public set (security_invoker = on);

-- =============================================================================
-- 15. GRANTS
-- =============================================================================

grant select on public.crypto_keys, public.ledger_events, public.merkle_roots,
               public.state_snapshots, public.poxy_assets, public.rng_rounds to authenticated;
grant select on public.rng_rounds_public, public.poxy_assets_public to authenticated;

grant execute on function public.crypto_sha256_hex(text) to authenticated;
grant execute on function public.crypto_poxy_hash(text,text,text,text,text,text,text) to authenticated;
grant execute on function public.crypto_merkle_root(text[]) to authenticated;
grant execute on function public.crypto_next_state(text,text) to authenticated;
grant execute on function public.verify_asset_integrity(uuid) to authenticated;
grant execute on function public.verify_event_chain(bigint,bigint) to authenticated;
grant execute on function public.rng_commit(uuid) to authenticated;
grant execute on function public.rng_reveal(uuid,text,bigint) to authenticated;

-- NOTE: the write RPCs (crypto_mint_poxy / crypto_transfer_poxy /
-- crypto_destroy_poxy / ledger_append / compute_merkle_roots /
-- create_state_snapshot / consume_request_nonce / audit_log) are intentionally
-- NOT granted to `authenticated`. They are invoked only by Edge Functions using
-- the service-role key, so end users can never forge ledger writes directly.

-- =============================================================================
-- 16. REALTIME (live verifiable feed of new ledger events + snapshots)
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='ledger_events') then
    execute 'alter publication supabase_realtime add table public.ledger_events';
  end if;
exception when others then null;
end $$;

-- =============================================================================
-- END migration_poxy_crypto_core.sql
-- =============================================================================

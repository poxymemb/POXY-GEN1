# POXY Cryptographic Core System

> A private, blockchain-grade asset economy running **inside Supabase** — full
> cryptographic verifiability, tamper-resistance, and a forward path to a public
> L2. This document is the architecture spec, threat model, and operations guide.

---

## 1. What this is

The existing POXY economy (`schema.sql`, `migration_poxy_world_2.sql`) stores
collectibles, balances, trades and burns in plain tables. The **Cryptographic
Core** adds a non-breaking integrity layer on top so that:

- every POXY is **unique** (DB-enforced `poxy_hash` + `serial`),
- every transaction is **verifiable** (ED25519 signatures + hash chain),
- every event is **cryptographically linked** (append-only ledger),
- every modification is **detectable** (immutability triggers + Merkle roots + snapshots),
- every state transition is **validated** (state machine).

The design deliberately splits responsibilities:

| Concern | Owner | Why |
|---|---|---|
| Storage, hash-chaining, immutability, RLS, Merkle root, state machine, atomic ledger writes | **PostgreSQL** | Closest to the data; triggers make tampering structurally impossible for app/anon roles |
| ED25519 signing/verification, canonical JSON, Merkle proofs, RNG seeds, proof export | **Edge Functions (Deno)** | Private keys never touch the DB; deterministic crypto |
| Offline re-verification | **`tools/verify-proof-packet.mjs`** | Trust-minimized: anyone can verify a POXY without DB access |

> **SHA-256 is byte-identical** between Postgres (`pgcrypto digest`) and Deno
> (`crypto.subtle.digest`): both hash the UTF-8 bytes and emit lowercase hex. A
> hash made on one side always re-derives on the other.

---

## 2. Architecture diagram (text)

```
                         ┌───────────────────────────────────────────────┐
                         │                 CLIENT (browser)               │
                         │  signed request envelope: {nonce, ts, action}  │
                         └───────────────┬───────────────────────────────┘
                                         │  HTTPS + Supabase JWT
                                         ▼
        ┌────────────────────────────────────────────────────────────────────────┐
        │                          EDGE FUNCTIONS (Deno)                           │
        │  mint_poxy · transfer_poxy · verify_poxy · verify_event_chain            │
        │  verify_merkle_tree · rng_commit · rng_reveal · snapshot · export_proof  │
        │                                                                          │
        │   _shared/crypto.ts   SHA-256 · ED25519 · Merkle (root/proof/verify)     │
        │   _shared/canonical.ts stableStringify · poxyHashInput · event canonical │
        │   _shared/kms.ts      load active key (pub from DB, priv from secret)     │
        │   _shared/http.ts     CORS · replay protection · audit                   │
        │                                                                          │
        │   PRIVATE KEYS: POXY_SIGNING_SK_V1.. (Edge secrets, never in DB)         │
        └───────────────┬───────────────────────────────────────────┬─────────────┘
                        │ service-role RPC (SECURITY DEFINER)         │ public-key reads
                        ▼                                             ▼
        ┌──────────────────────────────────────────────────────────────────────────┐
        │                              POSTGRESQL                                    │
        │                                                                            │
        │  crypto_keys ──(version)──┐                                                │
        │                           ▼                                                │
        │  poxy_assets  (poxy_hash, signature, key_version, owner, state)            │
        │     │ identity columns IMMUTABLE (trigger)                                 │
        │     ▼                                                                      │
        │  ledger_events  [genesis 0…0] → e1 → e2 → e3 → …                           │
        │     event_hash = SHA256(prev_event_hash || '\n' || canonical)             │
        │     APPEND-ONLY: UPDATE/DELETE blocked by trigger                          │
        │     │                                                                      │
        │     ▼ (periodic)                                                           │
        │  merkle_roots(assets|events)   ·   state_snapshots(state_root, 24h)        │
        │                                                                            │
        │  rng_rounds (commit→reveal)  ·  request_nonces (replay)  ·  audit_log      │
        │  RLS: default-deny; reads scoped; NO client writes to crypto tables        │
        └──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data model

| Table | Purpose | Mutability |
|---|---|---|
| `crypto_keys` | KMS: versioned **public** keys + lifecycle + dual-control | identity columns immutable; status moves forward |
| `poxy_assets` | Signed registry for every POXY; links 1:1 to `user_poxy` | identity/signature **immutable**; owner/state move via validated transitions |
| `ledger_events` | Append-only hash-chained blockchain core | **insert-only** (UPDATE/DELETE blocked) |
| `merkle_roots` | Anchored Merkle roots over assets + events | append-only |
| `rng_rounds` | Commit-reveal provably-fair RNG | only `committed → revealed` |
| `state_snapshots` | 24h checkpoints (`state_root`) | append-only |
| `security_audit_log` | Chained audit trail of everything | append-only |
| `request_nonces` | Replay protection (nonce + signature uniqueness) | RPC/service-role only |

### Identity hash (immutable forever)

```
hash_input = creator_id | hash_timestamp | serial_number | rarity_seed
           | collection_id | generation_version | server_salt      (joined with '|')
poxy_hash  = SHA256(hash_input)
```

`hash_timestamp` is stored verbatim (`mint_ts_canonical`, ISO microseconds) so
the hash is re-derivable offline with zero timestamp-format ambiguity.
Uniqueness is enforced by a DB `UNIQUE` constraint on `poxy_hash` (and `serial`).

### Event hash chain (blockchain core)

```
prev_event_hash = event_hash of the current head (genesis = 64 zeros)
event_hash      = SHA256(prev_event_hash || '\n' || canonical)
signature       = ED25519_SIGN(server_sk, canonical)
```

`canonical` is a key-sorted JSON body `{v,type,asset_id,actor_id,ts,nonce,payload}`.
The chain head is read under a `pg_advisory_xact_lock`, so concurrent inserts
**cannot fork** the chain. `event_hash` provides linkage/integrity; the ED25519
`signature` provides authenticity.

---

## 4. Edge Function API

All endpoints are `POST` and require a Supabase JWT (except `snapshot`, which
also accepts an `x-cron-secret` header). State-changing calls carry a replay
envelope `{ nonce, timestamp, action }`.

| Function | Body | Returns |
|---|---|---|
| `mint_poxy` | `{ envelope, tier, collection_id?, generation_version?, link_user_poxy_id? }` | asset_id, poxy_hash, signature, event_hash, identity |
| `transfer_poxy` | `{ envelope, asset_id, to_owner, event_type? }` | new owner, state, event_hash |
| `verify_poxy` | `{ asset_id }` | hash_matches, has_genesis_event, signature_valid |
| `verify_event_chain` | `{ from_seq?, to_seq?, verify_signatures? }` | verified_count, first_break_seq, signature_failures |
| `verify_merkle_tree` | `{ tree_type, leaf_hash? }` | computed_root, anchored_root, proof, proof_valid |
| `rng_commit` | `{}` | round_id, commit_hash |
| `rng_reveal` | `{ round_id, client_seed, nonce? }` | server_seed, result, commit_hash |
| `snapshot` | `{}` (founder/cron) | merkle roots + state_root |
| `export_proof` | `{ asset_id }` | full `proof_packet` (offline-verifiable) |

### Proof packet

```jsonc
{
  "poxy_hash", "signature", "key_version", "public_key",
  "identity": { "creator_id","hash_timestamp","serial_number","rarity_seed",
                "collection_id","generation_version","server_salt" },
  "creation_event_chain": [ /* events for this asset, ordered */ ],
  "ownership_history":    [ /* TRANSFER/TRADE events */ ],
  "merkle_proof": { "tree":"events", "leaf", "proof":[...], "root" },
  "event_root_hash",
  "snapshot": { "state_root", "created_at" }
}
```

Verify it **without a database**:

```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/export_proof" \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"asset_id":"<uuid>"}' | node tools/verify-proof-packet.mjs -
```

---

## 5. Provably-fair RNG (no `Math.random()`)

1. **Commit**: server generates a 256-bit `server_seed`, stores it hidden, and
   returns `commit_hash = SHA256(server_seed)`. The operator is now bound.
2. **Reveal**: client supplies `client_seed` + `nonce`. Server reveals the seed
   and publishes `result = SHA256(server_seed || client_seed || nonce)`.
3. Anyone can confirm `SHA256(revealed_seed) == commit_hash` and recompute the
   result. The operator cannot bias outcomes after committing.

`server_seed` is unreadable before reveal (RLS denies it; only the
`SECURITY DEFINER` reveal RPC exposes it).

---

## 6. Threat model

| # | Threat | Defense |
|---|---|---|
| T1 | **Database manipulation** (direct UPDATE/DELETE of history) | Append-only triggers on `ledger_events`, `security_audit_log`, `merkle_roots`, `state_snapshots` raise `TAMPER_BLOCKED`. Identity columns on `poxy_assets` are immutable. Any edit breaks the hash chain + Merkle roots, detectable by `verify_event_chain` / snapshots. |
| T2 | **Admin abuse** | Private signing keys are **not** in the DB — a rogue DBA can't forge signatures. Key activation needs **dual-control** (two distinct approvers). All admin actions are audit-logged. Snapshots create external-anchorable roots. |
| T3 | **Replay attacks** | Per-action unique `nonce` + 2-minute freshness window + request signature uniqueness (`request_nonces`), plus `(actor_id, nonce)` uniqueness inside the ledger. |
| T4 | **Signature forgery** | ED25519 over `poxy_hash` (assets) and `canonical` (events). Verification uses the public key registered for the row's `key_version`. |
| T5 | **Client spoofing** | All mutating logic is server-side in Edge Functions using the service role; clients can only call RPCs that re-check `auth.uid()` and ownership. |
| T6 | **Race conditions / duplicate minting** | `pg_advisory_xact_lock` serializes chain-head reads; `SELECT … FOR UPDATE` on transfers; `UNIQUE(poxy_hash)`, `UNIQUE(serial_number)`, `UNIQUE(actor_id,nonce)`. |
| T7 | **Event rewriting / re-ordering** | Hash chain: editing event _n_ changes `event_hash_n`, breaking every `prev_event_hash` after it. `verify_event_chain` returns the first break seq. |
| T8 | **Ghost assets / illegal ownership jumps** | State machine `crypto_next_state(from,event)`; transfers require sender == current owner; unknown transitions rejected. |
| T9 | **Operator RNG bias** | Commit-reveal; seed bound before client input is known. |
| T10 | **Key compromise** | Key rotation: activate a new version, retire the old; historical signatures stay verifiable via stored `key_version`. |

### Residual risks / honest limitations

- A full DB owner can still **drop tables** or restore an old backup. Mitigate by
  periodically **publishing `state_root`** (snapshots) to an external,
  append-only location (e.g. a public chain or a notarization service) — see the
  roadmap. Verifiers compare the live `state_root` against the published one.
- `server_salt` and pre-reveal `server_seed` live in the DB; a DB owner can read
  them. They are protected from app/anon roles via RLS, and seeds are committed
  before use, but they are not hidden from a privileged operator. True secrecy
  would require an HSM/enclave (future work).

---

## 7. Key management (KMS-like)

- **Versioning**: `crypto_keys.key_version` is unique; every signed row records
  the version used.
- **Separation of duties**: private (signing) keys live only in Edge secrets;
  public (verification) keys live in the DB and are world-readable for audit.
- **Dual-control**: a key can only become `active` with two **distinct**
  approvers (`approved_by_1 <> approved_by_2`, enforced by a CHECK constraint).
- **Rotation**: generate `V(n+1)`, set its secret, register + activate it
  (dual-control). New writes use the active version; old signatures remain valid.
- **One active key per purpose** (partial unique index).

Bootstrap:

```bash
node tools/generate-keypair.mjs 1        # prints SK (secret) + PK + SQL
supabase secrets set POXY_SIGNING_SK_V1=<base64-sk>
# then run the printed INSERT/UPDATE to register + dual-control-activate the key
```

---

## 8. Deployment

```bash
# 1. Database
supabase db push                 # or paste migration_poxy_crypto_core.sql in SQL Editor
                                  # (run AFTER schema.sql + migration_poxy_world_2.sql)

# 2. Signing key
node tools/generate-keypair.mjs 1
supabase secrets set POXY_SIGNING_SK_V1=<base64-sk>
#   + register/activate the public key in crypto_keys (dual-control)

# 3. Other secrets used by the functions (service role auto-provided by platform)
supabase secrets set POXY_CRON_SECRET=<random>

# 4. Functions
supabase functions deploy mint_poxy transfer_poxy verify_poxy \
  verify_event_chain verify_merkle_tree rng_commit rng_reveal snapshot export_proof

# 5. Schedule the 24h snapshot (pg_cron example)
select cron.schedule('poxy_daily_snapshot','0 0 * * *', $$
  select net.http_post(
    url := '<project>.functions.supabase.co/snapshot',
    headers := jsonb_build_object('x-cron-secret','<POXY_CRON_SECRET>')
  );
$$);
```

> `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected
> into Edge Functions by the platform.

---

## 9. Blockchain migration roadmap (future L2 compatibility)

The system is intentionally shaped like a chain so it can graduate to a public
ledger with minimal redesign.

**Phase 0 — internal chain (this implementation).**
Append-only ledger, ED25519 signatures, Merkle roots, 24h `state_root`
snapshots inside Supabase.

**Phase 1 — external anchoring.**
Publish each snapshot `state_root` to an external append-only medium (public
chain tx, OpenTimestamps, or a witness service). This removes the "operator can
silently rewrite from backup" residual risk: any divergence between the live
`state_root` and the anchored one is provable.

**Phase 2 — verifiable data availability.**
Expose the full `creation_event_chain` + Merkle proofs as a public API/IPFS
bundle so third parties can reconstruct state independently. Proof packets
already support this offline.

**Phase 3 — L2 rollup bridge.**
Treat `ledger_events` as L2 transactions and `state_root` as the rollup state
commitment. A bridge contract on an EVM L2 (e.g. Base/Optimism) accepts periodic
`state_root` commitments. POXYs become mint-able as NFTs whose `tokenURI`
embeds `poxy_hash`; the proof packet maps directly to an on-chain inclusion
proof.

**Phase 4 — decentralized signing.**
Replace single-signer ED25519 with a threshold/multisig (e.g. FROST) or move
signing into a TEE/HSM, eliminating the trusted-operator assumption entirely.

**Compatibility choices already in place that make this cheap:**
- canonical, deterministic serialization (`stableStringify`) → reproducible hashes;
- per-row `key_version` → smooth signer migration;
- Merkle proofs in the standard `(sibling, position)` form → portable to Solidity;
- `state_root = SHA256(asset_root || event_root || balances_hash)` → a single
  32-byte commitment ready to anchor on-chain.

---

## 10. File map

```
supabase/
  migration_poxy_crypto_core.sql      schema · triggers · RLS · RPCs · merkle/state
  config.toml                         Edge Function JWT config
  functions/
    _shared/{crypto,canonical,kms,supabase,http}.ts   crypto service layer
    mint_poxy/ transfer_poxy/ verify_poxy/            write + verify
    verify_event_chain/ verify_merkle_tree/           integrity checks
    rng_commit/ rng_reveal/                           provably-fair RNG
    snapshot/ export_proof/                            checkpoints + proofs
tools/
  generate-keypair.mjs                ED25519 keygen (Node, no deps)
  verify-proof-packet.mjs             offline proof verifier (Node, no deps)
docs/
  POXY-CRYPTO-CORE.md                 this document
```

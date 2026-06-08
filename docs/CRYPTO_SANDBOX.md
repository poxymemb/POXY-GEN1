# POXY — Crypto Sandbox (single-asset dev)

Empty prod sandbox — open **one standard case** on `syntax` to mint the first ideal v3.1 POXY.

## Current state (2026-06-08)

| Table | Rows |
|-------|------|
| `user_poxy` | 0 |
| `poxy_assets` | 0 |
| `ledger_events` | 0 |
| `rng_rounds` | 0 |

Test account: **syntax** (`5dbbb61c-3c98-444b-8be3-ed42ff99091d`)

## After opening one case — verify checklist

1. Console: `[poxy-crypto] anchored` + toast `POXY minted · signature on record`
2. **RNG** — Verify → RNG ROUND → round ID from drop → PROVABLY FAIR
3. **Asset** — Verify → POXY HASH → `hash_matches` + `serial_matches: true`
4. **Event** — Verify → GENESIS EVENT ID → `hash_matches: true`
5. All three modes show the **same** `poxy_hash`, `game_serial`, `rng_round_id`, `genesis_event_id` in receipt

## v3.1 mint wiring (index.html)

`cryptoMint` passes `serial_number` + `rarity_seed` (= RNG `result_hash`) so game identity = crypto identity.

## Sandbox reset (admin SQL)

Immutability triggers on `poxy_assets` / `rng_rounds` must be disabled briefly:

```sql
BEGIN;
DELETE FROM marketplace; DELETE FROM burn_log; DELETE FROM case_open_events;
DELETE FROM poxy_gifts; DELETE FROM ledger_snapshots;
UPDATE poxy_assets SET genesis_event_id = NULL;
TRUNCATE ledger_events RESTART IDENTITY;
DELETE FROM user_poxy;
ALTER TABLE poxy_assets DISABLE TRIGGER poxy_assets_immutable;
DELETE FROM poxy_assets;
ALTER TABLE poxy_assets ENABLE TRIGGER poxy_assets_immutable;
ALTER TABLE rng_rounds DISABLE TRIGGER rng_rounds_immutable;
DELETE FROM rng_rounds;
ALTER TABLE rng_rounds ENABLE TRIGGER rng_rounds_immutable;
COMMIT;
```

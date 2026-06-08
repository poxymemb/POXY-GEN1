# POXY — Crypto Sandbox (single-asset dev)

One ideal v3.1 POXY on prod — cryptographic baseline for lifecycle hardening.

## Canonical asset (syntax)

| Field | Value |
|---|---|
| Account | `syntax` (`5dbbb61c-3c98-444b-8be3-ed42ff99091d`) |
| Serial | `PX-31AEE1` |
| Tier | epic |
| `user_poxy.id` | `e3104c36-0bad-4777-a74f-b054323f5c57` |
| `poxy_assets.id` | `bd6ce999-3c73-44d4-a92c-274ae1d543aa` |
| `poxy_hash` | `258faad02e6c9cc9845c7e8574b55e0141f32e31fcc6928d802984ee2a13f6dd` |
| Signature | `v1FcutkwPyxTGpNlE2zFNS7SHA0dPqKaNzLK3FvBayHfhJJNPmMPUq4uszTbDbgnIYCqbtgX2LK86sdGCs/fCw==` |
| RNG round | `ae4b7a99-9825-4bb2-8bd5-ecec8592beca` |
| Genesis event | `49f6034c-1886-4fd8-8275-bc47a3956929` |
| `rarity_seed` | `f783dd0531aee17cfb0b5da0655f9636be291083b2fb171f5b5c664899784c67` (= RNG `result_hash`) |

## Prod counts (2026-06-08)

| Table | Rows |
|-------|------|
| `user_poxy` | 1 |
| `poxy_assets` | 1 |
| `ledger_events` | 1 |
| `rng_rounds` | 1 |
| Unbackfilled | 0 |

## Verify checklist (all PASS)

1. **RNG** → `ae4b7a99-9825-4bb2-8bd5-ecec8592beca` → PROVABLY FAIR
2. **Asset** → `258faad0…` → `serial_matches: true`, ED25519 valid
3. **Event** → `49f6034c-…` → `hash_matches: true`
4. Receipt shows same hash / event / rng in all three tabs
5. Verify works from **any account** (invoke + RPC fallback)

## v3.1 mint wiring

`cryptoMint(serial, resultHash)` → `mint_poxy` → game serial = crypto serial.

## Next hardening (Phase 2 crypto lifecycle)

| # | Task |
|---|------|
| 1 | Burn → `transfer_poxy` DESTROY edge |
| 2 | Trade accept → edge TRADE |
| 3 | Gift send → `cryptoTransfer` |
| 4 | Trust HUD → server commit/result hashes |

## Sandbox reset (admin SQL)

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

# POXY — Backend Smoke Test Checklist

Run on **https://poxy-gens.vercel.app** after each backend phase.
Use a **test account** with dev topup if needed.

## Auth

- [ ] Email login works
- [ ] Session persists after refresh
- [ ] Logout clears session

## Economy core

- [ ] Balance displays in HUD
- [ ] **Dev topup** adds PC (founder/dev only)
- [ ] **Standard case** (`open_standard_case_v3`) — debits 1 PC, returns tier/serial
- [ ] Drop appears in **Collection**
- [ ] **Burn** single + bulk returns PC
- [ ] **Craft** 5× common → 1× uncommon

## Marketplace

- [ ] List item from collection
- [ ] Buy listing (`purchase_poxy`) — balance transfers, ownership changes
- [ ] Cancel own listing

## Social

- [ ] Send friend request → accept
- [ ] **Send gift** — asset removed from sender
- [ ] **Claim gift** — asset appears in recipient collection

## Club (mythic member)

- [ ] Club nav visible with mythic
- [ ] **VIP case open** (`open_vip_case`)
- [ ] Bounty progress + claim
- [ ] Vault slot claim

## Crypto layer

- [x] After case open, `cryptoMint` runs (console: `[poxy-crypto] anchored`)
- [ ] Failed mints queued in localStorage and drained on login
- [x] **Verify terminal** — asset / event / rng all return `ok: true` for PX-31AEE1
- [x] Verify works from **another account** (no Failed to fetch)
- [ ] **Marketplace buy** → `cryptoTransfer` TRADE event
- [ ] **Gift claim** → `cryptoMint` gift event
- [x] `count(poxy_assets)` = `count(user_poxy)` → **1 = 1** (2026-06-08)

## Phase 2 — verified

- [x] **Backfill** — unbackfilled `user_poxy` → **0**
- [ ] **Snapshot** — `ledger_snapshots` row (cron `poxy-ledger-snapshot-daily` active; first row after 02:00 UTC)
- [x] **Cron** — `poxy-ledger-snapshot-daily` active = true
- [ ] `purchase_poxy` returns `asset_id` + `[poxy-crypto] transfer anchored`

## Phase 3 — Provably Fair Gacha (prod verified 2026-06-08)

- [x] Case open uses commit-reveal → `[poxy-crypto] anchored`
- [x] `rng_rounds` row `status='revealed'` after open
- [x] `user_poxy.rng_round_id` set on drop
- [x] **PROVABLY FAIR** badge + verify tab pre-fill
- [x] `commit_matches` + `result_matches` = true (RPC)
- [x] `serial_matches` = true (game serial = crypto serial)
- [x] `rarity_seed` = RNG `result_hash`
- [x] Receipt cross-links identical in all 3 verify tabs
- [ ] **Burn** → DESTROY ledger event (needs edge hardening)
- [ ] **Trade accept** → TRADE ledger event (needs edge hardening)

## Phase 1 — fixed (verify)

- [ ] P2P trade **accept** / **decline**
- [ ] **Flash sale** (`purchase_flash_sale`)
- [ ] **Store themes** (`purchase_customization`)

## Known broken (later phases)

- [ ] Club **OTC** — mock hash only (Phase 4)
- [ ] Club **DAO** — localStorage only (Phase 4)

## SQL health (Supabase SQL Editor)

```sql
SELECT
  (SELECT count(*) FROM user_poxy) AS gameplay_assets,
  (SELECT count(*) FROM poxy_assets) AS crypto_assets,
  (SELECT count(*) FROM ledger_events) AS ledger_events,
  (SELECT count(*) FROM user_poxy up
   LEFT JOIN poxy_assets pa ON pa.user_poxy_id = up.id
   WHERE pa.id IS NULL) AS unbackfilled;
```

Target: `crypto_assets = gameplay_assets`, `unbackfilled = 0`.

## Canonical test asset (PX-31AEE1)

| Verify mode | Input |
|-------------|-------|
| POXY ASSET | `258faad02e6c9cc9845c7e8574b55e0141f32e31fcc6928d802984ee2a13f6dd` |
| LEDGER EVENT | `49f6034c-1886-4fd8-8275-bc47a3956929` |
| RNG ROUND | `ae4b7a99-9825-4bb2-8bd5-ecec8592beca` |

---

*Updated 2026-06-08 — Phase 3 crypto baseline PASS on prod.*

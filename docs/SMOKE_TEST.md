# POXY — Backend Smoke Test Checklist

Run on **https://poxygen1.vercel.app** (or local `index.html`) after each backend phase.
Use a **test account** with dev topup if needed.

## Auth

- [ ] Email login works
- [ ] Session persists after refresh
- [ ] Logout clears session

## Economy core

- [ ] Balance displays in HUD
- [ ] **Dev topup** adds PC (founder/dev only)
- [ ] **Standard case** (`open_standard_case_v2`) — debits 1 PC, returns tier/serial
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

- [ ] After case open, `cryptoMint` runs (check browser console — no silent fail)
- [ ] Failed mints are **queued** (`poxy_crypto_mint_queue` in localStorage) and drained on next login
- [ ] **Verify terminal** — `public_verify` returns valid for minted asset
- [ ] **Marketplace buy** → `cryptoTransfer` TRADE event in ledger (check console)
- [ ] **Gift claim** → `cryptoMint` gift event for new asset (check console)
- [ ] `count(poxy_assets)` = `count(user_poxy)` (all backfilled)

## Phase 2 — verified

- [ ] **Backfill** — `SELECT COUNT(*) FROM user_poxy up LEFT JOIN poxy_assets pa ON pa.user_poxy_id=up.id WHERE pa.id IS NULL` → **0**
- [ ] **Snapshot** — `SELECT * FROM ledger_snapshots ORDER BY snapshot_at DESC LIMIT 1` — row present with `root_hash`
- [ ] **Cron** — `SELECT jobname, active FROM cron.job WHERE jobname='poxy-ledger-snapshot-daily'` → active = true
- [ ] `purchase_poxy` returns `asset_id` in response (console: `[poxy-crypto] transfer anchored`)

## Phase 3 — Provably Fair Gacha

- [ ] Case open uses commit-reveal: console shows `[poxy-crypto] anchored` after click
- [ ] `rng_rounds` row created with `status='revealed'` after open
- [ ] `user_poxy.rng_round_id` is set on new drops
- [ ] **PROVABLY FAIR** badge visible in win reveal modal + hunt page
- [ ] Clicking badge opens verify tab (pre-filled with round_id)
- [ ] Client can verify: `SHA256(server_seed + client_seed + '0') == result_hash`
- [ ] Tier derivation verifiable: `parseInt(result_hash.slice(0,8), 16) / 4294967296` → float → tier
- [ ] Serial verifiable: `'PX-' + result_hash.slice(8,14).toUpperCase()`
- [ ] **Burn** writes DESTROY event in `ledger_events` for each burned asset
- [ ] **Trade accept** writes TRADE event + updates `poxy_assets.current_owner_id`
- [ ] SQL health: `SELECT count(*) FROM ledger_events WHERE event_type='DESTROY'` increases on burn

## Phase 1 — fixed (verify)

- [ ] P2P trade **accept** (`accept_trade_offer`) — assets transfer to recipient
- [ ] P2P trade **decline** (`decline_trade_offer`)
- [ ] **Flash sale** (`purchase_flash_sale`) — single RPC, no double VIP charge
- [ ] **Store themes/gradients** (`purchase_customization`) — works with economy guard

## Known broken (later phases)

- [ ] Club **OTC** — mock hash only (Phase 4)
- [ ] Club **DAO** — localStorage only (Phase 4)

## SQL health (Supabase SQL Editor)

```sql
SELECT
  (SELECT count(*) FROM user_poxy) AS gameplay_assets,
  (SELECT count(*) FROM poxy_assets) AS crypto_assets,
  (SELECT count(*) FROM ledger_events) AS ledger_events;
```

Target after Phase 2: `crypto_assets = gameplay_assets` (minus burned).

---

*Update this checklist as phases complete.*

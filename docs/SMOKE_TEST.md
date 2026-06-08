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
- [ ] **Verify terminal** — `public_verify` returns valid for minted asset
- [ ] `count(poxy_assets)` approaches `count(user_poxy)` over time

## Known broken (Phase 1 targets)

- [ ] P2P trade **accept** — assets must transfer (currently broken)
- [ ] Club **OTC** — mock hash only
- [ ] Club **DAO** — localStorage only
- [ ] Flash sale — client-side balance race

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

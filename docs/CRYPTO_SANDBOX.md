# POXY — Crypto Sandbox (single-asset dev)

One POXY on prod for perfecting the cryptographic engine end-to-end.

## Current canonical asset (syntax)

| Field | Value |
|---|---|
| Account | `syntax` (`5dbbb61c-3c98-444b-8be3-ed42ff99091d`) |
| `user_poxy.id` | `030cf5cc-9709-43d0-9624-8b6713652140` |
| Serial | `PX-802B69` |
| Tier | common |
| RNG round | `2ae965f0-16fc-4237-913c-f9b5a3d81f2b` |
| `poxy_assets.id` | `933c3d87-b4db-4c03-8a64-ac9df3339836` |
| `poxy_hash` | `8504876cf26ebd8440da5bf6a80a5365b498305e80328b9d47e92174cd390ec1` |
| Genesis event | `ca905698-4912-416f-b8c1-51804d1dd43f` (ledger `seq = 1`) |
| Signatures | Real ED25519 (not STUB) |

## Verify checklist (this asset)

1. **RNG** — Verify tab → RNG ROUND → `2ae965f0-16fc-4237-913c-f9b5a3d81f2b` → PROVABLY FAIR
2. **Asset** — Verify tab → POXY ASSET → `8504876cf26ebd8440da5bf6a80a5365b498305e80328b9d47e92174cd390ec1`
3. **Event** — Verify tab → LEDGER EVENT → `ca905698-4912-416f-b8c1-51804d1dd43f`
4. Console after case open: `[poxy-crypto] anchored` + toast `POXY minted · signature on record`

## Crypto engine — next steps to “ideal”

| # | Task | Why |
|---|---|---|
| 1 | Burn → real `transfer_poxy` DESTROY edge (not SQL stub) | Full signed destroy chain |
| 2 | Trade accept → edge TRADE (not SQL stub) | Consistent signatures |
| 3 | Gift send → TRANSFER out + claim mint | Both sides anchored |
| 4 | Trust HUD uses **server** `commit_hash` / `result_hash` (not client demo round) | One source of truth |
| 5 | Re-sign any future STUB events | ED25519 only |
| 6 | `get_pubkey_helper` in repo + snapshot cron smoke | Ops parity |

## Sandbox reset (admin SQL only)

Prod tables `poxy_assets` / `rng_rounds` block hard DELETE — disable immutability triggers briefly, then:

1. `TRUNCATE ledger_events RESTART IDENTITY`
2. Delete extra `user_poxy` rows
3. Delete extra `poxy_assets` / `rng_rounds` (trigger off)
4. Re-insert single genesis MINT with `prev_event_hash = 000…000`

*Executed 2026-06-08 — kept PX-802B69 only.*

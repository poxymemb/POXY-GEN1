# 30 — ECONOMY: currencies, prices, sinks and sources

Narrative source of truth for the economy. Runtime truth for odds and prices
is the database (`case_odds`, `case_types`, `px_packs`); `packages/shared`
mirrors locked constants for types and display. If this document and the DB
disagree, the DB is wrong or this doc needs an architect decision — flag it.

## Currencies (three, by design)

| Currency | Nature | Enters the economy | Leaves the economy |
|---|---|---|---|
| **PX** | Premium | Stripe purchases; small drips from PASS premium track | Cases, market purchases (5% fee burned), cosmetics |
| **Shards** | Soft | Dissolving duplicates, quests, events, shard wheel | Crafting figures |
| **XP** | Progression | Playing (opens, quests, trades, crafts) | Never spent; levels only |

Why Shards exist: without a soft currency, duplicates are pure
disappointment, F2P players have no economy to play, and the Market has no
price anchor. Shards fix all three: every duplicate is progress toward a
chosen figure.

PX is never withdrawable to cash. PX cannot be gifted or transferred between
users outside item sales. This keeps us clearly outside money-transmission
and gambling-payout territory (UK posture).

## PX packs (Stripe, GBP)

| Pack | Price | PX | PX per £ |
|---|---|---|---|
| Starter | £4.99 | 500 | 100.2 |
| Standard | £9.99 | 1,100 | 110.1 |
| Value | £19.99 | 2,400 | 120.1 ("best value" chip — honest math) |
| Big | £49.99 | 6,500 | 130.0 |
| Vault | £99.99 | 14,000 | 140.0 |

Statement descriptor: "AETRYX POXY". Receipts show AETRYX LTD.

## Case tiers

| Tier | Price PX | Position |
|---|---|---|
| Paper | 100 | Entry; the daily free case base tier |
| Bronze | 250 | Streak day 3–6 free tier; referral reward |
| Silver | 500 | Streak day 7+ free tier; community event reward |
| Gold | 1,000 | The "serious" case |
| Obsidian | 2,500 | Top tier; pass t50 reward |

Odds per tier are public, stored in `case_odds`, MCU-editable, and shown
before every purchase. Every opening stores an odds snapshot so past
openings verify against the odds that were live at the time.

## Pity

Guaranteed Epic+ within 20 opens; guaranteed Legendary+ within 60. Counters
per case-tier family, server-side, visible as the Pity Ring. Crafting does
NOT touch pity counters (crafting is certainty, not chance).

## Shards: dissolve and craft

Dissolve yield by rarity (locked):

| Rarity | Dissolve yield | Craft cost (4×) |
|---|---|---|
| Common | 10 | 40 |
| Uncommon | 25 | 100 |
| Rare | 60 | 240 |
| Epic | 150 | 600 |
| Legendary | 400 | 1,600 |
| Mythic | 1,000 | 4,000 |

Craft cost = 4× the target figure's dissolve yield, so four duplicates of a
rarity always craft one chosen figure of that rarity. Crafting requires the
figure not sold out and allocates a real mint number (provenance marked
"Crafted"). Dissolving retires the mint number forever.

## Sinks and sources

**PX sinks:** cases · market fee (5% burned on every sale, 3% for VIP
sellers; burned means no wallet receives it) · cosmetic frames and profile
themes · museum plaques.

**Shard sinks:** crafting (primary) · event side-costs.

**F2P sources:** daily case (streak-scaled) · quests (daily 3, weekly 2) ·
community events · referrals (both sides get a Bronze case when the invited
friend reaches account level 5, cap 25 rewarded referrals/month) · shard
wheel daily spin.

## Monetization

| Product | Price | Contents |
|---|---|---|
| **POXY PASS** | £9.99 / season | 50 tiers, free + premium track. Free: shards, XP boosts, 2 Bronze + 1 Silver case. Premium: above + PX drip totaling 1,200 (more than the £9.99 pack — honest value), Gold case at t25, Obsidian + exclusive profile frame at t50. Retroactive claim on upgrade. |
| **VIP** | £4.99 / month | Second daily case, market fee 3%, animated Passport frame, 24h early event access. Stripe subscription with customer portal. |

Pass tier = season level. One progression; the pass never sells power, only
acceleration and cosmetics.

## Spending safety (enforced server-side)

- Monthly spend limit: user-set in Settings; checkout blocks (409) when the
  limit would be exceeded.
- Self-exclusion: 24h/7d/30d; blocks checkout, case opening and market buys
  (403) until expiry.
- All purchases final except statutory rights; 14-day cooling-off waived on
  digital delivery consent (checkbox at checkout).

## Ledger discipline (no exceptions, ever)

Every balance change — PX or Shards, grant or spend, refund or burn — is a
row in `wallet_ledger` (reason + ref_id, unique-guarded for idempotency).
The `wallets` table is a cached sum maintained by trigger. A reconciliation
script asserts wallet == Σ ledger for every user and runs in CI. Any code
path that touches a balance without a ledger row is a critical bug.

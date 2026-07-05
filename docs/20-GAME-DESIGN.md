# 20 — GAME DESIGN: loops, systems, Collector Score

The game is a collection engine wrapped in three retention loops, glued by a
social layer. Every system below is server-authoritative; the client renders.

## The core loop

Open a case → receive a figure mint (unique, numbered) → keep it (collection,
Museum, Score) or dissolve it into Shards → Shards craft the figures you
actually want → wanting more figures brings you back to cases and the Market.

Duplicates are never dead: a duplicate is Shards, and Shards are progress
toward a chosen figure. This single decision (soft currency) is what keeps
the gacha from "leaking" players.

## Three retention loops

| Loop | Rhythm | Mechanics |
|---|---|---|
| Daily | 3–7 min | Login streak → free daily case (tier grows with streak: d1–2 Paper, d3–6 Bronze, d7+ Silver), 3 daily quests, 1 free shard-wheel spin |
| Weekly | 20–40 min | Weekly quest chain, community goal (server-wide: open N cases together → everyone who contributed gets the reward), Museum showcase rotation |
| Seasonal | 8–12 weeks | POXY PASS (50 tiers), Season Atlas (complete sets → Passport plaques), season finale event, season XP reset |

Social glue across loops: escrow trades, showcase feed of big pulls,
Collector Score leaderboard, referral chain (both sides get a Bronze case at
friend's level 5), Discord roles synced to account level.

## Progression: XP and levels

Dual counter, never spendable:

- **Account Level** — permanent. Curve: `xp(level) = 100 × level^1.6`.
- **Season Level** — resets each season. Linear: 500 XP per level, 50 levels.
  The season level IS the pass tier (one progression, no separate pass XP).

XP sources (locked constants in `packages/shared`): open case +20 × tier
index, first open of the day +50, quest completions (per quest), trade +30,
craft +25, dissolve +5.

## Pity (a feature, not a secret)

Per case-tier family: guaranteed Epic+ within 20 opens, guaranteed Legendary+
within 60. Counters are stored server-side and SHOWN to the player as the
Pity Ring — a progress ring on the Open screen. Transparency turns a
compliance mechanism into anticipation.

## Scarcity model

Every figure has a finite, public run size. Mint numbers are allocated
sequentially (1, 2, 3…) and never reused. When mint_number reaches run_size,
the figure is sold out: removed from case pools, uncraftable, only obtainable
on the player Market. Dissolved mints retire their number (the "burned"
count is public on the figure detail — deflation is content).

## Collector Score

The single metric of collection value — our "Gamerscore". Formula (locked,
implemented identically in `packages/shared/src/score.ts` and a Postgres
view):

```
score(mint) = rarity_base × scarcity × early_bonus
  rarity_base: common 1, uncommon 3, rare 10, epic 30,
               legendary 100, mythic 400
  scarcity    = clamp(2500 / run_size, 0.5, 10)
  early_bonus = mint_number ≤ run_size × 0.05 ? 1.25 : 1.0   (first 5% of run)

set_bonus: +15% on the sum per COMPLETE item set (all 6 rarities of one item);
           +50% one-time for the full Season Atlas (all 24 figures).

CollectorScore(user) = Σ mint scores × set multipliers, integer-rounded.
```

Drives: leaderboard (top 100, season + all-time), profile hero number,
trade honesty screen ("You give 340 · You receive 120"), seasonal rewards.

## Spaces

- **Collection** (Gallery) — the private shelf: 24-figure grid grouped by
  item, owned/missing states, live remaining-run counts, figure detail with
  provenance (every mint links to its verifiable opening).
- **Museum** (public, `#/u/:username`) — up to 8 pinned mints on glass
  pedestals with plaques. The flex surface; SEO/OG-shareable.
- **Passport** — the player identity document: avatar, level, Collector
  Score, member-since, plaques. Exportable as a 9:16 image (built-in
  virality).
- **Open** (Vault) — case selection with odds one tap away, Pity Ring,
  and the Open Ritual.
- **Market** — player listings and direct trades, 5% fee burn as the main
  economy sink.

## The Open Ritual (signature moment)

The authoritative beat-for-beat timeline lives in `docs/11-SCREEN-DNA.md`
(implemented as `ritual.ts`). The shape:

1. **Lights down** — the Gallery→Vault primitive; chrome fades, only the
   case remains.
2. **The Oath** — the commit hash types on in mono: "Sealed before your
   roll." Honesty IS the theatre, and it is never skippable.
3. **The Still** — one slow breath. Silence is the drama; no rarity hints,
   no near-miss theatre, ever.
4. **The Break & Emergence** — a single hairline of light crosses the case;
   the figure travels up from depth; the pigment glow blooms behind it (the
   only sanctioned rarity-color moment).
5. **The Plaque** — name sets in Fraunces, mint number counts up in mono;
   Epic+ fires one star sparkle.
6. **Result rest** — Keep · Dissolve (+N shards) · Open another · Verify
   this opening.

Common/Uncommon shorten the ceremony (~1.4s — respect the player's time);
Mythic extends the Still. Tap during the Still skips to Emergence; the Oath
never skips. Reduced motion: Oath shown instantly, result fades in.
Multi-open ×10: face-down grid, rarest flips last (sorted server-side).

## Responsible design (UK posture, day one)

18+ age gate at onboarding (dob required, server-validated), public odds
everywhere, monthly spend limit setting, self-exclusion (24h/7d/30d) enforced
server-side on checkout AND opening AND market purchases, no PX-to-cash
withdrawal ever. These are brand armor, not friction.

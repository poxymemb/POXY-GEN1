# 11 — SCREEN DNA
### Composition blueprints. Follow, don't improvise.

Every screen obeys the Codex (`docs/10-BRAND.md`): tokonoma (one hero),
tatami grid (8pt, ≤680px content, 3:4 cards, 74px rail, 1px hairlines),
three motion tempos, quarantined pigments, one sky accent per viewport.
This file fixes each screen's hero, environment, zones, tempo and
forbidden list so feature sessions (PROMPTS 03–12) make zero design
decisions. New screen = add a blueprint here first.

Wireframes are mobile-first (390px). Desktop wraps the same column in the
74px rail + topbar shell; the column never exceeds 680px.

---

## 1. Home (Gallery)

**Hero (tokonoma):** today's featured case on a paper pedestal, one sky
CTA "Open" — the single accent of the viewport.
**Below the fold:** quest rings row → season wall teaser → market movers.
Max 4 modules. Home is a foyer, not a mall.

```
+----------------------------------+
| Header: "POXY" · PX chip · bell  |
+----------------------------------+
|                                  |
|        [ today's case ]          |  <- pedestal, paper-raised
|        Case name (Fraunces)      |
|        [ Open  (sky CTA) ]       |  <- THE accent
|                                  |
+----------------------------------+
| Quests   (o) (o) (o)   2/3 done  |  <- rings row, caption
+----------------------------------+
| Season wall  17/24   [teaser]    |  <- StatNumber + 3 thumbnails
+----------------------------------+
| Market movers   > > >            |  <- 3 compact rows, data-m prices
+----------------------------------+
| TabBar                           |
+----------------------------------+
```

**Tempo:** entrance travel for modules (Current, 40ms stagger). No ambient
motion. **Forbidden:** promo banners, countdown timers, more than one CTA,
rarity pigments anywhere.

---

## 2. Open (Vault)

**Hero:** the altar — the selected case, centered, breathing room around.
**Environment:** vault; entered ONLY through lightsDown. Balance is quiet
(top corner caption). PityRing persistent top-right. OddsTable one tap
away (sheet). Case selector: horizontal glass cards along the bottom.

```
+----------------------------------+
| hash (oath, after 1st open) 60%  |
|  balance (caption)   PityRing    |
|                                  |
|          [ THE CASE ]            |  <- altar, glass
|          Case name               |
|      PX price + £ caption        |
|        [ Open  (sky) ]           |
|                                  |
|  Odds ^ (opens sheet)            |
+----------------------------------+
| [case] [case] [case] [case]      |  <- glass cards, horiz scroll
+----------------------------------+
```

**Tempo:** the Open Ritual below. Selector swipe = Current. Caustic drift
allowed (the only ambient). **Forbidden:** near-miss anything, auto
re-open, hiding the odds behind more than one tap, festive chrome.

### THE OPEN RITUAL — authoritative timeline (implemented: `ui/motion/ritual.ts`)

| t (ms) | Beat | Detail |
|---|---|---|
| 0–420 | Lights down | lightsDown; UI chrome fades; only case remains |
| 420–1000 | The Oath | commit hash types on in JBM 13, caption "Sealed before your roll."; hash stays pinned top, 60% dim |
| 1000–1800 | The Still | case centered, ONE slow breath (scale 1→1.015→1); silence is the drama; NO rarity hints — no near-miss theatre ever |
| 1800–1950 | The Break | a single hairline of light crosses the case (sky, 1px, 150ms); case splits along it |
| 1950–2350 | Emergence | figure travels up from depth (Ritual ease, overshoot 1.03); pigment glow blooms behind (radial, pigment-glow, 0→1) |
| 2350–2900 | The Plaque | name sets in Fraunces; Plaque slides in; mint № countUp in mono; sparkle(pigment) fires once for Epic+ |
| 2900+ | Result rest | action sheet travels up: Keep · Dissolve (+N) · Open another · Verify |

Rarity scaling: Common/Uncommon skip The Break (simple emergence, total
~1400ms — respect the player's time); Mythic extends The Still +400ms and
sparkle count 14. Multi-open ×10: grid of face-down cards flip in Current
tempo, rarest flips LAST (sorted server-side), single shared plaque
summary. Skip: tap anywhere during The Still jumps to Emergence. Never
skippable: the Oath — honesty is not skippable. Reduced motion: Oath
(instant) → result card fade.

---

## 3. Collection (Gallery)

**Hero:** the season wall itself — the grid is the object.
**Absence is designed:** unowned figures are grayscale silhouettes with
dashed hairlines. Progress "17/24" as StatNumber, not a nagging meter.

```
+----------------------------------+
| Header: "Collection" · chips     |
| 17/24 (data-l)   Season 1 v      |
| [All] [Owned] [Missing] chips    |
+----------------------------------+
| shelf hairline ------------------|
| [card] [card] [card-unowned]     |  <- 3:4, 16pt gutters
| [card] [card-unowned] [card]     |
| shelf hairline ------------------|
| Club shelf (locked treatment)    |
+----------------------------------+
```

**Tempo:** cards travel in with 30ms stagger on first paint only. Card
hover lift = micro-signature #1. **Forbidden:** "complete the set!"
banners, red badges, pigment-colored card borders.

---

## 4. Figure Detail (sheet over Collection)

**Hero:** the artwork on a pedestal. Sheet slides up (Current).

```
+----------------------------------+
| [==== artwork on pedestal ====]  |
| Figure name (Fraunces title)     |
| RarityBadge · run "1 of 250"     |
| [ink plaque № 0017 / 250]        |
| Lore paragraph (body, catalog)   |
| Run StatNumbers: minted · burned |
| Provenance list (Seal marks)     |
|   ~ opened 12 Mar 2026  [seal]   |
| Actions: List · Dissolve · Gift  |
+----------------------------------+
```

**Tempo:** sheet = Current; provenance rows travel with 25ms stagger.
**Forbidden:** price pressure ("worth 3× more!"), pigment backgrounds
(pigment lives in the badge/gem only).

---

## 5. Market (Gallery, dense allowed)

**Hero — the sanctioned exception:** none. A market's hero is the crowd;
the search/filter bar leads. 16pt rhythm allowed.

```
+----------------------------------+
| [ search ............ ] [filter] |
| [All] [Rare+] [Under 100] chips  |
+----------------------------------+
| row: gem name · № · spark · px   |  <- hairline rows, data-m
| row: ...                         |     sparklines hairline-thin
| row: ...                         |
+----------------------------------+
| TabBar                           |
+----------------------------------+
```

**Tempo:** rows fade/travel 20ms stagger, Surface for hover. **Forbidden:**
flashing price changes, urgency copy ("selling fast!"), decorative sky.

---

## 6. Museum (public profile shelf)

**Hero:** the Passport header (owner identity), then the pedestal grid.

```
+----------------------------------+
| Passport header (name, score)    |
+----------------------------------+
| [pedestal] [pedestal]            |  <- glass on gallery, plaques
| [pedestal] [pedestal]            |
+----------------------------------+
```

Owner mode: drag to reorder, Current tempo settle. Visitor mode: read
only, plaques + provenance links. **Forbidden:** engagement bait
("visit again tomorrow!").

---

## 7. Profile / Passport

**Hero:** the Passport card itself.
**Export composition (locked):** 9:16, vault background, star watermark
(6% paper), display name Fraunces, Collector Score in SG 48, season
completion row, the Seal bottom-right ONLY if Atlas complete.

```
+----------------------------------+
|        [ PASSPORT CARD ]         |  <- the hero, 9:16 preview
| Score (data-l) · Rank caption    |
| Settings list (hairline rows)    |
| Spend limits · Self-exclusion    |  <- always reachable, never buried
+----------------------------------+
```

**Forbidden:** gamified settings, hiding safety controls.

---

## 8. Quests / Pass

**Hero:** today's quest ring trio. Pass track below: star ticks fill
along a hairline; paid row under free row, no "2× VALUE" bursts.

```
+----------------------------------+
| (O) (O) (O)  daily rings         |
| Weekly list (hairline rows)      |
| Pass track: *--*--*--o--o        |
|   free row / paid row            |
+----------------------------------+
```

**Tempo:** ring fill = Current; tick fill = star fill morph (#4).
**Forbidden:** streak-shaming, "claim now!" pulses, countdown anxiety.

---

## 9. Event (Vault)

**Hero:** the event's featured object on the altar. Same ritual grammar as
Open; event chrome is a caption row, not a carnival. lightsDown on entry.

---

## 10. Store (Gallery)

**Hero:** the PX pack row leads.
**Law:** every PX price shows £ equivalent in caption. No bundle pressure.

```
+----------------------------------+
| PX packs: [500] [1200] [2600]    |  <- price + £ caption each
| Cases (paper cards, odds link)   |
| Restore purchases (ghost)        |
+----------------------------------+
```

**Forbidden:** "BEST VALUE" flames, decoy pricing, timers.

---

## 11. Settings

Hairline list rows, Inter body, section captions. Theme, motion (performance
mode), notifications, account, legal, danger zone (sign out ghost, delete
account danger-quiet). No hero — settings is backstage, not a screen the
tokonoma rule applies to (it has no object of contemplation).

---

## 12. Auth (Gallery)

**Hero:** one centered paper card.

```
+----------------------------------+
|            [ star ]              |
|       POXY WORLD (Fraunces)      |
|  [ email ................ ]      |
|  [ password ............. ]      |
|  [ Continue (sky) ]              |
|  magic link ghost · age gate     |
+----------------------------------+
```

18+ gate before account creation, spend-limit prompt at first purchase —
server-enforced, UI states it plainly. **Forbidden:** social-proof
counters, FOMO copy.

---

## 13. Onboarding (Gallery → Vault → Gallery)

Three beats, one screen each, skippable as a whole except the fairness
beat's Oath explainer line:

1. "This is your museum." (Gallery, shelf with one silhouette)
2. "Openings are sealed before you roll." (Vault, mini-Oath demo — the
   commit-hash line types on; this beat is the honesty handshake)
3. "The first case is on us." (the gift case on the altar → first ritual)

**Tempo:** beats advance with lightsDown/lightsUp — onboarding teaches the
transition language by using it.

---

## 14. Verify / Fairness (Gallery, mono column)

**Hero:** the verdict.

```
+----------------------------------+
| "Opening № 8,214" (title)        |
| server seed hash (mono)          |
| client seed (mono)               |
| nonce · result math (mono)       |
| [ Recompute (ghost) ]            |
|        [ SEAL ]                  |  <- stamps on verdict
|      "Proven fair."              |
+----------------------------------+
```

The Seal stamp (90ms settle) plays exactly once per verdict render. This
page and certificates are the only Seal surfaces. **Forbidden:** skipping
the math, "trust us" copy without the recompute path.

---

## Shared laws (all screens)

- Enter Vault only through lightsDown; leave through lightsUp.
- One sky accent per viewport; a screen with two CTAs is a screen with none.
- Pigments only in gems, badges, reveal glow.
- Numbers in SG; proofs in JBM; names/lore in Fraunces; UI in Inter.
- Empty states = invitations with the star at 10% ink.
- Reduced motion: instant final states everywhere, no exceptions.
- Touch targets ≥44px; content column ≤680px; test at 390px.
- User text in display type (museum titles, reveals, certificates) calls
  `ensureDisplayFontFor()` first — Cyrillic names fall back to Playfair,
  not the OS serif (ADR-0003).
- Loading: washi skeletons (`ui/skeleton.ts`), never shimmer sweeps; the
  star spinner is reserved for full-screen waits.

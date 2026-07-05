# 10 — THE POXY CODEX
### Brand & design core · 静水 Still Water · v1.1

This document outranks every future visual decision. When a mockup, a trend,
a metric or an agent disagrees with the Codex, the Codex wins until an ADR
amends it. Machine values live in `packages/tokens/tokens.json`; screen
composition law lives in `docs/11-SCREEN-DNA.md`. This file is the *why* and
the *what*; those files are the *how much* and the *where*.

---

## 1. Philosophy — 静水 Still Water

POXY WORLD is a quiet room in a loud industry.

Gacha products scream. Confetti cannons, gold explosions, sirens, panic
timers, reels that slow down just past the jackpot to make your pulse spike.
The industry's whole visual language is engineered adrenaline — and players
know it. They play anyway, and they feel handled.

We are the opposite: **a still water surface with depth beneath.**
Anticipation lives in silence, not noise. The player should feel like a
collector entering a private museum at dusk — not a tourist herded through
a casino floor. Stillness is not the absence of excitement; it is what makes
excitement legible. A single ripple on still water is an event. The same
ripple in a storm is nothing.

Three materials build our entire world, all drawn from Season 1,
"Japanese Memories":

- **PAPER (washi)** — the Gallery. Matte, bright, printed. Where you browse,
  read, compare, own. The light of a museum at 10am: even, honest,
  unhurried. Paper holds catalogs, shelves, markets, settings.
- **WATER / GLASS** — the Vault. The surface of dark water at night. Where
  ritual happens: openings, events, live drops. Sky `#60C2E0` is not "an
  accent color" — it is *water and light*. It appears only where the player
  can act, or where fate is being decided. Nowhere else.
- **INK (sumi)** — the voice. Typography, strokes, icons, plaques. Ink never
  shouts; it states. A brushstroke does not blink, pulse, or beg.

Every future decision — a button, an animation, a sound, a promo module —
is tested against one sentence:

> **"Would this exist in a quiet museum, or only in a casino?"**

If the answer is casino — delete it. No metric overrides this test.

**Rules**
- Two environments only: Gallery (paper) and Vault (water/glass). Ink speaks
  in both.
- Sky is the single interactive accent; one accent moment per viewport.
- The casino-test is applied in every review, to every PR that touches UI.

---

## 2. Psychology — why each rule exists

The Codex is not taste; it is applied psychology with the manipulation
removed. Each principle below names the mechanism, then the honest use we
make of it.

**Peak–end rule.** People remember an experience by its peak and its end,
not its average. Our peak is the Open Ritual; our end is the result plaque.
Both are precisely choreographed — and *everything between them stays flat
and calm on purpose*. A quiet app is not a boring app: quiet is what makes
the reveal loud. If the whole interface sparkles, the reveal is just more
sparkle. This is why chrome never animates idly, why buttons don't pulse,
why the Gallery has no ambient motion at all.

**Endowment effect.** People value what they own far beyond its market
price — when ownership feels tangible. So we design certificates, not
popups: mint numbers set in mono on ink plaques, provenance lines with
dates and verify links, museum pedestals with ground shadows. A POXY figure
is not a JPEG in a grid; it is № 0142 of 2,500, opened on a date, on a
shelf you arranged.

**Zeigarnik effect (open loops).** Incomplete things occupy the mind.
Casinos abuse this with nagging badges and red dots. We render
incompleteness as *elegant absence*: the missing figure is a grayscale
silhouette on the shelf, a dashed hairline where a card will be, a quiet
"2 missing" in a caption. The shelf itself asks to be completed; the app
never nags.

**Variable reward, ethically framed.** The thrill of chance is the genre's
heart and we keep it — but the anxiety-machinery around it is removed. The
Pity Ring makes the guarantee visible: instead of a dark-pattern near-miss
("so close! one more spin!"), the player sees real, monotonic progress
toward Epic and Legendary floors. Public odds turn superstition into
strategy. Visible pity is our answer to near-miss theatrics: real progress
instead of fake "almost".

**Processing fluency = trust.** Interfaces that are easy to parse are
*believed*. Numbers always appear in one dedicated face (Space Grotesk),
proofs always in mono, whitespace is generous, hierarchy is single-voiced.
A calm, consistent surface reads as honest; visual chaos reads as scam —
because in this industry, it usually is.

**Von Restorff (isolation) effect.** The item that differs is the item
remembered. Exactly one sky accent per viewport; rarity pigments are
quarantined to gems and badges. Color is rationed precisely so that when
color DOES appear — a legendary's gold gem, the akane seal — it detonates.

**Rules**
- Peak and end are choreographed; everything else is flat by design.
- Ownership artifacts (plaque, provenance, pedestal) over celebration
  artifacts (banners, badges, confetti).
- Absence is designed, never nagged.
- Pity and odds are always visible — anxiety is converted to strategy.
- One number face, one proof face, one accent. Fluency is a trust feature.

---

## 3. The Star — brand geometry

The soft 4-pointed star — *hikari*, a point of light on water — is our atom.
It is the only decorative glyph in the product. Not a mascot, not a logo
lockup with a wordmark on every surface: a single geometric object, used
with discipline.

**Canonical construction** (master: `assets/brand/star.svg`):
two superellipses crossed at 45°, concave sides, point radius 6% of the
bounding box, waist 36% of the bounding box. ViewBox `0 0 100 100`, a single
path, `fill="currentColor"` — the star takes the color of its context and
never carries its own.

```svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path fill="currentColor" d="M 49.5 7.8
    Q 50 2 50.5 7.8
    C 53.6 33.9 66.1 46.4 92.2 49.5
    Q 98 50 92.2 50.5
    C 66.1 53.6 53.6 66.1 50.5 92.2
    Q 50 98 49.5 92.2
    C 46.4 66.1 33.9 53.6 7.8 50.5
    Q 2 50 7.8 49.5
    C 33.9 46.4 46.4 33.9 49.5 7.8 Z"/>
</svg>
```

(The master file is the authority; this snippet is a copy for orientation.
The seal's path lives only in `assets/brand/seal.svg` — it is not meant to
be re-inlined by features; the `Seal` component renders it.)

Everything derives from the star:

| Use | Treatment |
|---|---|
| Loading spinner | The star, slow 1.6s rotation with a scale breath (1→1.06→1). The only spinner in the product |
| Progress ticks | Small stars fill along quest/pass tracks |
| List bullets | Marketing and landing lists only |
| Feed reaction | The single reaction type — a star, filled on tap |
| Favicon / app icon | The star on ink |
| Rarity gem | The star silhouette filled with a pigment (see §4) |
| Sparkle particle | The Ritual's particle system emits 6–14 tiny stars |
| Checkbox checked | The star replaces the checkmark |
| Nav active state | Rail/tab icons fill with the star form + sky tint |

**Rules**
- No other decorative glyph exists anywhere: no diamonds, no sparkle emoji,
  no generic spinners, no second mascot shape.
- The star is always `currentColor`; context decides its color, and the
  quarantine rules (§4) still apply.
- Do not redraw, skew, or add points. One master file, referenced everywhere.

---

## 4. Color — pigments, not palette

We do not have "a palette" in the marketing sense. We have three materials
(§1) and a case of pigments used the way a printmaker uses them: rarely,
deliberately, in fixed places.

### Core (locked)

| Token | Hex | Role |
|---|---|---|
| paper | `#F0F0F1` | Gallery ground; text on ink |
| paper-raised | `#FFFFFF` | Cards and raised paper surfaces |
| paper-sunken | `#E6E7E9` | Wells, inputs, recessed zones |
| ink | `#1C1C1E` | Text on paper; ink fills; plaques |
| ink-soft | `#3A3A3F` | Secondary strokes, inactive icons |
| vault-deep | `#101014` | Vault ground |
| vault-abyss | `#0A0A0D` | Ritual backdrop only; the lightsDown scrim |
| sky-100 | `#EAF7FB` | Selection, faintest water |
| sky-300 | `#A8DEED` | Hover fields, secondary water |
| sky-500 | `#60C2E0` | THE accent: actions, focus, progress, links |
| sky-700 | `#2E8FAD` | Pressed states; sky on light needing contrast |
| sky-900 | `#17546A` | Deep water; sky text on paper (AA large) |

Sky appears only where the player can act or where fate is being decided.
Decorative sky — sky borders on random cards, sky section headers — is a
Codex violation.

### Rarity pigments — traditional Japanese colors

Rarity does not use the interface's colors; it uses *pigments* — six
traditional Japanese colors, one per rarity. They replace every earlier
rarity hex set.

| Rarity | Pigment | Hex | Note |
|---|---|---|---|
| Common | Nezumi 鼠 (mouse grey) | `#8E9196` | Almost ink — commonness is dignified, not sad |
| Uncommon | Rokushō 緑青 (verdigris) | `#57A17C` | Oxidized bronze green |
| Rare | Ruri 瑠璃 (lapis) | `#3D6BC6` | Deep lapis, clearly distinct from sky |
| Epic | Murasaki 紫 (imperial purple) | `#8A5BC4` | The court color |
| Legendary | Kin 金 (gold leaf) | `#D9A441` | Matte gold leaf, never yellow |
| Mythic | Akane 茜 (madder crimson) | `#C43A50` | The seal red lives here |

**The quarantine rule (hard):** pigments appear ONLY in

1. gem SVGs (`RarityGem` — the star filled with pigment),
2. `RarityBadge` (a pigment dot beside an Inter caption),
3. the reveal glow inside the Open Ritual (`pigment-glow`, alpha 40%).

Never on buttons, backgrounds, text links, charts, borders or headings.
When a legendary's gold finally blooms behind an emerging figure, it must be
the first gold the player has seen all session.

### Functional colors

System feedback only, muted derivatives, caption-size text and small marks:
success `#4E9D74` · danger `#C24A55` · warning `#D9A441`. Functional colors
never decorate; a form error is a caption in danger, not a red panel.

**Rules**
- Core values are locked; pigments are locked; do not tint, lighten or remix.
- One sky moment per viewport. Pigments quarantined to gem/badge/glow.
- Vault-abyss is reserved for the ritual backdrop and lightsDown scrim.
- Functional colors speak only in system feedback at caption scale.

---

## 5. The Seal — 印

Our proof mark: a square hanko-style stamp in akane red, containing the
star knocked out in negative. Like a real stamp impression, its border is
slightly irregular and one corner is faintly ink-starved — imperfection is
what makes a stamp real. Master: `assets/brand/seal.svg` (100×100, the
irregular square border at 2px equivalent weight, star negative, akane
`#C43A50` as its only color).

The Seal is the visual embodiment of "Proof, not promises" — and its power
comes entirely from scarcity. Usage is SACRED, limited to authenticity
moments:

- the Verify verdict — "Proven fair." stamps onto the page with a 90ms
  settle (scale 1.15→1, 1° rotation),
- certificates and exported Passports (Atlas-complete),
- provenance entries (crafted/opened records),
- the public fairness page.

Never decoration. Never marketing. Never a loading state, a like button, a
promo sticker. A seal that appears everywhere proves nothing.

**Rules**
- The Seal appears only at authenticity moments; each new use requires a
  Codex amendment (ADR).
- Always akane. Never recolored, never outlined, never animated beyond the
  single stamp settle.
- Code-level guard: the `Seal` component documents this rule and only
  verify/certificate features may import it.

---

## 6. Typography — the museum voice

Four faces, each with one job. A screen may use at most three; Fraunces and
Space Grotesk never sit on the same line.

| Face | Job | Never |
|---|---|---|
| **Fraunces** (variable, optical size axis high, wonk off) | Display & catalog: figure names, lore, landing headlines, season titles | UI labels, buttons, numbers |
| **Inter** | The interface: labels, buttons, body, settings, captions | Display headlines |
| **Space Grotesk** | NUMBERS ONLY: scores, run counts, prices, odds, timers — tabular figures on | Prose, labels |
| **JetBrains Mono** | PROOF ONLY: hashes, seeds, mint № on plaques, verify math | Anything that is not evidence |

Syne is retired everywhere, including the landing hero (ADR-0002): it is
trend-bound display type with the wrong voice — a nightclub flyer, not a
catalog. Fraunces replaces it: a serif with printed-page warmth that makes
figure names read like catalog entries in a museum monograph.

### Scale (mobile-first)

| Role | Face | Size/Line | Weight | Notes |
|---|---|---|---|---|
| display | Fraunces | 40/44 | 560 | opsz high; landing, season titles |
| title | Fraunces | 28/34 | 540 | screen titles, figure names |
| heading | Inter | 20/26 | 600 | section heads |
| body | Inter | 16/24 | 400 | prose, settings |
| caption | Inter | 13/18 | 400 | metadata, functional feedback |
| data-l | Space Grotesk | 32/36 | 500 | hero numbers (scores, odds) |
| data-m | Space Grotesk | 15/20 | 500 | inline numbers, prices |
| mono | JetBrains Mono | 13/20 | 400 | hashes, mint №, proofs |

Sentence case everywhere. No exclamation marks in system UI. Letterspacing:
Fraunces tight (-0.01em), captions +0.01em, mono as cast.

**Rules**
- Max three faces per screen; Fraunces + SG never share a line.
- Numbers are heroes: any number a player cares about is set in SG.
- Proofs are evidence: anything cryptographic is mono, no exceptions.
- Syne must not return. Fonts are self-hosted woff2 subsets (see tokens).

---

## 7. Motion — water & light

Motion is water: it flows through space, it never pops. Three tempos exist,
and nothing else:

| Tempo | Duration | Easing | Used for |
|---|---|---|---|
| **Surface** | 200ms | `cubic-bezier(0.2, 0, 0, 1)` | Hovers, toggles, chips, focus |
| **Current** | 320ms | `cubic-bezier(0.32, 0.72, 0, 1)` | Panels, sheets, route changes |
| **Ritual** | 600–2400ms | `cubic-bezier(0.34, 1.30, 0.5, 1)` (overshoot) | Reveals and the Seal settle ONLY |

Principles:

- **Nothing moves without cause.** Every animation is triggered by the
  player or by a state change the player caused. No idle loops in chrome.
- **Motion travels through.** Entrances are slide+fade *through* space —
  from below (sheets), from depth (vault content, scale 1.04→1). Nothing
  pops in at full size and opacity from nowhere.
- **One thing at a time.** Outside rituals, at most one element animates at
  any moment. Two simultaneous animations = one too many.
- **Reduced motion is sacred.** `prefers-reduced-motion` collapses
  everything to 150ms opacity fades and instant final states — including
  the Ritual (Oath shown instantly, result fades in).
- **Ambient life, barely.** The Vault background carries a caustic light
  drift — a 60s CSS loop at opacity ≤0.05. The water is alive if you stare,
  invisible if you don't. This is the only ambient motion in the product,
  and it pauses under reduced motion.

All choreography is built from the primitives in `apps/web/src/ui/motion/`
(lightsDown/lightsUp, travel, sequence, sparkle, countUp) — feature code
never writes its own keyframes. Signature moments (the lights-down
transition, the Open Ritual timeline, the Seal stamp, the five
micro-signatures) are specified beat-for-beat in `docs/11-SCREEN-DNA.md`.

**Rules**
- Three tempos only; Ritual easing never leaves reveals/Seal.
- No feature-side keyframes; use motion primitives.
- One animated element at a time outside rituals.
- Reduced-motion path implemented and tested for every animation.

---

## 8. Layout DNA — tokonoma & tatami

**Tokonoma principle.** In a Japanese home, the tokonoma is the alcove that
holds exactly one object worth contemplating. Every screen has exactly ONE
hero object: Home — today's case; Open — the case on its altar; Collection —
the season wall; Figure detail — the figure; Profile — the Passport. If two
things compete to be the hero, the screen is wrong — demote or remove one.
(The Market is the sanctioned exception: its hero is the crowd itself — the
search/filter bar leads.)

**Tatami grid.** Proportion over decoration:

- 8pt base unit for all spacing.
- Content column: 100% width up to a 680px maximum.
- Figure cards locked at 3:4 — the catalog plate proportion.
- Hero zones use the 1:2 tatami proportion.
- Left rail 74px, locked. Mobile: bottom tab bar.
- Hairlines: 1px at 12% ink (Gallery) / 10% paper (Vault). Walls are drawn,
  not shaded — separation comes from lines and space, not boxes in boxes.

**Density has meaning.** Gallery breathes: minimum 24pt section gaps —
museum walls are not crowded. Market may compress to 16pt — a market is
allowed to bustle. Vault is emptiest of all — darkness needs room; a ritual
in a cluttered room is just a transaction.

Per-screen composition blueprints live in `docs/11-SCREEN-DNA.md`. Follow
them; do not improvise new layouts mid-feature.

**Rules**
- One hero per screen (tokonoma). Market's hero is the filter bar.
- 8pt spacing; ≤680px content; 3:4 cards; 74px rail; 1px hairlines.
- Gallery ≥24pt gaps, Market ≥16pt, Vault sparser than Gallery.
- New screen = new blueprint in SCREEN-DNA first, layout second.

---

## 9. Voice in the interface

A curator, not a barker. The interface speaks rarely, precisely, and in
sentence case.

- **Reveal copy is minimal.** The rarity word and the plaque ARE the
  congratulation: "Legendary. № 17 of 250." No adjectives, no "amazing",
  no "you're on fire". The number is the drama.
- **Empty states are invitations.** "The shelves are ready." "An empty
  shelf is an invitation." Never "Nothing here yet 😢", never a sad-face
  illustration.
- **Errors state fact, then remedy.** "Payment didn't complete. Nothing was
  charged." "That username is taken. Try another." Never blame, never
  cuteness, never "Oops!".
- **Numbers speak in SG.** If copy contains a number the player cares
  about, the number gets the data face and the words stay quiet around it.
- No exclamation marks in system UI. No emoji in system UI. No em-dashes in
  user-facing copy (write plainly instead).

**Rules**
- Sentence case; no exclamation marks; no emoji; no em-dashes in UI copy.
- Reveal = rarity word + plaque. Empty = invitation. Error = fact + fix.

---

## 10. Forbidden — the anti-casino list

Any PR introducing one of these fails review regardless of metrics:

- Fake urgency timers on purchases.
- Near-miss theatrics (reel slowing past a mythic; rarity hints before the
  reveal; "so close!" messaging).
- Confetti / coin-rain.
- "97% of players bought this" claims and any manufactured social pressure.
- Odds hidden behind extra taps.
- Flashing or pulsing CTAs.
- Dark-pattern decline buttons ("No, I hate value").
- Autoplay re-open loops (an opening never starts without a fresh tap).
- Currency obfuscation beyond one step: on store surfaces, a PX price always
  shows its £ equivalent in a caption.
- Skipping The Oath in the ritual (the commit hash is honesty; honesty is
  not skippable).
- Rarity pigments outside gem/badge/reveal-glow.

This list is verbatim law. Extending it requires an ADR; shortening it
requires the architect.

---

## Appendix A — brand asset masters

| Asset | File | Spec |
|---|---|---|
| The Star | `assets/brand/star.svg` | §3 construction; viewBox 0 0 100 100; single path; `currentColor` |
| The Seal | `assets/brand/seal.svg` | §5; 100×100; irregular hanko border; star negative; akane |

Preview snippets are embedded in the Living Codex page (`#/codex`, dev
build) together with every component state, pigment row, type ramp and
motion demo. The Codex page is the fastest way to *feel* whether a change
belongs in this product.

## Appendix B — quick review checklist

Before any UI commit, verify:

1. Casino-test passes on every new element.
2. One sky accent per viewport; pigments only in gem/badge/glow.
3. Correct faces: Fraunces display, Inter UI, SG numbers, JBM proofs;
   ≤3 faces per screen; Fraunces+SG never inline.
4. One hero per screen; 8pt rhythm; hairlines not boxes.
5. Motion uses primitives; one thing at a time; reduced-motion path exists.
6. Copy: sentence case, no exclamation marks, numbers in SG.
7. Nothing from §10 crept in.

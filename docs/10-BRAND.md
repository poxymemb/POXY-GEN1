# 10 — BRAND: Sky Design System, voice, motion

The visual language is called **Sky**. Its tokens are locked; its machine
source of truth is `packages/tokens/tokens.json`, projected to CSS in
`packages/tokens/css/variables.css`. Mockup history lives in `design/v2/`
(prototype era) — the token values below override any older reference.

## Core palette (locked — never change values)

| Token | Value | Role |
|---|---|---|
| Sky-500 | `#60C2E0` | The accent: interactive elements, links, focus rings, progress |
| Ink | `#1C1C1E` | Dark surfaces; text on paper |
| Paper | `#F0F0F1` | Light surfaces; text on ink |

Sky spans a 100–900 scale around Sky-500. Ink and paper get 80/60/40/20 alpha
steps for dimmed text, hairlines and glass.

The base is a **cold monochrome**: ink, paper, and their alphas do almost all
the work. Sky-500 is the only voice of interactivity. Nothing else is colored —
which is what makes rarity color land when it appears.

## Rarity colors (the one exception)

| Rarity | Value |
|---|---|
| Common | `#9BA1A6` |
| Uncommon | `#6FBF8F` |
| Rare | `#5A8DE8` |
| Epic | `#9A6AE8` |
| Legendary | `#E8A44A` |
| Mythic | `#E85A7A` |

**Rule (non-negotiable): rarity colors appear ONLY on gem SVGs and rarity
badges.** Never on layout, surfaces, buttons, headings or body text. The one
sanctioned "glow" moment is the rarity reveal inside the Open Ritual.

## Logo and iconography

The mark is a **soft 4-pointed star gem**. It recurs as: loading spinner
(rotating 12px star), placeholder artwork on figure slots, the reveal sparkle,
and the single feed reaction. Aesthetic reference: Apple visionOS glass —
translucency, backdrop blur, thin hairlines, generous whitespace.

## Dual Environment (scene modes, not themes)

Two environments share the same tokens and switch semantic variables via
`data-env` on the scene container:

- **GALLERY** (`data-env="gallery"`, paper base) — Collection, Market,
  Profile, Quests. Museum daylight: ink text on paper, thin hairlines, calm.
- **VAULT** (`data-env="vault"`, ink base) — the Open Ritual, Events, live
  drops. Dark glass, blur, Sky-500 glow, the star sparkle.

Entering an opening dims the world. The Gallery→Vault transition (lights
down, glass in) is the signature moment of the product and is built once as
a reusable shell primitive.

Semantic variables switched per environment: `--surface`, `--surface-raised`,
`--text`, `--text-dim`, `--hairline`, `--glass-bg`, `--glass-border`, `--glow`.

## Typography

| Role | Face | Use |
|---|---|---|
| UI | SF Pro / Inter / system-ui | Everything by default |
| Display numbers | Space Grotesk | Odds, scores, run counts as heroes |
| Data | JetBrains Mono | Hashes, proofs, seeds, mint numbers "№ 0142 / 2,500" |
| Landing hero | Syne | Landing hero ONLY, nowhere else |

Numbers are heroes. Run sizes, odds, scores get display treatment; the chrome
around them stays quiet.

## Layout

- Desktop: fixed left rail, 74px. Mobile: bottom tab bar.
- Mobile-first always; test at 390px.
- Touch targets ≥44px; focus-visible ring in Sky-500.

## Motion language: "paper & light"

| Tier | Duration | Use |
|---|---|---|
| Micro | 200ms | Hovers, toggles, chips |
| Panel | 320ms | Route transitions, sheets, modals |
| Ritual | 600–900ms | Open Ritual and rarity reveals ONLY |

- Standard easing: `cubic-bezier(0.32, 0.72, 0, 1)`.
- Overshoot is allowed only in the Open Ritual and rarity reveals.
- `prefers-reduced-motion`: the ritual collapses to a 150ms crossfade;
  micro/panel motion effectively disappears. This is honored everywhere, no
  exceptions.
- Rive animations are deferred until after beta; every artwork slot ships
  with a documented placeholder (star gem on environment surface) and a
  `data-rive-slot` attribute for later.

## Voice and tone

A museum curator, not a casino barker. Calm, precise, quietly poetic.

- Sentence case everywhere. No exclamation marks in system UI.
- No hype adjectives. Numbers carry the excitement: not "OMG LEGENDARY!!!"
  but "Legendary. 1 of 250."
- Errors state the fact and the fix: "That username is taken. Try another."
- Empty states are invitations: "An empty shelf is an invitation."
- Glossary terms only (see `50-GLOSSARY.md`): Figure, Case, Open Ritual,
  Dissolve. Never "lootbox", "NFT", "burn" in UI.

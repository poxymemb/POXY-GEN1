# ADR-0002 — Still Water design core adopted (Codex v1.1)

- Status: accepted
- Date: 2026-07-05
- Deciders: Nikita (architect); implemented per CONTEXT_CORE_PATCH v1.1 + PROMPT 02A

## Context

The Sky design system carried the rebrand through the prototype era, but its
spec was a token table without a philosophy: agents produced screens that
were consistent in values yet inconsistent in feel, and every ambiguous case
(how loud may a reveal be? where may rarity color appear? what does a
transition mean?) was re-litigated per session. Meanwhile the category
pressure is real: gacha UIs default to casino patterns unless a design law
explicitly forbids them.

## Decision

Adopt **静水 Still Water** as the design core, documented as The POXY Codex
(`docs/10-BRAND.md`), superseding the previous "Sky" design section wherever
they conflict. Key rulings:

1. **Materials over palette.** Three materials — paper (washi) for Gallery,
   water/glass for Vault, ink (sumi) for the voice. Sky `#60C2E0` is
   redefined as *water and light*: the sole interactive accent, max one
   accent moment per viewport.
2. **Rarity = Japanese pigments**, replacing the previous rarity hexes
   (`#9BA1A6/#6FBF8F/#5A8DE8/#9A6AE8/#E8A44A/#E85A7A` are retired):
   Nezumi `#8E9196` · Rokushō `#57A17C` · Ruri `#3D6BC6` · Murasaki
   `#8A5BC4` · Kin `#D9A441` · Akane `#C43A50`. Quarantine unchanged and
   hardened: gems, badges, reveal glow only.
3. **Syne is retired everywhere, including the landing hero.** It is
   trend-bound and tonally wrong (nightclub, not catalog). **Fraunces**
   (variable, optical size) is added as the display/catalog voice: figure
   names, lore, season titles, landing headlines. Inter keeps UI; Space
   Grotesk is numbers-only; JetBrains Mono is proofs-only. Max three faces
   per screen; Fraunces and Space Grotesk never share a line.
4. **The Seal (印) is introduced** (`assets/brand/seal.svg`): an akane
   hanko stamp with the star in negative, reserved exclusively for
   authenticity moments (verify verdict, certificates, provenance,
   fairness page). Scarcity is what makes it mean something; new uses
   require a Codex amendment.
5. **The Star is canonized** (`assets/brand/star.svg`): single master file,
   currentColor, the only decorative glyph in the product.
6. **Motion is fixed to three tempos** (Surface 200ms / Current 320ms /
   Ritual 600–2400ms with overshoot reserved for reveals and the Seal), all
   choreography built from shared primitives in `ui/motion/` — feature code
   writes no keyframes.
7. **Layout DNA**: tokonoma (one hero per screen) + tatami (8pt, ≤680px
   content, 3:4 cards, 74px rail, 1px hairlines); density is semantic
   (Gallery breathes, Market may bustle, Vault is emptiest).
8. **The anti-casino forbidden list** is law; violations fail review
   regardless of metrics.

## Supersedes / updates

- `docs/10-BRAND.md` fully rewritten as the Codex (old Sky section retired).
- Old rarity hexes in `packages/tokens` and `.cursor/rules/10-web.mdc` are
  replaced in PROMPT 02B implementation (tokens) and rules text (this
  session's consistency pass).
- `CONTEXT_CORE_PATCH_v1_1` rides with `01_CONTEXT_CORE` at the top of every
  session from 02A onward; on conflict the patch wins.

## Consequences

- Every visual decision now has a test ("quiet museum or casino?") and a
  written law; ambiguity moves from taste debates to Codex lookups.
- `packages/tokens/tokens.json` must be regenerated to pigment values and
  extended scales (02B Phase 1); components must pass the compliance
  checklist (02B Phase 5).
- Fonts change deployment: Fraunces/Inter/Space Grotesk/JetBrains Mono are
  self-hosted woff2 subsets (02B); no Google Fonts runtime dependency.
- Screen composition is no longer improvised: `docs/11-SCREEN-DNA.md` (02C)
  becomes mandatory reading for feature sessions 03–12.
- Open question deferred to after 02B: paper grain (2% noise on Gallery hero
  surfaces) — optional class exists; decision by visual review on the
  Codex page (architect delegated the call to the implementer's taste).

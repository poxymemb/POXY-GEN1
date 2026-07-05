# ADR-0003 — Cyrillic display type: Playfair fallback now, RU localization later

Date: 2026-07-05 · Status: accepted

## Context

Fraunces, the display voice of Still Water, ships no Cyrillic. The beta UI
is EN-only, but user content — collector names, gifted-figure dedications —
may be Cyrillic from day one. Without a decision, Cyrillic display text
falls through to the OS serif (Times New Roman on Windows), which reads as
a rendering bug on the most emotional surfaces (certificates, museum
titles, reveals).

## Decision

1. The display stack becomes `'Fraunces', 'Playfair Display', Georgia,
   'Times New Roman', serif` (in `packages/tokens/tokens.json`).
2. A 21 KB Playfair Display **cyrillic subset** lives in
   `apps/web/public/fonts/playfair-cyrillic.woff2`. It is NOT preloaded:
   `ui/fonts-cyrillic.ts` exposes `ensureDisplayFontFor(text)` which
   font-detects (U+0400–04FF) and lazily registers the face the first time
   Cyrillic user content is about to render. English visitors never pay
   for it.
3. Playfair Display is chosen because it is the closest freely-licensed
   serif to Fraunces' voice: high-contrast transitional forms, close x-height,
   works at display sizes. The pairing is fixed NOW so a later RU launch
   does not trigger a rebrand.

## Consequences

- Full RU localization (UI copy, dates, pluralization, RTL-safe layouts)
  is a **post-beta epic**, tracked separately; nothing in this ADR blocks
  or starts it.
- Any feature rendering user text in display type must call
  `ensureDisplayFontFor()` (Screen DNA notes this in the museum, reveal
  and certificate blueprints).
- Body text is unaffected: Inter ships full Cyrillic already.
- If brand review ever rejects Playfair's Cyrillic voice, the only
  alternative considered was commissioning Cyrillic for Fraunces —
  deferred as cost-prohibitive for beta.

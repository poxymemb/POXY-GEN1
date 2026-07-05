# CLAUDE.md — agent entrypoint for POXY-GEN1

POXY WORLD: a mobile-first collectible/gacha web platform by **AETRYX LTD**
(UK). Players open cases, collect limited-run figures, display them in a
Museum, trade on a Market, climb a Collector Score leaderboard. Brand pillar:
**"Proof, not promises"** — public odds, commit-reveal verifiable openings,
published run sizes. Orient yourself here first, every session.

## Map of docs (read what your zone needs)

| Doc | Contents |
|---|---|
| `docs/00-VISION.md` | Why the product exists, the anti-casino stance |
| `docs/10-BRAND.md` | The POXY Codex (Still Water): materials, pigments, star/seal, type, motion, layout DNA |
| `docs/11-SCREEN-DNA.md` | Per-screen composition blueprints (lands with 02C) |
| `docs/20-GAME-DESIGN.md` | Loops, pity, scarcity, Collector Score formula |
| `docs/30-ECONOMY.md` | Currencies, prices, yields, sinks/sources, ledger law |
| `docs/40-ARCHITECTURE.md` | Stack, data flow, RLS philosophy, crypto engine |
| `docs/50-GLOSSARY.md` | The only allowed vocabulary. Never invent synonyms |
| `docs/decisions/` | ADRs. One decision = one file. Add one when you deviate |

## Where things live

| Thing | Location |
|---|---|
| The game (Vite + vanilla TS) | `apps/web/src/{app,features,ui,lib}` |
| Admin (MCU / POXY OS, Next.js) | `apps/mcu` — do not touch unless the session declares it |
| Design tokens (source of truth) | `packages/tokens/tokens.json` → generated `css/variables.css` |
| Shared types + locked constants | `packages/shared/src` |
| DB migrations (go-forward, CLI) | `supabase/migrations/*.sql` |
| DB migrations (prototype era) | `supabase/migrations/legacy/` — frozen, order per its `MIGRATIONS.md` |
| Edge functions (Deno) | `supabase/functions/` |
| Season seed data | `supabase/seed/` |
| Art sources, `.riv` (git-lfs) | `assets/` (Rive integration deferred until after beta) |
| Retired single-file prototype | `archive/prototype-v1/` — still DEPLOYED via Vercel; hotfixes only |
| v2 mockups (visual reference) | `design/v2/` |

## Workflow rules (non-negotiable)

1. **One zone per session.** Do not touch files outside declared scope.
2. **Phase plan first** (numbered), then implement phase by phase.
3. **Commit after every completed phase**: `feat(zone): phase N — summary`.
   Never squash phases. Push to the current feature branch, never to `main`
   directly (PR review is the merge path).
4. **DB changes only via new migration files.** Never edit old migrations,
   never patch prod by hand. Every new table ships with RLS + policies.
5. **After each phase, self-review**: mobile 390px, reduced motion honored,
   RLS respected, rarity colors only in gems/badges, glossary terms only.
6. Full file output when a file is under 300 lines; surgical diffs above.
7. If the spec forces a deviation, STOP — write the question into your final
   report (and an ADR if you had to decide), do not improvise silently.

## Hard safety lines

- Client code NEVER holds service-role keys, prices, odds or yields as
  inputs — the server reads them from the DB.
- Every balance change goes through the ledger. Wallets are cached sums.
- Crypto engine (commit-reveal RNG, hashes, Merkle, signatures) is
  server-side only.
- 18+, spend limits and self-exclusion are server-enforced; never bypass.
- Secrets never enter git; `.env*` is ignored repo-wide.

## Commands

```bash
nvm use                      # Node 22
npm install                  # root, installs all workspaces
npm run dev                  # apps/web dev server
npm run build                # apps/web production build (tsc + vite)
npm run dev:mcu              # MCU dev server (needs env vars, see README)
npm run build:mcu            # MCU production build
```

## Current state (updated 2026-07-05)

Repo restructured to monorepo (PROMPT 01 of the Beta Launch Pack complete).
`apps/web` is a boot placeholder; the design system (PROMPT 02), shell/auth
(PROMPT 03) and gacha engine (PROMPT 04) are the next sessions in order.
The deployed product is still the archived prototype.

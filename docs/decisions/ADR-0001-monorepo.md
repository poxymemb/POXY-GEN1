# ADR-0001 — Monorepo with Vite + vanilla TypeScript

- Status: accepted
- Date: 2026-07-05
- Deciders: Nikita (architect); implemented per Beta Launch Pack PROMPT 01

## Context

POXY WORLD grew as a single-file prototype: one `index.html` (~16k lines,
~700 KB) plus `assets/`, patched by regex-driven build scripts. It proved the
product and carries a live Supabase backend, but it fights every tool we
have: agents lose context inside one giant file, CSS/JS patches collide,
review diffs are unreadable, and there is no type safety at all. The admin
console (MCU / POXY OS, Next.js, ~74 routes) lived in a separate repo
(`poxymemb/nullspace-lab`), splitting deploy config and docs from the game.

The rebrand-in-place strategy (Sky layers over the legacy DOM, "Strangler
Fig") took us as far as it could — 13 reskinned screens — but a beta with
real money needs a codebase agents and humans can navigate deterministically.

## Decision

1. **One monorepo** (`poxymemb/POXY-GEN1`) with npm workspaces:
   `apps/web` (the game), `apps/mcu` (admin, imported from nullspace-lab),
   `packages/tokens` (design tokens), `packages/shared` (types + locked game
   constants), `supabase/` (migrations, edge functions, seed).
2. **Vite + modular vanilla TypeScript** for the game. This is NOT a
   framework migration: no React/Vue/JSX, no virtual DOM. Same vanilla
   philosophy, but split into modules with types and a real build.
3. **The prototype is archived, not deleted**: `archive/prototype-v1/`
   stays intact and remains the DEPLOYED product (Vercel `outputDirectory`
   points at it) until `apps/web` reaches beta parity. Restore point,
   reference, and zero production risk during the rebuild.
4. **Legacy SQL frozen** in `supabase/migrations/legacy/` with its
   `MIGRATIONS.md` apply-order manifest (filenames unchanged — their
   alphabetical order never matched apply order; the manifest is the truth).
   Go-forward migrations are CLI-managed timestamped files in
   `supabase/migrations/`.
5. **MCU imported as-is** (working tree of nullspace-lab@87df018, no git
   history) renamed to `@poxy/mcu`; its pnpm lockfile dropped in favor of
   the root npm workspace lockfile. Its git history stays in the old repo.

## Deviations from the PROMPT 01 letter (flagged, not improvised)

- `.nvmrc` says **22**, not 20: Node 20 reached end-of-life 2026-04-30;
  Node 22 is the active LTS, local toolchain and Vercel default. Both apps
  build on 22.
- Existing edge functions were NOT reduced to a `.gitkeep` — the 13 live
  prototype functions stay in `supabase/functions/` because production
  depends on them.
- `discord-bot/` remains at repo root (its own service, own lockfile,
  outside npm workspaces). Revisit when PROMPT 09 extends the bot.

## Consequences

- Agents navigate by zone (`apps/web/src/features/*`) instead of scrolling a
  monolith; one zone per session becomes enforceable via cursor rules.
- Tokens, game constants and the score formula live in exactly one place
  each and are imported, not copy-pasted.
- The old always-applied rule "we are NOT migrating, single-file is
  intentional" is retired with the prototype; `.cursor/rules/` and
  `CLAUDE.md` now describe the monorepo world.
- Until beta parity, bug fixes to the LIVE product must be made inside
  `archive/prototype-v1/` (frozen except for hotfixes) — an accepted
  transitional cost.
- Vercel keeps serving the prototype unchanged; switching the deploy to
  `apps/web` is an explicit later step (PROMPT 10/12 territory).

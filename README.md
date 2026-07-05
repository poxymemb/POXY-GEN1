# POXY WORLD

A digital atelier of collectible figures by **AETRYX LTD** (UK). Players open
cases, collect limited-run figures across seasons, display them in a personal
Museum, trade on a player Market, and climb the Collector Score leaderboard.

The brand pillar is **proof, not promises**: every case shows its odds before
purchase, every opening is verifiable through commit-reveal RNG with a public
verify page, and every run size is published. Honesty as a feature, in a
category people distrust.

## Repository layout

```
apps/web          the game — Vite + vanilla TypeScript (no framework)
apps/mcu          POXY OS — staff admin console (Next.js)
packages/tokens   Sky Design System tokens (single source of truth)
packages/shared   shared types + locked game constants
supabase/         migrations, edge functions, seed data
assets/           art sources and .riv files (git-lfs)
design/           v2 mockups and the Rive lab (reference)
docs/             vision, brand, game design, economy, architecture, glossary
archive/          retired single-file prototype (still deployed, hotfix-only)
```

Agents and contributors: start with `CLAUDE.md`, then the docs your zone
needs. Collaboration workflow: `docs/COLLABORATION.md`.

## Setup

Requirements: Node 22 (`nvm use`), git-lfs (`git lfs install`).

```bash
git clone https://github.com/poxymemb/POXY-GEN1.git
cd POXY-GEN1
npm install            # installs all workspaces
```

## Commands (from repo root)

| Command | What it does |
|---|---|
| `npm run dev` | apps/web dev server |
| `npm run build` | apps/web production build (tsc + vite) |
| `npm run preview` | preview the web build |
| `npm run dev:mcu` | MCU dev server |
| `npm run build:mcu` | MCU production build |

### MCU environment

`apps/mcu` needs a local `.env.local` (never committed):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-only, staff console
```

The web app (`apps/web`) will use `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` once the Supabase client lands (PROMPT 03).

## Deployment

Vercel deploys from `main`. During the beta rebuild the deployed product is
the archived prototype (`archive/prototype-v1`, see `vercel.json`); switching
the deploy to `apps/web` is an explicit later step. Never push to `main`
directly — feature branch → PR → architect review.

## Status

Monorepo restructure complete (Beta Launch Pack PROMPT 01). Next sessions in
order: design system & UI kit, app shell + auth + onboarding, gacha engine.

© 2026 AETRYX LTD. All rights reserved.

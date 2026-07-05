# 40 — ARCHITECTURE: stack, data flow, RLS philosophy

## Stack (locked)

| Layer | Choice | Notes |
|---|---|---|
| Web app | Vite + vanilla TypeScript, no framework | `apps/web`, hash router, mobile-first (390px) |
| Admin | Next.js (MCU / POXY OS) | `apps/mcu`, staff-gated via `admin_emails` |
| Backend | Supabase (project `rbrtjkfawdnomvvyxwvp`) | Postgres + RLS, Auth, Storage, Edge Functions (Deno) |
| Payments | Stripe under AETRYX LTD | Checkout + webhooks in an edge function |
| Deploy | Vercel from GitHub `poxymemb/POXY-GEN1` | Prototype serves from `archive/prototype-v1` until beta parity |
| Crypto engine | SHA-256 commit-reveal RNG, ED25519 signatures, Merkle ledger | Server-side ONLY, never client |

## Monorepo layout

```
POXY-GEN1/
├── CLAUDE.md                  # agent entrypoint: rules + map of docs
├── docs/                      # numbered docs (this file) + decisions/ (ADRs)
├── apps/
│   ├── web/                   # the game: Vite + vanilla TS
│   │   └── src/{app,features,ui,lib}/
│   └── mcu/                   # POXY OS admin (Next.js)
├── packages/
│   ├── tokens/                # design tokens: tokens.json → css/variables.css
│   └── shared/                # types, rarity/economy constants, score formula
├── supabase/
│   ├── migrations/            # CLI-managed, timestamped (go-forward)
│   │   └── legacy/            # prototype-era SQL + MIGRATIONS.md order manifest
│   ├── functions/             # edge functions (Deno)
│   └── seed/                  # Season 1 seed data
├── assets/                    # art sources, .riv (git-lfs)
├── design/                    # v2 mockups (reference), rive lab
├── discord-bot/               # community bot (separate service)
└── archive/prototype-v1/      # the retired single-file app, still deployed
```

One source of truth per thing: tokens in `packages/tokens`; odds in the DB
(with `packages/shared` mirroring types); terms in `docs/50-GLOSSARY.md`;
decisions in `docs/decisions/`.

## Data flow

```
 ┌─────────────┐         ┌──────────────────────────────────────────┐
 │  apps/web   │  anon/  │                SUPABASE                  │
 │  (browser)  │  authed │                                          │
 │             ├────────►│  PostgREST ──► Postgres (RLS ON)         │
 │  reads:     │  select │                   ▲                      │
 │  figures,   │         │                   │ service role         │
 │  odds, own  │         │  Edge Functions ──┘                      │
 │  wallet…    │  POST   │  open-case · stripe-webhook · dissolve   │
 │             ├────────►│  craft · market-* · trade-* · claim-*    │
 │  writes: ───┼─NEVER──►│  (ALL writes that move value)            │
 └─────────────┘ direct  └──────────┬───────────────────────────────┘
        ▲                           │
        │ redirect                  │ webhooks (signed)
        ▼                           ▼
 ┌─────────────┐            ┌──────────────┐
 │   Stripe    │◄──────────►│  apps/mcu    │ staff-only (admin_emails)
 │  (checkout) │   events   │  (POXY OS)   │ reads views, audits ledgers
 └─────────────┘            └──────────────┘
```

The client is a renderer with a session. Anything that creates, moves or
destroys value (PX, Shards, mints, listings, trades, claims) happens inside
an edge function or SECURITY DEFINER RPC in a single transaction, with an
idempotency key, writing to append-only ledgers.

## RLS philosophy

1. **RLS on every table. No exceptions.** A table without RLS is a critical
   bug even if "nothing sensitive is in it yet".
2. **Users read their own rows** (`auth.uid() = user_id`) on wallets,
   ledgers, openings, mints, trades, messages, notifications.
3. **Public catalog data is public**: `figures`, `case_types`, `case_odds`,
   `seasons` — read-only for everyone (odds transparency is product).
4. **Public profile data goes through views** (`public_profiles`,
   leaderboard views) that whitelist columns. Base tables stay closed.
5. **Clients never write value tables.** Inserts/updates on wallets, mints,
   openings, listings come only from service-role (edge functions). RLS
   write policies on those tables: none for authed users.
6. **Staff access via `admin_emails` + `profiles` join** in RLS policies
   (never helper functions like `private_is_admin()` inside policies —
   SECURITY DEFINER RPCs may use them internally).
7. **Ledgers are append-only.** No UPDATE/DELETE policies exist on
   `wallet_ledger`, `ledger_events`, `xp_ledger` for anyone but service role
   (and even service role never updates, only inserts).

The full table × role access matrix is built and tested in PROMPT 11
(`#rls-matrix` section lands here).

## Crypto engine (do not touch without an architect decision)

- **Commit-reveal RNG**: server generates a 32-byte seed, stores only its
  SHA-256 hash on the opening row (status `committed`), accepts a client
  seed, then rolls `HMAC-SHA256(server_seed, client_seed:nonce)` and reveals
  the seed (status `revealed`). The verify page recomputes everything
  in-browser via WebCrypto.
- **Identity hashes** (SHA-256) are immutable after mint.
- **ED25519 signatures** and **Merkle roots** are computed server-side on
  schedule; clients only verify.

## Environments and secrets

- Web env vars via Vite `import.meta.env` (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`) — anon key only, never service role.
- MCU env vars via Next: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only).
- Edge functions get secrets via `supabase secrets set` (Stripe keys,
  webhook signing secret). Nothing secret is ever committed; `.env*` is
  gitignored repo-wide.

## Schema changes

Only via new timestamped files in `supabase/migrations/` (Supabase CLI).
The prototype-era SQL lives frozen in `supabase/migrations/legacy/` with its
apply-order manifest. Never edit an applied migration; never patch prod by
hand. Every new table ships RLS + policies in the same migration.

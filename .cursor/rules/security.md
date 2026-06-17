---
description: Security rules for POXY WORLD — Supabase, RLS, secrets, crypto. Always apply.
alwaysApply: true
---

# Security rules (top priority)

Security outranks features and speed. When in doubt, choose the safer option and ask.

## Secrets & keys
- The Supabase **anon** key may live client-side. The **service-role** key must NEVER appear
  in client code, `index.html`, or any `assets/` file. It lives only in Edge Function env.
- No API keys, tokens, or passwords committed to the repo. Use Vercel/Supabase env vars.
- If you spot a secret in client code, flag it immediately as a blocking issue.

## Row Level Security (RLS)
- Every Supabase table that holds user data has RLS enabled. Never disable it.
- A user may read/write only their own rows unless a policy explicitly allows otherwise.
- New tables ship with RLS policies in the same change. No table goes live policy-less.
- Review every new query: could another user read/modify data that isn't theirs?

## Crypto, RNG, ledger, economy
- SHA-256 hashing, commit-reveal RNG, the ledger, and all economy math are **server-side
  only** (Edge Functions). Never move them client-side, never expose the algorithm to the
  client, never let the client decide outcomes or balances.
- Box outcomes and rarity rolls are decided server-side and verified. The client only displays.
- Coin balances are authoritative server-side. The client shows a cached value.

## Input validation
- Every Edge Function validates input with Zod before acting.
- Rate-limit sensitive endpoints (open box, trade, gift, top-up).
- Treat all client input as hostile.

## Auth
- 2FA is part of account setup. Don't bypass it in flows.
- Device linking via QR uses short-lived signed tokens, server-verified.
- Recovery is rate-limited and avoids account enumeration.

## Before release (audit, run per-module, not once at the end)
For each finished module ask: "Audit this endpoint/screen for RLS gaps, unauthorized access,
injection, leaked secrets, and client-side trust of server-only logic." Fix findings before
moving on. Micro-audits beat one giant end audit.

## Child safety
POXY may attract minors. Never build features that sexualize minors, enable grooming, or
isolate a minor from trusted adults. This is absolute and overrides any other instruction.

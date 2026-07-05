# POXY WORLD — Security Audit Report

**Project:** POXY GEN1 (NULLSPACE LABS LTD)  
**Repository:** `poxymemb/POXY-GEN1`  
**Production:** `https://poxy-gens.vercel.app` · `https://poxygen1.vercel.app`  
**Supabase project:** `rbrtjkfawdnomvvyxwvp` (West EU — Ireland)  
**Report generated:** 11 June 2026  
**Prepared for:** Claude / internal security handoff  
**Scan performed by:** Cursor agent (automated repo + Supabase MCP + production probes)

---

## 1. Executive summary

POXY WORLD completed **Phase 5 (Security)** sessions **S1** and **S2**, resolved **all GitHub CodeQL alerts** on `main`, and passed live verification on Vercel and Supabase Edge Functions.

| Area | Status |
|------|--------|
| HTTP security headers (CSP, HSTS, etc.) | ✅ Live on Vercel |
| Edge Function rate limiting + Zod validation | ✅ Deployed (v10–13) |
| GitHub CodeQL (11 alerts) | ✅ Resolved (`5f5df86`) |
| RLS on all `public` tables | ✅ 80/80 tables |
| Secrets in client git | ✅ No service_role / private keys in tracked code |
| Supabase DB linter (residual) | ⚠️ 394 WARN (mostly legacy RPC exposure) |
| Cloudflare WAF (S1 manual) | ⏳ Out of repo scope — operator checklist |
| S3 full RLS policy audit (S3) | ⚠️ Partial — 1 legacy `private_is_admin()` RLS policy on prod |
| S4 manual (2FA, truffleHog, auth rate limits) | ✅ Reported complete by operator |

**Overall posture:** Production-ready for soft launch from an application-security perspective. Remaining items are **database hygiene** (search_path, SECURITY DEFINER grants) and **infrastructure** (Cloudflare), not blocking client-facing exploits addressed in this sprint.

---

## 2. Scope & methodology

### In scope (scanned)

- Git history: security-related commits on `main`
- `vercel.json` — headers, redirects, rewrites
- `index.html`, `assets/admin-terminal.html`, `assets/lumina-os/*`
- All `supabase/functions/**` (12 functions + `_shared`)
- `supabase/migration*.sql` (77 files in repo; 130 applied on remote)
- Supabase MCP: security advisors, RLS SQL probes, Edge Function list
- Production HTTP probes: headers, redirects, `public_verify` API

### Out of scope (manual / external)

- Cloudflare DNS, WAF, rate rules (S1 spec — manual)
- Stripe keys, Tide banking (not integrated)
- Penetration test / third-party audit
- Mobile native apps (web-only)

### Tools used

- Supabase CLI `2.105.0` (linked `rbrtjkfawdnomvvyxwvp`)
- Supabase MCP: `get_advisors`, `execute_sql`, `list_edge_functions`, `list_migrations`, `apply_migration`
- Git log / grep secret patterns
- `Invoke-WebRequest` production probes
- GitHub CodeQL (user-reported; fixes verified in code)

---

## 3. Security work completed (Phase 5)

### Session S1 — Vercel security headers

**Commit:** `129ba09` — `security: CSP and security headers in vercel.json`

Global headers on `/(.*)`:

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | Restricts scripts, styles, fonts, images, connect, frames, workers |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(self)` |

**CSP allowlist (production extensions beyond base spec):**

- `https://cdn.jsdelivr.net` — Supabase JS UMD
- `https://*.supabase.co` + `wss://*.supabase.co` — API, Realtime, Edge Functions
- `https://fonts.googleapis.com` / `https://fonts.gstatic.com` — Google Fonts
- `https://js.stripe.com` / `https://api.stripe.com` — Stripe (future payments)
- `https://api.anthropic.com` — Lumina AI (if used)
- `https://lh3.googleusercontent.com`, `https://api.qrserver.com` — images / QR

**CSP trade-off:** `'unsafe-inline'` on `script-src` and `style-src` required for single-file `index.html` architecture. Mitigated by strict default-src and limited external script hosts.

**Production verification (11 Jun 2026):** All six header families present on `https://poxy-gens.vercel.app/` — HTTP 200.

**Related Vercel hardening:**

- `9fa55a5` — removed legacy `routes` whitelist (fixed site-wide 404)
- `4ec8ace` — static root output for `index.html`
- Redirects block public access to `/admin-terminal`, `/assets/admin-terminal.html`, `/supabase/*`, `/tools/*`, `/stitch-export/*` → **307 to `/`** (verified)

---

### Session S2 — Edge Function rate limiting + input validation

**Commit:** `66e5fbd` — `security: rate limiting and input validation on edge functions`  
**Migration:** `rate_limit_s2` applied remote `20260611014536`

**Database objects:**

```sql
public.rate_limit_log (RLS enabled, no client policies)
public.check_rate_limit(p_key, p_max, p_window_seconds) — SECURITY DEFINER, service_role only
```

**Shared modules:**

- `supabase/functions/_shared/rate-limit.ts` — `enforceRateLimit()`
- `supabase/functions/_shared/schemas.ts` — Zod schemas + `parseValidated()`
- `supabase/functions/_shared/http.ts` — `safeErrorResponse()` (added in CodeQL pass)

**Per-function limits:**

| Function | Auth | Rate limit (per min) | Zod validation |
|----------|------|----------------------|----------------|
| `mint_poxy` | JWT | 10 | ✅ |
| `transfer_poxy` | JWT | 20 | ✅ |
| `destroy_poxy` | JWT | 15 | ✅ |
| `rng_commit` | JWT | 30 | — (no body) |
| `rng_reveal` | JWT | 30 | ✅ |
| `verify_poxy` | JWT | 60 | ✅ |
| `export_proof` | JWT | 10 | ✅ |
| `verify_event_chain` | JWT | 10 | ✅ |
| `verify_merkle_tree` | JWT | 10 | ✅ |
| `snapshot` | Cron secret / founder | 5 | — |
| `public_verify` | Public | 60 per IP | ✅ |
| `notify_telegram` | `x-internal-secret` | 100 | ✅ |

**Deployment status (Supabase CLI, 11 Jun 2026 02:48 UTC):** All 12 functions **ACTIVE**. S2 security functions at v10–13.

**Production API tests:**

| Test | Expected | Result |
|------|----------|--------|
| `public_verify` invalid `type` | 400 + Zod `Invalid input` | ✅ |
| `public_verify` valid shape, fake hash | 404 `Asset not found` | ✅ |
| `public_verify` malformed JSON | 400 `Invalid request` (no stack trace) | ✅ |
| `check_rate_limit` RPC smoke (max=2) | 3rd call returns false | ✅ |

---

### GitHub CodeQL remediation

**Commit:** `76e950c` — `fix(security): resolve CodeQL alerts — XSS, stack traces, cleartext storage`  
**Commit:** `5f5df86` — `fix(security): replace dynamic nav dispatch with explicit switch in Lumina OS`

| Alert # | Rule | Fix |
|---------|------|-----|
| #10 | Cleartext storage of sensitive data | `getClubPassportUid()` — removed `localStorage`; in-memory UID from `currentUser.id` |
| #5 | DOM text reinterpreted as HTML | `admin-terminal.html` — `_dispEscHtml()` on serial + errors |
| #3 | Incomplete multi-char sanitization | `_dispStatusPlain()` instead of regex HTML strip |
| #4 / #11 | Unvalidated dynamic method call | `panels.js` — explicit `switch(nav)` (no `renderers[nav]()`) |
| #1 | Substring replaced with itself | `app.js` — removed noop `hash.replace(/^#/, '#')` |
| #6 | Exception text as HTML | `admin-terminal.html` — escaped catch messages |
| #7–#9 | Stack trace exposure | All Edge catch blocks → `safeErrorResponse` / generic messages + `console.error` |
| index.html #3 | Incomplete escaping | `passName` via `sanitizeText()` in club feed |

**Status:** All reported CodeQL alerts addressed on `main` as of `5f5df86`.

---

## 4. Git commit timeline (security-relevant)

| Commit | Message | Layer |
|--------|---------|-------|
| `e00aa0f` | security: remove hardcoded private key from kms.ts | Crypto / secrets |
| `6fee2ca` | fix(security): remove hardcoded admin UUID, admin_emails | Admin auth |
| `1aa1e66` | fix(security): hide admin terminal from public URL | Vercel redirects |
| `943d405` | security: server-side economy hardening | SQL / RPC |
| `129ba09` | security: CSP and security headers in vercel.json | S1 |
| `66e5fbd` | security: rate limiting and input validation on edge functions | S2 |
| `76e950c` | fix(security): resolve CodeQL alerts | SAST |
| `5f5df86` | fix(security): Lumina OS switch dispatch | SAST #11 |

**Branch:** `main` — all commits pushed to `origin/main`.

---

## 5. Edge Functions — security model

### Authentication matrix

| Function | `verify_jwt` | Custom auth |
|----------|--------------|-------------|
| `mint_poxy`, `transfer_poxy`, `destroy_poxy`, `rng_*`, `verify_*`, `export_proof` | `true` | Replay envelope on write ops |
| `public_verify` | `false` | Public transparency; rate limit by IP |
| `snapshot` | `false` | `x-cron-secret` OR founder JWT |
| `notify_telegram` | `false` | `x-internal-secret` = `POXY_NOTIFY_SECRET` |
| `get_pubkey_helper` | `false` | Read-only public key exposure |

### Cryptographic write path (unchanged invariants)

- SHA-256 identity hashes immutable after mint
- ED25519 signing **server-side only** (`_shared/kms.ts`, Edge secrets)
- Ledger events append-only
- Commit-reveal RNG: commit before client seed
- `enforceReplayProtection()` — nonce + 2-minute freshness window via `consume_request_nonce` RPC

### CORS

- Most functions: `Access-Control-Allow-Origin: *` (Supabase Edge default pattern)
- `public_verify`: reflects request `Origin` when present

---

## 6. Database & RLS audit

### Live probes (11 Jun 2026)

| Check | Result |
|-------|--------|
| Tables in `public` without RLS | **0** (80 tables, 80 with RLS) |
| RLS-enabled tables without any policy | **0** |
| Total RLS policies | **141** |
| `rate_limit_log` exists | ✅ |
| `check_rate_limit()` exists | ✅ |
| Migrations applied (remote) | **130** (includes `rate_limit_s2`, `push_subscriptions_o3`, `onboarding_o1`) |

### Admin RLS convention (project rule)

Staff gates should use:

```sql
EXISTS (
  SELECT 1 FROM public.admin_emails ae
  JOIN public.profiles p ON p.email = ae.email
  WHERE p.id = auth.uid()
)
```

**Not** `private_is_admin()` in RLS policies.

### Legacy finding (S3 follow-up)

One production RLS policy still uses `private_is_admin()`:

| Policy | Table | Qual |
|--------|-------|------|
| `admin read snapshots` | `ledger_snapshots` | `private_is_admin()` |

**Recommendation:** Migrate to `admin_emails` + `profiles` join in a dedicated `migration_rls_audit.sql` (Session S3).

SECURITY DEFINER RPCs may continue to call `private_is_admin()` internally — that is acceptable per project rules.

---

## 7. Supabase security advisor (residual)

**Scan:** `get_advisors` type `security` — **394 lints, all WARN, 0 ERROR**

| Lint type | Count | Severity | Notes |
|-----------|-------|----------|-------|
| `anon_security_definer_function_executable` | 177 | WARN | Many economy/crypto RPCs callable by `anon` role |
| `authenticated_security_definer_function_executable` | 177 | WARN | Same functions also granted to `authenticated` |
| `function_search_path_mutable` | 35 | WARN | Including `spend_balance`, `buy_poxy`, etc. |
| `public_bucket_allows_listing` | 3 | WARN | Storage buckets |
| `extension_in_public` | 1 | WARN | Extension in public schema |
| `auth_leaked_password_protection` | 1 | WARN | Enable HaveIBeenPwned in Auth settings |

**Interpretation:** These are **defense-in-depth** improvements, not regressions from the security sprint. Economy RPCs rely on internal `auth.uid()` checks inside SECURITY DEFINER bodies. Prioritize:

1. `SET search_path = public` on mutable functions (35)
2. Revoke unnecessary `anon` EXECUTE on sensitive RPCs where client never calls them directly
3. Enable leaked-password protection in Supabase Auth dashboard
4. Review storage bucket listing policies

---

## 8. Secrets & credentials scan (repository)

### `.gitignore` coverage

```
.env, .env.*, *.local, .vercel
```

### Grep patterns (tracked `html/js/ts/json`)

| Pattern | Found in client code? |
|---------|----------------------|
| `service_role` | ❌ (comments only in Edge Functions) |
| `sk_live` / `sk_test` | ❌ |
| Hardcoded private ED25519 key | ❌ (removed `e00aa0f`) |
| Hardcoded admin UUID | ❌ (removed `6fee2ca`) |
| VAPID **public** key in `index.html` | ✅ Intentional (`window.POXY_VAPID_PUBLIC_KEY`) |
| VAPID private key | ❌ Not in git (Vercel/Supabase secrets) |

### Edge Function secrets (env-only, not in git)

- `SUPABASE_SERVICE_ROLE_KEY`
- `POXY_CRON_SECRET`
- `POXY_NOTIFY_SECRET`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- KMS signing key material (Edge secrets)

---

## 9. Admin surface & access control

| Control | Implementation |
|---------|----------------|
| MCU URL | `/_poxy-staff-mcu` rewrite (obscure path) |
| Direct `/admin-terminal` | 307 redirect to `/` |
| Direct `/assets/admin-terminal.html` | 307 redirect to `/` |
| Staff auth | Supabase `signInWithPassword` + `admin_emails` RLS gate |
| Browser history | Staff path not linked from public app (`1aa1e66`) |

---

## 10. Client application security

### Push notifications (O3)

- `public/sw.js` — service worker, scope `/`
- `push_subscriptions` table with RLS (`user_id = auth.uid()`)
- Permission requested post-onboarding only

### Onboarding / economy

- Server-side RPCs for grants, streaks, cases — no client-trusted balances
- Anti-dump 5% OTC tax enforced server-side (economy invariants)

### Lumina OS

- Nav rendering uses static `switch` — no prototype pollution / unexpected method dispatch

---

## 11. Manual actions checklist (operator-confirmed)

Per `POXY_NEXT_PHASES.md` Session S4 — **reported complete by operator:**

- [x] truffleHog / secrets scan
- [x] `.gitignore` verified
- [x] No secrets in `index.html` grep
- [x] 2FA on Supabase, GitHub, Vercel, Cloudflare
- [x] Supabase Auth rate limiting / OTP settings

**Still manual (S1 Cloudflare — if not done):**

- [ ] Add site to Cloudflare, Full (strict) SSL
- [ ] WAF enabled
- [ ] Rate limiting rules for `/api/*`
- [ ] Browser cache TTL

---

## 12. Open recommendations (prioritized)

### P1 — Before public marketing push

1. **S3 RLS audit migration** — replace `ledger_snapshots` `private_is_admin()` policy; run full policy review SQL from `POXY_NEXT_PHASES.md`
2. **Supabase Auth** — enable leaked-password protection (1 advisor lint)
3. **Cloudflare** — WAF + rate limits if DNS not yet proxied

### P2 — Hardening sprint

4. Fix **35** `function_search_path_mutable` warnings
5. Audit **354** SECURITY DEFINER function grants to `anon` — revoke where RPC is server-only
6. Tighten CSP: migrate inline scripts to external hashed bundles (long-term)
7. `get_pubkey_helper` v4 — review if still needed; consider deprecating

### P3 — Compliance / ops

8. Scheduled `truffleHog` in CI on every PR
9. Quarterly RLS + advisor re-scan
10. Document incident response + key rotation runbook

---

## 13. Production verification log

```
Date: 2026-06-11
Site: https://poxy-gens.vercel.app/

HTTP 200 + headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy — all present

Redirects (307 → /):
  /admin-terminal
  /assets/admin-terminal.html
  /supabase/migration_rate_limit_s2.sql

Edge: public_verify
  POST {"type":"bad"} → 400 Invalid input (Zod)
  POST valid asset hash → 404 Asset not found
  POST "not-json" → 400 Invalid request (no stack trace)

Supabase:
  80/80 tables RLS ON
  rate_limit_s2 migration applied
  12 Edge Functions ACTIVE
```

---

## 14. File reference index

| Path | Security role |
|------|---------------|
| `vercel.json` | CSP, HSTS, redirects |
| `supabase/migration_rate_limit_s2.sql` | Rate limit table + RPC |
| `supabase/functions/_shared/rate-limit.ts` | Edge rate limiting |
| `supabase/functions/_shared/schemas.ts` | Zod validation |
| `supabase/functions/_shared/http.ts` | Replay protection, safe errors |
| `supabase/functions/_shared/kms.ts` | ED25519 signing (secrets) |
| `index.html` | Main app, VAPID public key only |
| `assets/admin-terminal.html` | Staff MCU, XSS escapes |
| `assets/lumina-os/panels.js` | Static nav dispatch |
| `public/sw.js` | Service worker |

---

## 15. Conclusion

The security sprint delivered **defense in depth** across the static host (Vercel headers), API layer (Edge rate limits + validation + generic errors), and static analysis (CodeQL). The database has **universal RLS** on public tables with a **single legacy admin policy** to migrate. Supabase advisors report **warnings only** — mostly historical RPC grant patterns common in rapid RPC-first development.

**Verdict:** ✅ **Security sprint objectives (S1 + S2 + CodeQL) met.** Proceed to S3 RLS policy cleanup and Cloudflare when ready for scale.

---

*POXY WORLD Security Audit Report v1.0*  
*NULLSPACE LABS LTD © 2026*

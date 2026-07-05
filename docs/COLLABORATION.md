# POXY-GEN1 — parallel development (Nikita + Slava / FTKSV)

> **Production:** Vercel deploys **`main` only**. Feature branches do not replace production unless merged into `main`.

## Current remote branches (last check)

| Branch | Purpose | Notes |
|--------|---------|--------|
| `main` | Production | Latest Sky rebrand + club removal (`8069ca1`+) |
| `gaming-navigation-bar` | Feature / UI experiments | **~37 commits behind `main`** — rebase or merge `main` before opening a PR |
| `v0/poxy-world-collectible-app-*` | v0.app experiment | Separate HTML prototype — do not merge blindly |

GitHub user **[FTKSV](https://github.com/FTKSV)** exists; no commits under that login in repo history yet (pushes may use another email or branch not pushed).

## Safe parallel workflow

1. **Never push directly to `main`** (both developers). Use a personal branch → Pull Request → review → merge.
2. **Branch naming:** `contrib/ftksv/<topic>` or `slava/<topic>` (e.g. `contrib/ftksv/gaming-nav`).
3. **Before starting work:** `git fetch origin` → `git checkout main` → `git pull` → branch from latest `main`.
4. **While working:** pull/rebase `main` often if the other person merged (especially `index.html`).
5. **Before PR:** run structural gates locally:
   ```bash
   node scripts/smoke-gate.js
   node scripts/verify-dashboard-parity.js
   ```
6. **One screen / one PR** when possible — matches POXY Strangler Fig discipline (`POXY_CONTEXT.md`).

## What will not break production (if rules followed)

- Slava works on his branch while Nikita works on `main` or another branch.
- Vercel preview URLs for PRs (if enabled) are isolated from live users.
- Supabase backend is shared — **do not** change RLS, RPC names, or economy in a visual-only task without architect review.

## Real risks (fix these on GitHub)

| Risk | Status | Action |
|------|--------|--------|
| **`main` not branch-protected** | ⚠️ Open | Repo settings → Branches → Add rule for `main`: require PR, no force-push |
| **`index.html` merge conflicts** | Expected | Coordinate who touches which screen; rebase early |
| **Stale feature branch** | ⚠️ `gaming-navigation-bar` | Slava: merge `origin/main` into branch before more work |
| **Supabase migrations** | Review required | New `.sql` in `supabase/` — Nikita applies in dashboard; never commit secrets |
| **Experimental v0 branch** | Low | Keep separate; not for production merge without full audit |

## Enable branch protection (Nikita — 2 min in GitHub UI)

1. https://github.com/poxymemb/POXY-GEN1/settings/branches  
2. **Add branch ruleset** (or classic rule) for `main`  
3. Enable: **Require a pull request before merging**  
4. Enable: **Do not allow bypassing the above settings** (for admins too, if you want strict mode)  
5. Optional: **Require status checks** when CI is added later  
6. Disable: **Allow force pushes** on `main`

Slava keeps **Write** access; he can push branches and open PRs, but not merge to `main` without review (if step 3 is on).

## Slava — first-time setup

```bash
git clone https://github.com/poxymemb/POXY-GEN1.git
cd POXY-GEN1
git checkout main
git pull origin main
git checkout -b contrib/ftksv/my-first-task
# ... work ...
git push -u origin contrib/ftksv/my-first-task
# Open PR on GitHub → base: main
```

Read **`POXY_CONTEXT.md`** before any code change. Visual-only tasks must not alter Supabase hooks, crypto, or economy (`§4`, `§8`).

## Local dev server

```bash
python -m http.server 3456 --bind 127.0.0.1
# http://127.0.0.1:3456/
```

## Who merges to `main`

**Nikita (architect)** approves and merges PRs until explicitly delegated. Slava marks PR ready; Reviewer pass + smoke gate before merge.

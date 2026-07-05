---
description: Post-Stage-11 cleanup — safely remove legacy and restructure the repo Telegram-style. Apply only when Stages 5-11 are complete.
---

# Cleanup phase (run ONLY after Stages 5–11 are done)

Goal: remove the dead legacy design cleanly, without breaking the working backend, and
restructure the repo so the project scales like Telegram's — split by concern, not one blob.

**Do not start this until every screen is reskinned and `PoxyLegacyStyles.mount()` is empty.**

## Step 0 — safety
- Create a branch: `chore/legacy-cleanup`.
- Confirm the app fully works on Sky for all 13 screens, both themes, login → logout.
- Commit current state. This is your restore point.

## Step 1 — prove legacy is unused (Strangler Fig final cut)
- Confirm `PoxyLegacyStyles.mount()` loads an empty (or near-empty) list.
- Search the codebase for every legacy CSS/JS file: are there any remaining references?
  - "Find all imports/links/usages of `<legacy-file>` across @Codebase."
- A file is safe to delete only when nothing references it. List candidates first; delete
  after confirmation. Never blind-delete.

## Step 2 — delete dead code
- Remove unreferenced legacy page CSS and `legacy-app-inline.css`.
- Remove dead JS, obsolete scripts, unused ids, commented-out blocks.
- Remove the lazy-mount machinery once it has nothing to mount.
- One reviewed commit: `chore: remove legacy design system`.

## Step 3 — restructure (incremental, verify after each move)
Target layout in `POXY_CONTEXT.md` §7. Move in small, verified steps:
- Group screen CSS under `assets/poxy-sky/screens/`.
- Split JS into `core/` (boot, supabase, router), `features/`, `ui/`.
- Keep `index.html`'s load-bearing script order intact; update paths as you move files.
- After each move: smoke test (boot, login, a screen in both themes). Commit per safe move.

## Step 4 — local machine cleanup
- Remove local build artifacts, stale caches, `node_modules` cruft if any, dead branches.
- Keep only what the repo and deploy need.

## Step 5 — final audit
- Full security pass (`security.md`): RLS, secrets, server-side crypto, input validation.
- Full smoke + structural checks (`testing.md`) across all screens.
- Performance pass: asset weight, unused deps, Core Web Vitals.
- Reviewer sign-off, then merge `chore/legacy-cleanup`.

## Golden rule
Delete by subtraction, not demolition. If something "looks unused," prove it, commit first,
then remove — so a wrong guess is a 5-minute `git revert`, not a broken product.

---
description: Testing, QA, and quality gates for POXY WORLD. Apply during implementation and review.
---

# Testing & quality

We can't rely on a framework's test harness (vanilla SPA), so quality gates are explicit
and partly manual. Bugs before launch are cheap to prevent, expensive to ship.

## Per-change smoke test (mandatory, every unit)
After any change, verify by hand or script:
1. App boots with no console errors (watch for duplicate `function`/`const` SyntaxErrors).
2. Login works; logged-in shell appears.
3. The touched screen renders in **light and dark**.
4. Rail navigation reaches every screen; no duplicate ids; back-buttons work.
5. Coin balance, XP, and topbar render.

## Structural self-checks (cheap, run often)
Scriptable sanity checks that caught real bugs before:
- `<div>`/`</div>` (and `<aside>`) balance matches.
- Exactly one `<script>`…`</script>` block (or known count).
- No duplicate `id="sc-*"`; rail `data-nav` count == screen count.
- No em-dash (—) in user-facing copy.
- No nested `-->` inside an HTML comment (breaks the page).

Keep a small `scripts/check.js` (or shell) that runs these and prints pass/fail.

## Edge Function tests
- New Edge Functions get at least: a happy-path test, an auth-failure test, and an
  invalid-input test (Zod rejection).
- Test that RLS blocks cross-user access.

## Regression discipline
- Before reskinning a screen, note what works. After, confirm it still works.
- Never let a visual change silently break a Supabase call. If a hook id changes, the
  wiring changes with it in the same commit — or you don't change the id.

## Performance
- Watch bundle/asset weight. Periodically: "find heavy or unused assets and propose
  tree-shaking or lighter alternatives."
- Animations must stay smooth with real data (loading/error states), not just in isolation.
- Target good Core Web Vitals; light FCP via critical inline CSS already in place.

## Quality gate before commit
A change is commit-ready only when: smoke test passes, structural checks pass, Reviewer
approved, and (if backend) Edge Function tests pass.

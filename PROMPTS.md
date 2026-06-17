# POXY WORLD — Prompt Templates

Copy-paste these into Cursor Composer (Cmd/Ctrl+I). Always include `@Codebase`.
Replace [SCREEN] / [NAME] with the target.

---

## 0. First action — commit Stages 2–4 (do this before anything else)

```
@Codebase Stages 2, 3, 4 and the clean-slate work are uncommitted. Before any new work,
stage and commit them in logical chunks so we have a restore point. Suggested commits:
- "feat(rebrand): Stage 2 Sky auth"
- "feat(rebrand): Stage 3 Sky app shell"
- "feat(rebrand): Stage 4 Sky home + open"
- "chore(rebrand): clean slate — lazy-mount legacy CSS after login"
Show me the git status and the proposed commits first. Do not push without my OK.
```

---

## 1. Stage reskin (5–11) — Builder pass

```
@Codebase POXY WORLD Sky v2 rebrand — Stage [N]: reskin [SCREEN].

Read POXY_CONTEXT.md and design/v2/poxy-dashboard.html section #sc-[SCREEN] first
(HTML + CSS). Then plan before coding.

Implement the screen 1:1, scoped under its production id ([prod hook from §6]).
- New CSS in assets/poxy-sky/screens/[screen].css. No inline styles in index.html.
- Use tokens from tokens.css. Support light + dark. Default light.
- Preserve ALL ids and Supabase hooks (POXY_CONTEXT.md §4). Do not touch backend logic.
- Hide the legacy panel via body.poxy-sky-app-active. Do NOT delete legacy yet.
- No em-dashes in copy. Coin SVG for currency, never "PX". "Sell for coins", never "burn".

First give me: the plan (files, hooks preserved, risks). Wait for my OK, then implement.
Do not commit until reviewed.
```

---

## 2. Reviewer pass (run after every Builder pass)

```
@Codebase Act as Reviewer/QA per .cursor/rules/reviewer.md. You did NOT write this code.
Audit the change for Stage [N] / [SCREEN]:
- No production hook changed; app boots; login works; both themes render.
- No console errors or duplicate function/const/id declarations.
- Security: no secrets client-side, no server-only crypto moved client-side, RLS intact.
- Scope: only planned files changed; CSS scoped; no style leaks; legacy hidden not deleted.
- Copy: no em-dashes, plain wording, matches mockup 1:1.
Write findings to .ai/rebrand/stage[N]/review1.md and end with APPROVED or CHANGES REQUIRED
(numbered, with file + problem + fix).
```

---

## 3. Security micro-audit (after a backend-touching module)

```
@Codebase Security audit per .cursor/rules/security.md for [module/endpoint].
Check: RLS gaps, unauthorized cross-user access, leaked secrets, client-side trust of
server-only logic, missing Zod validation, missing rate limits. List findings by severity
with the fix for each. Do not change code yet — report first.
```

---

## 4. Structural sanity check (cheap, run often)

```
@Codebase Run the structural checks from .cursor/rules/testing.md against index.html:
div/aside balance, single script block, no duplicate id="sc-*", rail data-nav count == screen
count, no em-dashes in user copy, no nested --> in comments. Report pass/fail per check.
If scripts/check.js doesn't exist, create it to automate these.
```

---

## 5. Cleanup (only after Stage 11)

```
@Codebase We've finished Stages 5–11; PoxyLegacyStyles.mount() should be empty. Run the
cleanup phase per .cursor/rules/cleanup.md:
1) Branch chore/legacy-cleanup, confirm all 13 screens work on Sky, commit restore point.
2) Find every reference to legacy CSS/JS files. List files with zero references as deletion
   candidates. Show me the list — do not delete yet.
After I confirm, delete the unreferenced legacy and propose the restructure moves one at a time.
```

---

## 6. Generic task (Builder + Reviewer in one flow)

```
@Codebase Task: [describe the scoped change].
Follow .cursor/rules/workflow.md: plan first (files, hooks preserved, risks), wait for my OK,
implement one unit, run the smoke + structural checks, then self-review against reviewer.md
and report APPROVED or the blocking issues. Preserve all production hooks. Do not commit
until reviewed and working.
```

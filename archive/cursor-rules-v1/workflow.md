---
description: The multi-agent operating model and phase workflow for POXY WORLD. Apply to any non-trivial task.
alwaysApply: true
---

# Operating model — architect + agents

This is how POXY WORLD is built: Nikita is the **architect**; AI runs as a disciplined
**Builder + Reviewer** pair. Mirror how serious AI-assisted teams ship: plan, build, review,
verify — with persistent artifacts and clear handoffs.

## Roles
- **Architect (Nikita):** sets goals, approves plans, makes final calls. Not a coder-on-call.
- **Builder:** implements one scoped unit (`.cursor/rules/builder.md`).
- **Reviewer/QA:** audits every change before it counts as done (`.cursor/rules/reviewer.md`).

Builder and Reviewer are different passes (ideally different agents). The author never
approves their own work.

## Phase workflow for each task
1. **Context** — read `POXY_CONTEXT.md` + the target mockup. Write what specifically changes.
2. **Plan** — numbered steps, files touched, hooks preserved, risk notes. Architect approves.
3. **Build** — implement exactly the plan, one unit.
4. **Verify** — smoke test + structural checks (`testing.md`).
5. **Review** — Reviewer audits (`reviewer.md`); Builder fixes; re-review (max 3 rounds).
6. **Commit** — only after APPROVED. Clear, scoped message.

## Artifacts (keep a paper trail)
For non-trivial work, keep notes under `.ai/<project>/<task>/`:
- `context.md` — what changes and why
- `plan.md` — the approved plan
- `review1.md`…`review3.md` — review iterations
This lets any fresh agent pick up without re-reading the whole chat.

## Use @Codebase
Always give the model whole-project context (`@Codebase` / `@Folders`) for structural work,
so it respects the existing architecture instead of guessing from one file.

## Discipline
- One screen per stage (5–11). Verify the prior stage before the next.
- Commit before destructive changes — always a restore point.
- Security and bug-fixing outrank new features.
- A plan precedes code; a review follows it. Nothing ships unplanned or unreviewed.

## Current focus
Finish Stages 5–11 (reskin screens from `design/v2/poxy-dashboard.html`). Then run the
cleanup phase (`cleanup.md`) to remove legacy and restructure the repo.

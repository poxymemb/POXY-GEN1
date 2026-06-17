# POXY WORLD — AI Development Setup

This folder configures POXY WORLD for disciplined AI-assisted development: an
**architect + agents** model (Builder + Reviewer), security and bug-fixing first, and a
safe **Strangler Fig** path to finish the Sky v2 rebrand and then clean up legacy.

## What goes where

Drop these into the **root** of your POXY WORLD repo:

```
POXY_CONTEXT.md          ← master brief. Agents read this first, every session.
.cursorrules             ← global Cursor rules (always loaded).
PROMPTS.md               ← copy-paste prompt templates for each stage.
.cursor/rules/
  architecture.md        ← stack reality + no-framework ruling (alwaysApply)
  workflow.md            ← architect + Builder + Reviewer model (alwaysApply)
  security.md            ← Supabase/RLS/secrets/crypto rules (alwaysApply)
  builder.md             ← how the Builder implements a unit
  reviewer.md            ← how the Reviewer audits a change
  testing.md             ← smoke + structural + Edge Function checks
  cleanup.md             ← post-Stage-11 legacy removal + restructure
```

Keep your mockups in `design/v2/` (they're the UI source of truth) and your
existing `DESIGN.md`.

## How the model works

```
        ┌─────────────┐
        │  ARCHITECT  │  Nikita — sets goals, approves plans, final call
        └──────┬──────┘
               │ goal
        ┌──────▼──────┐     plan      ┌──────────────┐
        │   BUILDER   │ ────────────► │  ARCHITECT   │ approves plan
        │  (Исполн.)  │ ◄──────────── │              │
        └──────┬──────┘    implement  └──────────────┘
               │ change
        ┌──────▼──────┐
        │  REVIEWER   │  audits: behavior preserved, security, scope, copy
        │ (Контролёр) │  → APPROVED  or  CHANGES REQUIRED (max 3 rounds)
        └──────┬──────┘
               │ approved
        ┌──────▼──────┐
        │   COMMIT    │  only after review passes
        └─────────────┘
```

The author never approves their own work. Plan precedes code; review follows it.

## The order of operations

1. **Commit Stages 2–4** (they're uncommitted — do this first; PROMPTS.md §0).
2. **Stages 5–11:** one screen per stage, Builder → Reviewer → commit (PROMPTS.md §1–2).
3. **Cleanup:** only when every screen is on Sky and the legacy mount list is empty
   (PROMPTS.md §5, cleanup.md).

## Non-negotiables (full list in POXY_CONTEXT.md §8)

- Never change backend logic / Supabase hooks / crypto / economy during a visual task.
- Never blind-delete legacy. Strangle, then delete. Commit before destructive changes.
- Security and child safety outrank speed and features.
- Default theme light (`poxy-sky-theme`). Coin, not "PX". "Sell for coins", not "burn".
- No em-dashes; plain human copy.
- We are NOT migrating to React now. Vanilla SPA stays.

## Why vanilla, not React (the deliberate call)

The SPA already has a working economy, crypto engine, and Supabase integration. A framework
rewrite would discard all of that for months of risk. Telegram's web client itself ran on
vanilla JS for years. We finish the visual rebrand on the working foundation; a React
migration, if ever, is a separate explicitly-scoped project — not something an agent starts
on its own.

---
description: POXY WORLD architecture, stack, and the no-framework ruling. Always apply.
alwaysApply: true
---

# Architecture rules

## Stack is vanilla, on purpose
POXY WORLD is `index.html` (~16k lines) + `assets/` + Supabase + Vercel. No React/Next/Vue.
This is not technical debt to "fix" by rewriting — the SPA has a working economy, crypto
engine, and Supabase integration. A framework rewrite is explicitly **out of scope** unless
the architect (Nikita) starts it as a separate project.

If you ever think "this should be React": stop, note it for later, and solve the task in
vanilla. Do not scaffold a framework.

## File organization
- New design system lives in `assets/poxy-sky/`. One CSS file per screen.
- Shared JS belongs in feature-scoped files (`assets/poxy-*-sky.js`), not stuffed into `index.html`.
- `index.html` is a shell. Its inline `<script>` order is load-bearing — never reorder boot logic.
- Build/patch helpers go in `scripts/`. Supabase artifacts in `supabase/`.

## Scoping
Every new screen's CSS must be scoped under its own id (`#pxSkyHome`, `#sc-collection`'s
production equivalent, etc.) so it cannot leak into legacy panels and vice-versa. Exclude
`@keyframes` from scoping regex (a past bug).

## Theme & tokens
All colors come from `assets/poxy-sky/tokens.css` CSS variables. Never hardcode hex outside
tokens. Light is default; key is `poxy-sky-theme`. Support both themes in every screen.

## Target structure (reach incrementally post-Stage-11)
See `POXY_CONTEXT.md` §7. Move files only as they stop being referenced. Keep the repo
clean and split by concern, Telegram-style — but never at the cost of breaking a working boot.

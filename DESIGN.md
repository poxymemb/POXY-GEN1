# POXY WORLD — Design contract for Google Stitch

Use this file as the **single source of truth** when generating or editing UI in Stitch.  
Goal: visual refresh only — **never** change app logic, Supabase, or auth.

## Stack (do not change in Stitch output)

- **One file app:** `index.html` — vanilla HTML + CSS + inline JS
- **Backend:** Supabase (`createClient`, `sb.from(...)`, Realtime, Storage `avatars`)
- **No React/Vue/Tailwind build** — port Stitch ideas into existing CSS classes and DOM ids

## Brand

| Token | Value |
|-------|--------|
| Primary gradient | `#ff416c` → `#ff4b2b` |
| Logo / accents | Same gradient, 45deg |
| Font | Inter (300–900), system-ui fallback |
| Light page bg | `#ffffff` |
| Dark club / sidebar | `#0a0a0c`, panels `#13131a`, borders `#1a1a24` |
| Sidebar overlay | `rgba(10,10,10,0.98)` + `backdrop-filter: blur(25px)` |

## Rarity colors (game economy — locked)

| Tier | Color | Glow hint |
|------|--------|-----------|
| Common | `#9E9E9E` | — |
| Uncommon | `#4CAF50` | green tint |
| Rare | `#29B6F6` | blue gradient body |
| Epic | `#AB47BC` | purple |
| Legendary | `#FFCA28` | gold shimmer |
| Mythic | `#FF5252` | red prism animation |

Do not rename tiers or change case odds in UI copy without explicit product approval.

## Layout rules already in production

- **Collection regular cards:** square `aspect-ratio: 1/1`, class `.col-card` in `#colGrid`
- **Poxy Club cards:** tall `aspect-ratio: 3/4`, grid `.col-club-grid` only
- **Avatars:** always inside `.avatar-frame-target` with `data-frame`; do not replace with plain `<img>` without frame hooks
- **Auth:** `#authOverlay`, `#authEmail`, `#authPassword`, `#authBtn` — keep ids; button `type="button"`
- **Boot order:** `bootApp()` at end of script — never call `$()` or page helpers before definitions

## Safe integration workflow

1. Generate screen in Stitch (reference this file in the prompt).
2. Export HTML/CSS **preview only** — do not paste whole `<script>` from Stitch.
3. Agent applies **scoped CSS** (new block at end of `<style>`) or **one section** HTML swap.
4. Smoke test: Sign In, open profile, upload avatar, open collection, one case open, marketplace tab.

## Stitch prompt template

```
Design for POXY WORLD (lootbox / trading card web app).
Read DESIGN.md: Inter font, gradient #ff416c→#ff4b2b, dark obsidian sidebar.
Mobile-first, max-width content ~760px in sidebar.
Do not include Supabase, fetch, or auth scripts.
Output: HTML + CSS fragment only, class names prefixed poxy- if new.
Screen: [AUTH CARD | COLLECTION GRID | SIDEBAR TAB | ...]
```

## Pilot screens (apply one at a time)

1. Auth overlay card (`#authOverlay`) — **done**  
2. Sidebar header + tabs (`#sidebarPanel`) — done  
3. **Stitch full Dashboard** (`#poxyStitchDashboard` / `#huntPage`) — **done** (Spin & Win, collection preview, treasury)  
4. Collection page card chrome — high (test club menu + kebab) — **next**  
4. Case opening UI — highest (animations + economy)

# POXY WORLD — Sky Design System (v2)

Single source of truth for UI work. **Visual refresh only** — never change app logic, Supabase, or auth.

## Stack (unchanged)

- **App:** `index.html` — vanilla HTML + CSS + inline JS
- **Design refs:** `design/v2/*.html` (Claude mockups)
- **Production CSS:** `assets/poxy-sky/tokens.css`, `assets/poxy-sky/components.css`
- **Backend:** Supabase — do not add React/Vue/Tailwind build

## Brand — Sky System

| Token | Value |
|-------|--------|
| Accent | `#60C2E0` (Sky-500) |
| Light bg | `#F0F0F1` |
| Dark bg | `#1C1C1E` |
| Logo | Card mark — `assets/poxy-sky/logo-card.png` |
| Font | SF Pro / Inter / system-ui (`--px-font`) |
| Data / hashes | SF Mono (`--px-mono`) |
| **Default theme** | **light** (`html[data-theme="light"]`) |
| Theme storage | `localStorage` key `poxy-sky-theme` |

### Sky scale (locked H=194°)

`--sky-50` … `--sky-900` — see `assets/poxy-sky/tokens.css`

### Buttons

- Dark theme: `--sky-500` fill, **white text**
- Light theme: `--sky-800` fill, **white text**
- Ghost: glass + border

### Rarity (game economy — v2 palette)

| Tier | Color |
|------|--------|
| Common | `#8A8F98` |
| Rare | `#60C2E0` |
| Epic | `#456DB0` |
| Legendary | `#E0A23C` |
| Mythic | `#D9744F` |

Do not rename tiers or change case odds without explicit product approval.

## Layout (v2 target)

- **Public:** sticky glass nav, hero with floating case + Card logo
- **Auth:** centered glass card, glow backdrop
- **App:** left icon rail 74px + topbar (balance, icons) — **replaces bottom nav**
- **Open ritual:** box tap → full-screen generation top→bottom (see `poxy-dashboard.html`)
- Mobile-first 375px; safe areas via `env(safe-area-inset-*)`

## DOM hooks (never rename)

| Screen | Container | Critical ids |
|--------|-----------|--------------|
| Landing | `#poxyLanding` | CTA opens auth |
| Auth | `#authOverlay` | `#authEmail`, `#authPassword`, `#authBtn` |
| App | `#poxyStitchDashboard` | `showPage()` targets |
| Boot | — | `bootApp()` last; no early `$()` |

## Integration workflow

1. Read mockup in `design/v2/` for the target screen.
2. Diff mockup HTML/CSS vs current `index.html` section.
3. Apply **scoped** changes: new `px-*` classes + swap inner HTML of one container.
4. Preserve all ids, `data-i18n`, and event handlers.
5. Run smoke test (see `design/v2/REBRAND.md`).

## CSS rules

- New work: `px-` prefix + `--px-*` / `--sky-*` tokens
- Legacy `poxy-theme.css`, `stitch-*.css` — deprecate per screen, do not delete wholesale until migrated
- Logo mask: `--px-cardmask: url("logo-card.png")` relative to CSS file

## Prompt template (for new screens)

```
Design for POXY WORLD v2 (Sky system).
Read DESIGN.md + design/v2/poxy-brand-guide.html.
Accent #60C2E0, light default, glass cards, Card logo mask.
Mobile-first. No Supabase/scripts.
Output: HTML + CSS fragment only, classes prefixed px-.
Screen: [name]
```

## Rebrand progress

See `design/v2/REBRAND.md` for staged rollout and test gates.

**Stage 0:** Foundation ✅  
**Stage 1:** Landing ✅  
**Stage 2:** Auth — next  
**Stage 3:** App shell (left rail)  
**Stage 4+:** Individual screens  

## Out of scope

- `assets/admin-terminal.html` — unchanged during consumer rebrand

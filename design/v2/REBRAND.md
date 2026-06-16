# POXY WORLD — Sky Rebrand (v2)

Official mockups live in this folder. Production CSS: `assets/poxy-sky/`.  
**Default theme: light.** Theme key: `localStorage` → `poxy-sky-theme` (`light` | `dark`).

## Reference files

| File | Purpose |
|------|---------|
| `poxy-brand-guide.html` | Tokens, logo, typography, buttons, rarity |
| `poxy-landing.html` | Public landing, FAQ, news |
| `poxy-auth.html` | Login / register / verify |
| `poxy-dashboard.html` | App shell — left rail, screens, open ritual |
| `poxy-architecture-map.html` | Screen inventory, routes, user flow |

Open any file in a browser to preview. Do **not** copy mockup `<script>` into `index.html`.

## Production mapping

| Mockup | Production hook | Keep these ids |
|--------|-----------------|----------------|
| `poxy-landing.html` | `#poxyLanding` | CTA → open auth |
| `poxy-auth.html` | `#authOverlay` | `#authEmail`, `#authPassword`, `#authBtn` |
| `poxy-dashboard.html` | `#poxyStitchDashboard` + app shell | `showPage()` |

## Never touch

- Supabase client, RPC names, RLS-facing tables
- `bootApp()`, `handleAuth`, `setupAuthStateListener`
- Economy / case weights / crypto / ledger
- Storage paths: `avatars/{user_id}`, `assets/{asset_id}`
- Element ids used by JS (`getElementById`, `$('...')`)

## Rebrand stages

### Stage 0 — Foundation ✅

- [x] Mockups in `design/v2/`
- [x] `assets/poxy-sky/tokens.css`, `components.css`, `logo-card.png`
- [x] `DESIGN.md`, Cursor rules updated

**Gate:** Open `design/v2/poxy-brand-guide.html` — Sky scale + Card logo visible.

### Stage 1 — Landing ✅

- [x] Reskin `#poxyLanding` from `poxy-landing.html`
- [x] Wire theme toggle → `poxy-sky-theme` (default light)
- [x] Tabs: Main / FAQ / News / Policy / About + FAQ accordion

**Gate:** Hero + CTA → auth, FAQ accordion, theme toggle, mobile 375px (manual check on device).

### Stage 2 — Auth

- Reskin `#authOverlay` from `poxy-auth.html`
- Keep all Supabase auth handlers

**Gate:** Sign in, sign up, Google OAuth, error states, verify flow.

### Stage 3 — App shell

- Left icon rail (74px) replaces bottom nav
- Topbar: greet + coin balance
- `showPage()` ↔ rail mapping

**Gate:** All primary tabs switch; session persists; mobile rail usable.

### Stage 4+ — Screens (one at a time)

Order: Home → Collection → Open ritual → Market → Settings → Profile → …

**Gate per screen:** Visual match mockup + smoke test below.

## Smoke test (run after every stage)

1. Sign in → session persists on reload  
2. Profile → avatar upload works  
3. Collection → regular + club cards render  
4. Open one case (economy intact)  
5. Market tab loads  
6. Mobile 375px — no broken layout / nav  

## CSS conventions

- New classes: `px-` prefix (Sky system)
- Legacy `poxy-*` / `st-*` — remove only after screen is migrated
- Use tokens from `assets/poxy-sky/tokens.css` — no hardcoded pink/mint legacy colors
- Logo: `--px-cardmask` or class `.px-mark`

## Admin panel

Out of scope for this rebrand (`admin-terminal.html` unchanged).

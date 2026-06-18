# POXY WORLD — Sky Rebrand (v2)

Official mockups live in this folder. Production CSS: `assets/poxy-sky/`.  
**Default theme: light.** Theme key: `localStorage` → `poxy-sky-theme` (`light` | `dark`).

> **Status (2026-06-17):** Stages **0–11 committed**. Phase A functional pass: all MVP screens at **Near** parity (Sky layer + legacy suppressed). Final 1:1 audit + smoke gate still open. See `POXY_CONTEXT.md` parity table.

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
| `poxy-dashboard.html` | `#poxyAppShell` + `#pxSkyStage` | `showPage()`, `showStitchTab()` |

## Never touch

- Supabase client, RPC names, RLS-facing tables
- `bootApp()`, `handleAuth`, `setupAuthStateListener`
- Economy / case weights / crypto / ledger
- Storage paths: `avatars/{user_id}`, `assets/{asset_id}`
- Element ids used by JS (`getElementById`, `$('...')`)

## Rebrand stages

### Stage 0 — Foundation ✅ `998b9ef`

- [x] Mockups in `design/v2/`
- [x] `assets/poxy-sky/tokens.css`, `components.css`, `logo-card.png`
- [x] `DESIGN.md`, Cursor rules updated

**Gate:** Open `design/v2/poxy-brand-guide.html` — Sky scale + Card logo visible.  
**Parity:** **Near** — production tokens match guide; audit components as needed.

---

### Stage 1 — Landing ✅ `9f8edca` · fix `18ebd72` · 1:1 pass `5417166`

- [x] Reskin `#poxyLanding` from `poxy-landing.html`
- [x] Wire theme toggle → `poxy-sky-theme` (default light)
- [x] Tabs: Main / FAQ / News / Policy / About + FAQ accordion

**Gate:** Hero + CTA → auth, FAQ accordion, theme toggle, mobile 375px.  
**Parity:** **Near 1:1** — rebuilt from DESIGN PX mockup (`5417166`).

---

### Stage 2 — Auth ✅ `d2f9cdb`

- [x] Reskin `#authOverlay` from `poxy-auth.html`
- [x] Keep all Supabase auth handlers (`poxy-auth-sky.js`)

**Gate:** Sign in, sign up, Google OAuth, error states, verify flow.  
**Parity:** **Near** — main login/register match mockup; verify/forgot/QR remain stubs.

---

### Stage 3 — App shell ✅ `32aed61` · 1:1 pass `84eeaee`

- [x] Left icon rail (74px) replaces bottom nav
- [x] Topbar: greet, XP, balance (coin), mail, notify, theme
- [x] Profile + Settings on rail foot (not topbar)
- [x] `showPage()` / `showStitchTab()` ↔ rail mapping

**Gate:** All primary tabs switch; session persists; mobile rail usable.  
**Parity:** **Near 1:1** — rail, topbar, stage layout (`84eeaee`); compact rail on short viewports.

---

### Stage 4 — Home + Open ✅ `f8bfd01` · Home polish `84eeaee`

- [x] `#pxSkyHome` — welcome panel, stats, CTAs
- [x] `#pxSkyOpen` — box tier grid (hooks to existing open flow)
- [x] `poxy-home-sky.js`, `screens/home.css`

**Gate:** Home visible after login; Open navigates; economy hooks intact.  
**Parity:** **Home: Near 1:1** · **Open picker: Partial** (legacy spin hidden; 5 boxes vs mockup 4) · **Ritual: Partial** (not mockup full-screen gen).

---

### Stage 5 — Collection ✅ `5a8e157`

- [x] Sky page head + `screens/collection.css`
- [x] `PoxyCollectionSky` — filters/search stub, legacy grid preserved

**Gate:** Collection loads regular + club cards; no layout under topbar.  
**Parity:** **Partial** — mockup card grid/toolbar not fully audited 1:1.

---

### Stage 6 — Market ✅ `85a7192`

- [x] Sky market CSS + `PoxyMarketSky`

**Gate:** Market tab loads listings.  
**Parity:** **Partial** — legacy market DOM reskinned, not full mockup pass.

---

### Stage 7 — Open ritual ✅ `85a7192`

- [x] Sky open CSS (`screens/open.css`), ritual overlay hooks
- [x] Production spin/commit-reveal economy **unchanged**

**Gate:** Open one case end-to-end; pity/balance correct.  
**Parity:** **Partial** — mockup box-open → full-screen generation ritual not 1:1.

---

### Stage 8 — Store ✅ `a7f6558`

- [x] Sky store CSS + `PoxyStoreSky`

**Gate:** Store tab renders products.  
**Parity:** **Partial**.

---

### Stage 9 — Settings ✅ `a7f6558`

- [x] Sky settings grid + `PoxySettingsSky`
- [x] Legacy settings sidebar hidden in sky mode

**Gate:** Settings reachable from rail; toggles persist.  
**Parity:** **Partial** — mockup `set-group` layout not fully verified.

---

### Stage 10 — Profile ✅ `7f04562`

- [x] Sky profile CSS + `PoxyProfileSky`
- [x] Legacy idhub DOM retained (hooks preserved)

**Gate:** Profile avatar, stats, showcase load.  
**Parity:** **Partial** — mockup passport-style profile not 1:1.

---

### Stage 11 — Nav screens ✅ `8c82ebc`

- [x] Collections overview (`PoxyCollectionsSky`)
- [x] Community (`PoxyCommunitySky`)
- [x] Messenger (`PoxyMessengerSky`)
- [x] Events (`PoxyEventsSky`)
- [x] Quests (`PoxyQuestsSky`)
- [x] Levels (`PoxyLevelsSky`)

**Gate:** Each rail tab renders without blank stage.  
**Parity:** **Partial** for all six — first Sky skins, not mockup audit.

---

### Clean slate + partial cleanup

| Commit | What |
|--------|------|
| `a1ea58b` | Lazy-mount legacy CSS after login (later removed) |
| `a8cb8c4` | Remove legacy Stitch page CSS |
| `2e236e8` | Strip Lumina OS + remaining legacy screen CSS |

**Not done:** full `cleanup.md` — thin `index.html`, feature CSS audit, `core/` split.

---

## Pixel-parity summary (quick reference)

| Parity | Screens |
|--------|---------|
| **Near 1:1** | Landing, App shell, Home |
| **Near** | Auth, Brand tokens |
| **Partial** | Open (picker + ritual), Collection, Market, Store, Settings, Profile, Collections, Community, Messenger, Events, Quests, Levels, modals |
| **Stub** | Auth verify/forgot/QR (UI only) |

**Next work (recommended order):** Collection → Open ritual → Market → Settings → Profile → Stage 11 screens — one **1:1 + smoke** unit per PR.

## Smoke test (run after every stage or 1:1 pass)

1. Sign in → session persists on reload  
2. Profile → avatar upload works  
3. Collection → regular + club cards render  
4. Open one case (economy intact)  
5. Market tab loads  
6. Mobile 375px — no broken layout / nav; Profile + Settings visible on rail  

Structural check (shell + home): `node scripts/verify-dashboard-parity.js`

## CSS conventions

- New classes: `px-` prefix (Sky system)
- Legacy `poxy-*` / `st-*` — remove only after screen is migrated and unreferenced
- Use tokens from `assets/poxy-sky/tokens.css` — no hardcoded pink/mint legacy colors
- Logo: `--px-cardmask` or class `.px-mark`

## Admin panel

Out of scope for this rebrand (`admin-terminal.html` unchanged).

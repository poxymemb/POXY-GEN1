# POXY WORLD — Project Context (single source of truth)

> This file is the master brief for any AI agent working on POXY WORLD.
> Read this first, every session, before touching code.
> Company: **NULLSPACE LABS LTD** (UK). Owner/architect: Nikita.

---

## 0. What POXY WORLD is

POXY WORLD is a mobile-first **crypto-gacha collectibles platform**: users open boxes
and receive unique digital figures (cartoon Pepe-style frogs) of varying rarity, then
collect, trade, gift, and showcase them. The product values **trust over hype** — a quiet,
Apple/Telegram-grade experience, not a noisy crypto casino.

Three brand words: **Uniqueness, Belonging, Calm.**
Positioning: "a showcase, not a fair." The figure glows; the interface stays silent.

Economy is **closed for now** (no withdrawals) to stay clear of FCA gambling/crypto rules.
A wider economy (external value, blockchain) is a deliberate **future** roadmap item —
framed publicly as "collect early, before the next chapter." Never market withdrawals as
available today.

---

## 1. Architecture (DO NOT redesign without explicit instruction)

POXY WORLD is a **vanilla SPA**:

- **Production entry:** `index.html` (~16k lines) + `assets/`
- **Backend:** Supabase — auth, RPC, storage, Edge Functions, RLS. Project ref `rbrtjkfawdnomvvyxwvp` (`https://rbrtjkfawdnomvvyxwvp.supabase.co`)
- **Deploy:** Vercel, auto-deploy from `main`
- **No framework.** Plain HTML + CSS + JS. This is intentional and works.

> **Important architectural ruling:** We are **NOT** migrating to React/Next.js right now.
> The vanilla SPA already has working Supabase hooks, a crypto/ledger engine, and a live
> economy. A framework rewrite would discard all of that for months of risk. The current
> rebrand is **visual-only** via the Sky design layers + Strangler Fig (see §3).
> A future React migration, if ever, is a separate explicitly-scoped project. Do not start it.

### Mockups = UI source of truth (`design/v2/`)
- `poxy-brand-guide.html` — tokens
- `poxy-landing.html` — landing + FAQ / News / Policy / About
- `poxy-auth.html` — login / register / verify
- `poxy-dashboard.html` — app shell + all 13 app screens
- `poxy-architecture-map.html` — screen map + flows

---

## 2. Sky Design System (the visual contract)

| Token | Value |
|---|---|
| Accent | `#60C2E0` (Sky-500) |
| Sky scale | 50 `#EEF8FB` · 100 `#DCF1F7` · 200 `#C3E7F1` · 300 `#A6DAEB` · 400 `#8BCFE4` · 500 `#60C2E0` · 600 `#40ABCC` · 700 `#2E85A0` · 800 `#2DB1D7` · 900 `#193D48` |
| Ink / Paper | `#1C1C1E` / `#F0F0F1` |
| Light bg | `#F0F0F1` · Dark bg `#1C1C1E` |
| Default theme | **light** |
| Theme key | `localStorage` → `poxy-sky-theme` |
| Fonts | SF Pro / Inter / system-ui (never Syne, never pink legacy) |
| Logo | "Card" mark via CSS mask `--cardmask` / `--px-cardmask` |
| App layout | Left rail 74px (`--rail-w`) + topbar (replaces bottom nav + pink pills) |
| Currency | coin SVG in Sky accent (NEVER the text "PX") |
| "Sell for coins" | the dissolve action (never "burn") |

**Rule:** visual refresh only — preserve all Supabase hooks, ids, RPC, crypto engine,
economy invariants. The full token block lives in `assets/poxy-sky/tokens.css`.

### Rarity model (project core — three independent axes, shown as 3 separate badges)
1. **Mutation** — named, item-bound, own drop-rate (e.g. Heart: Classic Red 30%, Golden 5%, Black Chained 1%, Full BW Chained 0.5%). Replaces generic Common/Rare.
2. **Number** — mint number out of the run (e.g. /100). Both **low** (1,2,3) and **pretty/repeat** (11, 22, 100) numbers carry a bonus.
3. **Background** — system-wide (Standard White 60% … Dark Blood Red 1%, Dark 0.6%).
Final value = combination of all three.

### Opening ritual (signature)
Not a spinning wheel. Branded box → it opens → **full-screen generation, figure forms
top-to-bottom** → reveal. Calm, deliberate. Then Keep / Sell for coins / Open another.

---

## 3. Migration strategy — Strangler Fig (how the rebrand works)

New Sky code grows **alongside** legacy; legacy is "strangled" (stops being used) and only
deleted once nothing references it. This is how large products do full redesigns — never a
single blind `delete`.

Mechanism already in place:
- Public head loads Sky CSS (`tokens.css`, `landing.css`, `auth.css`, `app-shell.css`, `screens/*.css`, `runtime.css`) plus functional modals/Lumina sheets.
- Legacy CSS was lazy-loaded after login via `PoxyLegacyStyles.mount()` — **removed** in cleanup (`8c82ebc`+). Functional CSS now loads from `index.html`; layout rules live in `assets/poxy-sky/runtime.css` and merged `screens/*.css`.

### DOM tree (simplified)
```
body
├── #poxyLanding        — landing (public)
├── #authOverlay        — Sky auth
├── #poxyAppShell       — Sky app shell
│   ├── #pxSkyRail      — left rail 74px (13 buttons)
│   ├── #pxSkyMain
│   │   ├── #pxSkyTopbar — greet, XP, balance(coin), notify, theme
│   │   └── #pxSkyStage  — screen panels
│   │       ├── #pxSkyHome / #pxSkyOpen (Stage 4)
│   │       └── legacy content panels (being reskinned)
├── #bottomNav          — hidden in sky mode
└── modals, crypto overlay…
```

### Body classes
| Class | When |
|---|---|
| `poxy-landing-active` | guest on landing |
| `poxy-sky-app-active` | logged in, Sky app |
| `px-sky-app--open` | shell visible |

---

## 4. Production hooks — NEVER TOUCH (backend contract)

| Area | Functions / ids |
|---|---|
| Boot | `bootApp()` |
| Auth | `handleAuth`, `handleAuthOAuth`, `openPoxyAuth`, `setLoggedInUI`, `setLoggedOutUI` |
| Nav | `showPage()`, `showStitchTab()`, `showPoxyAppShell()` |
| Economy | `getPxBalance()`, `formatPX()`, `openTopUpModal()` |
| Spin/Open | `#btnOpen`, `#stSpinMount`, `#stPremiumTray`, pity ids |
| Collection | `loadCollection()`, `colData`, `#colContent` |
| Profile | `currentProfile`, `syncNavUsernameLabels()` |
| Crypto | SHA-256 hashes, ledger, commit-reveal RNG — **server-side only** |
| Supabase | `https://rbrtjkfawdnomvvyxwvp.supabase.co` |

Auth hook ids to preserve: `#authEmail`, `#authPassword`, `#authSubmitBtn`, `#authMsg`,
`#authModeSwitch`, `#authSignupEmail`, `#authSignupPassword`, `#authSubmitBtnRegister`,
`#authRegisterMsg`; functions `handleAuth()`, `handleAuthOAuth()`, `switchTab()`, `updateAuthModeUI()`.

---

## 5. Done vs remaining

> **Last updated:** 2026-06-17 · branch `main` · Stages **0–11 committed**.  
> Pixel-parity is separate from “stage landed” — a stage means Sky CSS/JS is wired; **1:1** means visual match to `design/v2/` mockups + smoke gate passed.

### Committed stages (git)

| Stage | Scope | Commit(s) | Notes |
|-------|--------|-----------|--------|
| **0** | Foundation — tokens, components, mockups, rules | `998b9ef` | |
| **1** | Landing reskin | `9f8edca` · fix `18ebd72` · 1:1 pass `5417166` | |
| — | Clean slate — legacy CSS lazy-mount (later removed) | `a1ea58b` | Superseded by cleanup below |
| **2** | Auth overlay | `d2f9cdb` | |
| **3** | App shell — rail 74px, topbar, nav | `32aed61` · 1:1 pass `84eeaee` | Shell chrome in `84eeaee` |
| **4** | Home + Open screens | `f8bfd01` · Home polish `84eeaee` | Open grid ≠ full ritual 1:1 |
| **5** | Collection | `5a8e157` | |
| **6** | Market | `85a7192` | Same commit as Stage 7 |
| **7** | Open ritual UI | `85a7192` | Economy/spin hooks preserved |
| **8** | Store | `a7f6558` | Same commit as Stage 9 |
| **9** | Settings | `a7f6558` | |
| **10** | Profile | `7f04562` | |
| **11** | Collections, Community, Messenger, Events, Quests, Levels | `8c82ebc` | |
| — | Partial cleanup — legacy design system, Lumina strip | `a8cb8c4` · `2e236e8` | Not final `cleanup.md` pass |

**Head (local, unpushed at last doc sync):** `84eeaee` — 13 commits ahead of `origin/main` is possible; run `git log -1` before deploy.

### Pixel-parity vs `design/v2/` (honest)

Legend: **1:1** mockup match + gate smoke-tested · **Near** layout/copy close, minor gaps · **Partial** Sky layer on legacy DOM · **Stub** UI placeholder only

| Screen | Mockup | Production hook | Parity | Gap (if not 1:1) |
|--------|--------|-----------------|--------|------------------|
| Brand / tokens | `poxy-brand-guide.html` | `tokens.css`, `components.css` | **Near** | Production tokens synced; spot-check components |
| Landing | `poxy-landing.html` | `#poxyLanding` | **Near 1:1** | Rebuilt `5417166`; manual mobile 375px gate |
| Auth | `poxy-auth.html` | `#authOverlay` | **Near** | Login/register wired; verify/forgot/QR stubs |
| App shell | `poxy-dashboard.html` (rail + topbar) | `#poxyAppShell`, `#pxSkyRail`, `#pxSkyTopbar` | **Near 1:1** | Rail-spacer pins profile/settings; sticky flex layout; `zoom:1` in Sky mode; stage `max-width:1120px` |
| Home | `#sc-home` | `#pxSkyHome` | **Near 1:1** | Welcome + stats; smoke on real login advised |
| Open — box picker | `#sc-open` | `#pxSkyOpen` | **Near 1:1** | Sky box grid matches mockup; Legend tier is production-only (5 cards) |
| Open — ritual | mockup full-screen gen | `#pxSkyRitual`, `#btnOpen`, `#stSpinMount` | **Near 1:1** | Frog reveal top-to-bottom, sweep animation, Keep/Sell/Open another |
| Collection | `#sc-collection` | `#collectionPage` | **Near 1:1** | Miles ring, filters, search, card grid; Sky `#pxSkyFigureModal` passport (frog, Serial/Edition/Season, Sell/Close) |
| Market | `#sc-market` | `#stPanelMarket` / `#marketPage` | **Near 1:1** | Listing cards with rarity rings, coin prices, click-to-buy modal; sort chips + Sell CTA |
| Store | `#sc-store` | store panel | **Near 1:1** | Free/Plus plans, Banners/Effects chips, coin buy buttons, Add funds |
| Settings | `#sc-settings` | `#settingsPage` | **Near 1:1** | Four groups hub, dark theme toggle, detail drill-down; legacy sidebar hidden |
| Profile | `#sc-profile` | `#profilePage` | **Near 1:1** | Banner, avatar overlap, colour swatches, Plus lock; hunt shell suppressed on route |
| All collections | `#sc-collections` | `tierlist` / `PoxyCollectionsSky` | **Near 1:1** | Overview → Hearts detail → item drill-down wired |
| Community | `#sc-community` | `club` / `PoxyCommunitySky` | **Near 1:1** | Feed, sidebar search, channel profile drill-down |
| Messenger | `#sc-messenger` | `messenger` / `PoxyMessengerSky` | **Near 1:1** | Chat list, search, thread switch, attach menu, send |
| Events | `#sc-events` | `events` / `PoxyEventsSky` | **Near 1:1** | Overview → detail with progress, leaderboard, read more |
| Quests | `#sc-quests` | `quests` / `PoxyQuestsSky` | **Near** | Daily quest rows wired to production data |
| Levels | `#sc-levels` | `levels` / `PoxyLevelsSky` | **Near** | Level path UI; legacy ranks podium hidden |
| Modals / overlays | mockup modals | notify, support, top-up, crypto overlay | **Partial** | Functional legacy modals + `overlays.css` reskin |

Known UI stubs (no backend): QR device login, forgot password flow, verify OTP polish.

### What is **not** done (post–Stage 11)

1. **Per-screen 1:1 audit** — Landing, Auth, Shell, Home are closest; Open ritual frog reveal and passport modal still differ from mockup.
2. **Full smoke gate** on all 13 routes — login → profile → collection → open case → market → 375px — run manually before deploy.
3. **Final cleanup** (`cleanup.md`) — `index.html` still monolithic; feature CSS (identity, cards, notify…) still loaded; Telegram-style split incomplete.
4. **Push** — local `main` may be ahead of `origin`; deploy when ready.

### After Stage 11 — cleanup (partial ✅)

Done: `PoxyLegacyStyles.mount()` removed; page layout merged into `assets/poxy-sky/runtime.css` + `screens/*.css`; Sky JS under `assets/js/ui/`; Stitch page CSS deleted (`a8cb8c4`, `2e236e8`).

Remaining: prove-zero-reference deletes, thin `index.html`, incremental `core/` / `features/` split per §7.

---

## 6. Mockup → production hook mapping

| Mockup screen | Production hook |
|---|---|
| Landing | `#poxyLanding`, `data-pl-auth`, `data-px-tab` |
| Auth | `#authOverlay`, `#authEmail`, `#authPassword`, `#authSubmitBtn` |
| App shell | `#poxyAppShell`, `#pxSkyRail`, `#pxSkyTopbar` |
| Home | `#pxSkyHome`, `PoxyHomeSky.showHome()` |
| Open | `#pxSkyOpen`, `PoxyHomeSky.showOpen()`, `#btnOpen` |
| Collection | `#collectionPage`, `showPage('collection')` |
| Market | `#stPanelMarket`, `showStitchTab('market')` |
| Store | store panel, `showStitchTab('store')` |
| Profile | `#profilePage`, `showPage('profile')` |
| Settings | `#settingsPage`, `showPage('settings')` |

---

## 7. Target repo structure (Telegram-grade organization)

Telegram's web client is cleanly split by concern, not one mega-file. Our long-term target
(reach gradually, never in one risky move):

```
/
├── index.html                  # thin shell, minimal inline
├── assets/
│   ├── poxy-sky/               # NEW design system (the future)
│   │   ├── tokens.css
│   │   ├── components.css
│   │   ├── landing.css
│   │   ├── auth.css
│   │   ├── app-shell.css
│   │   └── screens/            # one css per screen (home.css, collection.css…)
│   ├── js/
│   │   └── ui/                 # Sky screen controllers + app shell
│   ├── frames.css, lumina-*, modals…  # functional CSS (static in index.html)
├── scripts/                    # build/rebuild/patch helpers
├── supabase/                   # migrations, edge functions, RLS policies
├── design/v2/                  # mockups (source of truth)
├── .cursor/rules/              # AI agent rules
├── .ai/                        # agent task artifacts (see workflow)
├── POXY_CONTEXT.md             # this file
└── DESIGN.md                   # design system deep-dive
```

> Reach this structure **incrementally** during the post-Stage-11 cleanup, moving files
> as they stop being referenced. Never break `index.html`'s working script order mid-flight.

---

## 8. Non-negotiable invariants (every agent obeys)

1. **Never** modify backend logic, Supabase hooks, crypto engine, or economy math during a visual task.
2. **Never** delete legacy code that is still referenced. Strangle, then delete.
3. **Default theme is light.** Theme key is `poxy-sky-theme`.
4. Currency is a **coin**, never "PX". Dissolve is **"Sell for coins"**, never "burn".
5. No em-dashes (—) in user-facing copy. Write plainly, not "AI-ish".
6. Preserve CRLF line endings on Windows; UTF-8 without BOM. (String-replace patches break on mixed endings.)
7. **Commit before destructive changes.** Always leave a restore point.
8. One screen per stage. Verify the previous stage works before starting the next.
9. Child safety, security, and honesty outrank speed and feature count.

---

## 9. How we work (AI-agent operating model)

See `.cursor/rules/` for the full rule set. Summary:
- **Nikita = architect.** Sets goals, approves plans, owns decisions.
- **Builder agent** implements one scoped unit at a time.
- **Reviewer/QA agent** audits every change (security, RLS, bugs, regressions) before it's considered done.
- Plans are written before code. Reviews are written after. Nothing ships unreviewed.
- Security and bug-fixing are the top priorities, above new features.

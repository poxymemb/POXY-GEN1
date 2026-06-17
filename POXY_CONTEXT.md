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
- Public head loads only Sky CSS (`tokens.css`, `landing.css`, `auth.css`, `app-shell.css`, `home.css`).
- Legacy CSS loads **only after login** via `PoxyLegacyStyles.mount()` (`assets/poxy-sky/legacy-styles.js`), and that mount list shrinks as each screen is reskinned.
- When all screens are reskinned → `mount()` list becomes empty → **only then** delete legacy files + inline CSS in one clean commit.

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

### Done (Stages 0–4)
- **Stage 0** (`998b9ef`): tokens.css, components.css, DESIGN.md, rules
- **Stage 1** (`9f8edca`, fix `18ebd72`): Landing 1:1 → `landing.css`, `poxy-landing-page.js`
- **Clean slate** (local): legacy CSS extracted → lazy mount after login
- **Stage 2** (local, uncommitted): Auth → `auth.css`, `poxy-auth-sky.js`
- **Stage 3** (local, uncommitted): App shell → rail + topbar, legacy chrome killed
- **Stage 4** (local, uncommitted): Home + Open → `home.css`, `poxy-home-sky.js`

> ⚠️ **FIRST ACTION:** Stages 2–4 + clean slate are **uncommitted**. Commit them before
> any new work so there is a restore point. (See task `a` below.)

### Remaining (Stages 5–11) — reskin one screen per stage from `design/v2/poxy-dashboard.html`
| Stage | Screen | Mockup id |
|---|---|---|
| 5 | Collection | `#sc-collection` |
| 6 | Market | `#sc-market` |
| 7 | Open ritual UI | box cards + full-screen generation |
| 8 | Store | `#sc-store` |
| 9 | Settings | `#sc-settings` |
| 10 | Profile | `#sc-profile` |
| 11 | Collections overview, Community, Messenger, Events, Quests, Levels | respective ids |

Known stubs (UI only today): QR device login, forgot password, verify OTP flow.

### After Stage 11 — cleanup phase
Only when `PoxyLegacyStyles.mount()` list is empty:
1. Delete legacy page CSS files + `legacy-app-inline.css`.
2. Remove dead JS, unused ids, obsolete scripts.
3. Restructure repo (see §7).
4. One clean commit: `chore: remove legacy design system`.

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
│   │   ├── core/               # boot, supabase client, router
│   │   ├── features/           # auth, economy, collection, market, social…
│   │   └── ui/                 # shared widgets
│   └── legacy/                 # quarantined; deleted after Stage 11
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

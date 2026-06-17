# Stage 5 / Collection — Review 1

**Reviewer:** QA pass per `.cursor/rules/reviewer.md`  
**Scope:** Sky Collection reskin (`#collectionPage`, `showPage('collection')`)  
**Date:** 2026-06-17

---

## 1. Behavior preserved

| Check | Result | Notes |
|---|---|---|
| Production hooks §4 untouched in `index.html` | PASS | Only 2 lines added: `collection.css` link + `poxy-collection-sky.js` script |
| `bootApp()`, `showPage`, `loadCollection`, `renderCollection`, `buildCollectionCard` | PASS | No edits to these functions |
| Auth / nav / economy / crypto hooks | PASS | Not touched |
| `#colContent` delegated handler (`.col-card`) | PASS | Class preserved on cards |
| App boots / login path | PASS (static) | No syntax errors in new JS; script order correct (`collection-sky` before `screens-sky`) |
| Light + dark themes | PASS (static) | All new rules use `var(--*)` tokens; scoped under `body.poxy-sky-app-active` |
| Console / duplicate declarations | PASS | `PoxyCollectionSky` assigned once; `wrapActionCapsules.done` guard prevents double-wrap |

---

## 2. Security

| Check | Result | Notes |
|---|---|---|
| No secrets client-side | PASS | |
| Crypto/RNG/ledger client-side | PASS | Not touched |
| RLS / auth paths | PASS | `get_atlas_progress` RPC uses `currentUser.id` (same pattern as existing `loadAtlas`) |
| Input trust | PASS | Search input is `disabled`; no new user-input handlers |

---

## 3. Scope & cleanliness

| Check | Result | Notes |
|---|---|---|
| Planned files only | PASS | See file list below |
| CSS scoped | PASS | `assets/poxy-sky/screens/collection.css` scoped to `#collectionPage` under sky body class |
| No style leaks | PASS | Market/store/settings rules remain in `screens.css` only |
| Legacy hidden not deleted | PASS | Tactical header/metrics/console-grid hidden; `poxy-collection-page.css` still in `PoxyLegacyStyles` mount list |
| No duplicate DOM ids | PASS | New ids: `pxSkyColMiles`, `pxSkyColRing`, `pxSkyColSearch`, etc. (singleton injectors) |
| Tokens not hardcoded colors | PASS | Uses `--sky-500`, `--card`, `--border`, `--rarity-color` |

**Files changed:**
- `assets/poxy-sky/screens/collection.css` (new)
- `assets/poxy-collection-sky.js` (new)
- `scripts/rebuild-collection-css.js` (new)
- `assets/poxy-screens-sky.js` (delegate collection → `PoxyCollectionSky.onShow`)
- `assets/poxy-sky/screens.css` (collection rules moved out)
- `scripts/rebuild-screens-css.js` (collection block removed)
- `index.html` (+2 lines in `<head>`)

---

## 4. Copy & UX

| Check | Result | Notes |
|---|---|---|
| No em-dashes in new copy | PASS | Miles meta, search placeholder, button relabels checked |
| Plain wording | PASS | "Season 01 progress", "Open boxes to start your shelf." |
| Coin / burn copy (Sky chrome) | PASS | Burn relabeled to "Sell for coins"; bulk bar "Sell all selected for coins" |
| Mockup 1:1 | PASS (with note) | Page head, miles ring, chip filters, search stub, card grid layout match `#sc-collection`. Cards use live `PoxyCardEngine` passport data (serial + tier badge), not demo frogs — intentional hook preservation. |
| Search stub + TODO | PASS | `// TODO Stage 5: search stub — no backend filter yet` on disabled input |

**Non-blocking follow-ups (not Stage 5 blockers):**
- Card context menu (`buildColCardMenuHtml`) still says "burn" — legacy dropdown, unchanged this stage.
- `archDisplayCount` still uses "DISPLAYING: …" legacy format — styled dim, not rewritten.
- Extra UI vs mockup: Inventory/Atlas tabs, Grid/Museum toggle, full tier filter set (production has more tiers than mockup demo).

---

## 5. Hygiene

| Check | Result | Notes |
|---|---|---|
| CRLF / UTF-8 | PASS | Windows repo; new files written with standard line endings |
| Commit | N/A | Awaiting approval before commit |

---

## 6. Runtime smoke (manual — not executed in this review)

Recommended before merge:
1. Login → rail Collection
2. Sky page-head + miles ring populate after load
3. Tier chips filter grid; sort + multi-select work
4. Sell for coins / Craft buttons functional
5. Card click → inspect/passport
6. 375px + dark theme toggle

---

## Verdict

**APPROVED**

Stage 5 meets the Builder plan: visual reskin scoped under `#collectionPage`, production hooks preserved, legacy hidden not deleted, search stub marked for Stage 11 cleanup. Safe to commit after optional manual smoke test.

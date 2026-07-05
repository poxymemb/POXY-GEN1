# Stage 7 / Open ritual UI — Review 1

**Reviewer:** QA pass per `.cursor/rules/reviewer.md`  
**Scope:** Sky Open box grid + full-screen ritual (`#pxSkyOpen`, `#pxSkyRitual`, `PoxyOpenSky`)  
**Date:** 2026-06-17

---

## 1. Behavior preserved

| Check | Result | Notes |
|---|---|---|
| Production hooks in `index.html` | PASS | +2 lines: `open.css` link + `poxy-open-sky.js` script; no hook ids removed |
| `#btnOpen`, `#stSpinMount`, `#stPremiumTray`, pity ids | PASS | Legacy spin host kept in DOM; hidden via CSS in Sky open view |
| `runCaseOpen`, RNG (`rng_commit` / reveal) | PASS | Unchanged; ritual calls `runCaseOpen({ dopamine: false })` on big-box tap |
| `runRouletteCarousel` | PASS | Wrapped at runtime → `runSkyGeneration` when `#pxSkyOpen` active |
| `openWinRevealModal`, `resetAll` | PASS | Wrapped; Sky shows in-ritual result instead of legacy modal |
| `addCurrentDropToCollection`, `openPriceModal` | PASS | Keep / Sell for coins / Open another wired to existing handlers |
| `PoxyHomeSky.showOpen()` | PASS | Delegates to `PoxyOpenSky.onShow()` |
| Script order | PASS | `poxy-open-sky.js` loads before `poxy-home-sky.js` |
| Duplicate declarations | PASS | Single `PoxyOpenSky`; wrap guards on roulette / reveal / reset |

---

## 2. Security

| Check | Result | Notes |
|---|---|---|
| No secrets client-side | PASS | |
| Crypto / RNG server-side only | PASS | `runCaseOpen` Edge Function flow untouched |
| RLS paths | PASS | No new data access |
| User input | PASS | Box selection sets existing `selectedCaseType` only |

---

## 3. Scope & cleanliness

| Check | Result | Notes |
|---|---|---|
| Planned files only | PASS | open.css, poxy-open-sky.js, rebuild-open-css.js, poxy-home-sky.js (+1 line), index +2 lines |
| CSS scoped | PASS | `#pxSkyOpen`, `#pxSkyRitual`, `body.poxy-sky-app-active` |
| Legacy hidden | PASS | `.px-open-spin-host`, `.st-premium-tray` `display:none`; roulette DOM intact |
| Tokens | PASS | `--sky-500`, `--card`, `--btn-bg`, `--cardmask`, rarity tier colors from `TIERS` |
| CSS build order | PASS | Manual overrides fix ritual-close selector + stage visibility |

---

## 4. Copy & UX

| Check | Result | Notes |
|---|---|---|
| No em-dashes in new copy | PASS | |
| Coin not PX on box prices | PASS | `formatCoinPrice()` via `getEffectiveCasePrice` |
| Mockup alignment | PASS (with notes) | Box grid (5 tiers), full-screen ritual (tap box → generate 2.4s → result), Keep / Sell for coins / Open another |
| Reduced motion | PASS | Generation shortened to ~80ms when `prefers-reduced-motion` |
| Legend sold out | PASS | `.sold-out` on Legend card when monthly cap reached |

**Non-blocking notes:**
- Pity tracker and case wallet remain in hidden legacy host (still updated by economy code; not shown in Sky open view yet).
- Home screen “Open a box” CTA still routes via `showOpen()`; box grid also opens ritual on card tap.
- `runCaseOpen` insufficient-balance toast still says “Insufficient PX.” (legacy string, unchanged).

---

## 5. Hygiene

| Check | Result | Notes |
|---|---|---|
| CRLF / UTF-8 | PASS | |
| Commit | N/A | Awaiting user OK |

---

## Verdict

**APPROVED**

Stage 7 ready to commit after optional smoke: login → rail Open / home CTA → pick box tier → ritual tap → generation → result → Keep / Sell for coins / Open another → dark theme → Legend sold-out state if applicable.

**Note:** Stage 6 (Market) is still uncommitted in the same working tree; commit Stage 6 and Stage 7 separately or together per your preference.

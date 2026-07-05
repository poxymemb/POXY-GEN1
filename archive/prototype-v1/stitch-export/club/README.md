# POXY CLUB — Stitch screen exports

Project: **POXY GEN1** (`3452513058897199540`)  
Design system: **Gold & Obsidian Elite** (`assets/3f8a21938e1440dea57c6f4b60401a45`)

| Key | Screen | ID |
|-----|--------|-----|
| awakening | POXY - The Awakening Onboarding | `c3fa3a6bdaf84bc286fc76b0219ca6d8` |
| boarding-pass | POXY - London Boarding Pass | `ae592b217cb3430d8530a6addad5d3e1` |
| feed | POXY CLUB - The Feed (Gold Edition) | `65ea2a681d8a48fc996c4b8910160641` |
| otc-forge | POXY CLUB - Secure OTC Desk & Forge | `60642f5bea5e4604aaa4a7a311ab6c44` |
| governance | POXY CLUB - DAO Council & Voting | `ffea8979fc14412789f8e540e7f57821` |

## Download

```powershell
node tools/fetch-club-stitch-screens.mjs
```

Requires `stitch-export/club-screens.json` (URLs from MCP `get_screen`).

## Site integration

Vanilla port (no Tailwind CDN in production):

- `assets/poxy-club-page.css` — layout & behavior
- `assets/poxy-club-gold.css` — Stitch Gold & Obsidian tokens + components

Do not paste Stitch `<script src="cdn.tailwindcss.com">` into `index.html`.

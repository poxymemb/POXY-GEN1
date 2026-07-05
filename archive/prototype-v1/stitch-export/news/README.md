# POXY — Global News & Patch Notes (Stitch)

| Field | Value |
|-------|--------|
| Project | POXY GEN1 `3452513058897199540` |
| Screen | POXY - Global News & Patch Notes `c1916a0cc85a44c78b8ce28d2521c16c` |

## Files

- `global-news.html` — Stitch export HTML
- `global-news.png` — Screenshot reference
- `../news-screens.json` — Download URLs for refresh

## Refresh

```bash
node tools/fetch-news-stitch-screen.mjs
```

Production UI: `assets/poxy-news-page.css` + `#stPanelNews` in `index.html`.

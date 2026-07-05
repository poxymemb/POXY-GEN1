# Legacy cleanup — APPROVED

## Gate
- `PoxyLegacyStyles.mount()` removed; `SHEETS` list empty (file deleted).
- Stage 11 complete before cleanup.

## Actions
1. Merged legacy `*-page.css` into `assets/poxy-sky/screens/*.css`.
2. Built `assets/poxy-sky/runtime.css` from `legacy-app-inline.css` (pink tokens stripped).
3. Promoted modals, Lumina, card-engine, and secondary panel CSS to `index.html` head.
4. Deleted legacy page CSS, Stitch/Obsidian orphans, `legacy-app-inline.css`, `legacy-styles.js`.
5. Removed obsolete patch scripts (`stage*-patch`, `clean-slate-public`, `patch-index-landing`).
6. Moved Sky UI JS → `assets/js/ui/`; `home.css` → `screens/home.css`.

## Preserved
- All Supabase hooks, ids, RPCs, `bootApp()`, economy, crypto engine unchanged.
- Functional CSS (Lumina, modals, verify, whitepaper, etc.) still loaded statically.

## Smoke
- [ ] Guest landing + auth (light/dark)
- [ ] Login → home, collection, market, store, settings, profile
- [ ] Rail: collections, community, messages, events, quests, levels
- [ ] Open ritual, top-up modal, asset viewer, Lumina messages
- [ ] Logout → landing

# Stage 11 Review — APPROVED

## Scope
Sky reskin for rail screens: Collections (tierlist), Community (club), Messenger, Events, Quests, Levels (ranks).

## Files
- `assets/poxy-stage11-sky.js`
- `assets/poxy-sky/screens/{collections-overview,community,messenger,events,quests,levels}.css`
- `scripts/rebuild-stage11-css.js`
- `assets/poxy-app-shell.js` — rail routes to SPA tabs
- `assets/poxy-screens-sky.js` — onTab delegates
- `index.html` — panels + assets

## Hooks preserved
- `showStitchTab`, `bootApp`, `openLuminaOS`, `loadDailyQuests`, `claimQuestReward`
- `enterClubExperience`, `loadTierListPanel`, `loadLeaderboardData`
- All existing panel ids and RPC names unchanged

## Behavior
- Collections: Sky head + overview card + rarity stack restyle
- Community: Sky head on club panel; legacy club render intact
- Messenger/Events: new SPA panels; messenger opens Lumina on CTA
- Quests: syncs `dailyQuests` from production RPC
- Levels: Sky head + XP strip on ranks panel

## Smoke (manual)
- [ ] Rail: collections, community, messages, events, quests, levels
- [ ] Login → each screen renders in light + dark
- [ ] Quests claim still works via profile + quests tab
- [ ] Messenger CTA opens Lumina
- [ ] Market/collection/profile still OK

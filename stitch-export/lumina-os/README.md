# Lumina OS — Stitch reference (Silk Edition)

Project: **POXY GEN1** (`3452513058897199540`)

| Screen | ID | Files |
|--------|-----|-------|
| Messages | `c18b7cd03c324af8bdc13291c330485b` | messages.html / .png |
| Friends | `787ab3885d0f4231ba28a59770040670` | friends.html / .png |
| Squads | `e67ddf058d71401095b48427fceea4c4` | squads.html / .png |
| Activity | `a565437fda5a4068b9f4e7624f49d3e4` | activity.html / .png |
| Notifications | `bf836aeda2ce41208ad70978617971d5` | notifications.html / .png |
| Settings | `f71bca14ba5847a186fc80ea65a1634d` | settings.html / .png |

Light-mode tokens in the live app: `assets/lumina-os/tokens.js` (SICHA_WHITE — must match tailwind config in these HTML files).

Refresh exports:

```bash
node tools/fetch-lumina-os-stitch-screens.mjs
```

Live SPA: `#/lumina-os`

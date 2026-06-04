# Lumina OS

Immersive communication environment embedded in the POXY SPA at **`#/lumina-os`** (hash route; works on all static hosts).

## Layout architecture

| Layout | DOM | Visible when |
|--------|-----|----------------|
| **MainLayout** | `#poxyAppShell`, `.page` | Feed, Vault, Discover, Profile, etc. |
| **LuminaOSLayout** | `#luminaOsRoot` | `#/lumina-os` (also `/lumina-os` on Vercel via rewrite) |

Entering Lumina OS **unmounts** MainLayout (hidden via `body.lumina-os-active`). The root is moved to `document.body` so it is not clipped by a hidden shell. Exiting restores the previous route from `localStorage`.

## Design system

- **Light:** Stitch **SICHA White / Silk Edition** tokens (`assets/lumina-os/tokens.js`) — no custom light palette.
- **Dark:** Lumina premium graphite + aqua/violet accents.
- **Engine:** `LuminaOSTheme` — `setTheme(mode)`, `toggleTheme()`, `localStorage` key `lumina_os_theme_v1`, system preference when `mode === 'system'`, 500ms transitions.
- **Primitives:** `LuminaOSComponents` — glass cards, buttons, avatars, modals, win-rate charts.

Styles: `assets/lumina-os/design-system.css` (modules + theme) + `assets/lumina-chat-os.css` (3-panel chat) + `assets/lumina-os-overrides.css` (SPA shell).

## Folder structure

```
assets/
  lumina-chat-os.css
  lumina-os-overrides.css
  lumina-chat-config.js
  lumina-os/
    tokens.js         # SICHA light + Lumina dark
    theme.js          # Global theme engine
    data.js           # Seed squads / activity / notifications
    components.js     # Shared UI primitives
    store.js          # Persisted app state
    panels.js         # Friends, Squads, Activity, Notifications, Settings
    router.js         # MainLayout ↔ LuminaOSLayout
    app.js            # DM client, Messages module, mount lifecycle
lumina-os/
  react-scaffold/     # Future React migration reference
docs/
  LUMINA-OS.md
```

## Navigation & routing

| Nav | Module | Host |
|-----|--------|------|
| Messages | Live DMs (Supabase) | `#lcMain` + `#lcContext` |
| Friends | Roster from POXY friendships | `#lcModuleHost` |
| Squads | Cards, filters, join states, create modal | `#lcModuleHost` |
| Activity | Timeline feed | `#lcModuleHost` |
| Notifications | Grouped feed + badge | `#lcModuleHost` |
| Settings | Theme + preferences | `#lcModuleHost` |

- **Lumina OS** pill → `openLuminaOS(userId?, nav?)`
- **Exit to POXY** → `LuminaOSRouter.exit()` or Esc / `?main=1`
- Deep link: `#/lumina-os?nav=friends` or `?user={uuid}`

## State (`LuminaOSStore`)

Persists to `lumina_os_v1_{userId}`:

- Chat: `selectedChatId`, `drafts`, `vaultLevel`, `contextCollapsed`, `userStatus`
- Theme: `theme` (`light` | `dark` | `system`)
- Social: `friendsSearch`, `onlineFriendsCount`
- Squads: `squads`, `squadRequests`, `squadsFilter`, `squadsSort`
- Modules: `activityFeed`, `notifications`, `preferences`

Legacy `lumina_chat_os_v1_*` keys migrate on first load.

## Auth

Uses the main app `sb` client and `currentUser` — no second login.

## Stitch reference

Silk Edition screens (Messages, Friends, Squads, Activity, Notifications, Settings) are the visual source for light-mode tokens. Project ID `3452513058897199540` in Google Stitch.

Canonical exports (HTML + PNG from MCP):

- `stitch-export/lumina-os-screens.json`
- `stitch-export/lumina-os/*.html`
- Refresh: `node tools/fetch-lumina-os-stitch-screens.mjs`

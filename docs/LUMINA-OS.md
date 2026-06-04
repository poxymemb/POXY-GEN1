# Lumina OS

Immersive communication environment embedded in the POXY SPA at **`#/lumina-os`** (hash route; works on all static hosts).

## Layout architecture

| Layout | DOM | Visible when |
|--------|-----|----------------|
| **MainLayout** | `#poxyAppShell`, `.page` | Feed, Vault, Discover, Profile, etc. |
| **LuminaOSLayout** | `#luminaOsRoot` | `#/lumina-os` (also `/lumina-os` on Vercel via rewrite) |

Entering Lumina OS **unmounts** MainLayout (hidden via `body.lumina-os-active`). Exiting restores the previous route from `localStorage`.

## Folder structure

```
assets/
  lumina-chat-os.css      # Core 3-panel UI
  lumina-os-overrides.css # SPA transitions, 280px nav, collapse
  lumina-chat-config.js   # Supabase + paths
  lumina-os/
    store.js              # Zustand-style + localStorage
    router.js             # MainLayout ↔ LuminaOSLayout
    app.js                # DM client, mount lifecycle
lumina-os/
  types.ts                # Shared TypeScript types
  react-scaffold/         # Future React migration reference
docs/
  LUMINA-OS.md
```

## Navigation

- **Lumina OS** pill in global nav → `openLuminaOS()`
- **Message** actions → `openLuminaOS(peerId)` (SPA, same tab)
- **Exit to POXY** → `LuminaOSRouter.exit()`
- Deep link: `/lumina-os?user={uuid}`

## State (Zustand-equivalent)

`LuminaOSStore` persists to `lumina_os_v1_{userId}`:

- `selectedChatId`, `activeNav`, `drafts`, `vaultLevel`
- `contextCollapsed`, `userStatus`, `notifications`, `preferences`

Legacy `lumina_chat_os_v1_*` keys migrate on first load.

## Animations

CSS 300ms enter/exit (fade, blur, scale). Message rows use slide-up fade. Hover scale `1.03` on controls.

Framer Motion mapping for a future React build is documented in `lumina-os/react-scaffold/README.md`.

## Auth

Uses the main app `sb` client and `currentUser` — no second login.

## Future modules

Group chats, voice channels, video, screen share, AI assistants, vault threads, live events — extend `app.js` nav placeholders and channel model in the store.

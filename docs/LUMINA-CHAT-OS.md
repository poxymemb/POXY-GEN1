# Lumina Chatting OS

Isolated fullscreen messaging environment at **`/chat/app/`**.

## Architecture (vanilla SPA)

This repo uses a single-page main app (`index.html`) plus a **standalone chat shell** — the React Router pattern maps as:

| React concept | POXY implementation |
|---------------|----------------------|
| `MainLayout` | `index.html` + global nav / `#poxyAppShell` |
| `ChatLayout` | `chat/app/index.html` (no main header/sidebar) |
| `/chat/app` route | `chat/app/index.html` + `vercel.json` rewrite |
| Launch new tab | `window.openLuminaChatApp(userId?)` |

## Files

- `chat/app/index.html` — ChatLayout shell (3 panels)
- `assets/lumina-chat-config.js` — Supabase + helpers
- `assets/lumina-chat-os.css` — 2026 design system
- `assets/lumina-chat-os.js` — state, DM API, persistence

## State persistence (`localStorage`)

Key: `lumina_chat_os_v1_{userId}`

- `selectedChatId`
- `activeNav`
- `drafts` (per peer)
- `vaultLevel`

## Auth

Same Supabase session as main app (`persistSession: true`). No duplicate login on `/chat/app` if already signed in on POXY.

## Deep links

- `/chat/app/?user={uuid}` — open thread with friend

## Stitch reference

Screen: `17335914185103292963` — Lumina Chatting OS mockup  
Refresh: `node tools/fetch-lumina-chat-stitch-screen.mjs`

## Future (prepared)

Group chats, voice channels, video, screen share, AI assistants, vault threads — extend `lumina-chat-os.js` nav placeholders and channel model.

# POXY WORLD — Discord Bot (D1 + D2)

Slash commands and Supabase Realtime auto-events for the POXY community server.

## Features

### D1 — Slash commands

| Command | Description |
|---------|-------------|
| `/verify [round_id]` | RNG proof from `rng_rounds` (+ linked drop tier) |
| `/dragon [serial]` | Dragon card: tier, owner, DNA hash |
| `/stats` | Platform stats via `get_supply_overview` + Gen1 supply |
| `/leaderboard` | Top 10 players by `xp_total` |

### D2 — Auto-events (Supabase Realtime)

| Trigger | Channel env | Condition |
|---------|-------------|-----------|
| Rare drop | `RARE_DROPS_CHANNEL_ID` | `user_poxy` INSERT — tier legendary / mythic / secret |
| Big sale | `MARKET_FEED_CHANNEL_ID` | `marketplace` UPDATE → `sold` and price ≥ 500 PX |
| Weekly event | `ANNOUNCEMENTS_CHANNEL_ID` | `get_economy_event()` id changes (hourly poll) |

## Requirements

- Node.js 18+
- Discord application with **bot** scope
- Supabase project with **service role** key (server only — never commit)
- Tables on **Supabase Realtime** publication

## Environment variables

Create `discord-bot/.env`:

```env
DISCORD_BOT_TOKEN=...
DISCORD_APPLICATION_ID=...
DISCORD_GUILD_ID=...

SUPABASE_URL=https://rbrtjkfawdnomvvyxwvp.supabase.co
SUPABASE_SERVICE_KEY=...   # service_role — keep secret

RARE_DROPS_CHANNEL_ID=...
MARKET_FEED_CHANNEL_ID=...
ANNOUNCEMENTS_CHANNEL_ID=...
```

## Setup

### 1. Discord Developer Portal

1. [Discord Developer Portal](https://discord.com/developers/applications) → New Application
2. **Bot** → Reset Token → copy to `DISCORD_BOT_TOKEN`
3. Copy **Application ID** → `DISCORD_APPLICATION_ID`
4. Enable intents: **Server Members** not required; **Guilds** only
5. OAuth2 → URL Generator → `bot` + `applications.commands` → invite bot to your server
6. Copy server (guild) ID → `DISCORD_GUILD_ID` (Developer Mode → right-click server)

### 2. Discord channels

Create `#rare-drops`, `#market-feed`, `#announcements` and copy channel IDs (right-click → Copy Channel ID).

### 3. Supabase Realtime

`user_poxy` is already on `supabase_realtime` in production. Add marketplace if missing:

```sql
-- Run in Supabase SQL Editor (once)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'marketplace'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace;
  END IF;
END $$;
```

Enable **Realtime** for both tables in Dashboard → Database → Replication if needed.

### 4. Install & register commands

```bash
cd discord-bot
npm install
npm run deploy-commands
```

### 5. Run the bot

```bash
npm start
```

Keep running on a VPS, Railway, Render, or PM2 on a small VM. The bot must stay online for Realtime events.

## Deploy commands only

```bash
npm run deploy-commands
```

Re-run after changing slash command definitions.

## Security notes

- **Never** commit `.env` or service role keys
- Bot uses `SUPABASE_SERVICE_KEY` — bypasses RLS; run only on trusted infrastructure
- Slash commands are guild-scoped (fast updates; not global)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Commands not showing | Re-run `deploy-commands`; wait ~1 min |
| No rare-drop posts | Check `RARE_DROPS_CHANNEL_ID` and Realtime on `user_poxy` |
| No market posts | Add `marketplace` to `supabase_realtime` (SQL above) |
| Stats empty | Ensure RPCs `get_supply_overview`, `get_gen1_supply_status` exist on project |

---

*POXY WORLD © 2026 — NULLSPACE LABS LTD*

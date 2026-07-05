# POXY WORLD — MCP & Cursor Setup Guide

Полная инструкция по подключению MCP-серверов и инструментов для разработки POXY в Cursor.

---

## Уже подключено (проверь в Cursor Settings → MCP)

- ✅ **Supabase MCP** — работа с БД, таблицами, RPC
- ✅ **GitHub MCP** — коммиты, пуши, PR
- ✅ **Vercel MCP** — деплой, логи, env vars
- ✅ **Stitch MCP** — дизайн-экспорт (см. `STITCH_SETUP.md`)

---

## Рекомендуемые MCP — установить

### 1. 21st.dev Magic MCP
Генерирует UI-компоненты по описанию прямо в чате Cursor.

```bash
# В Cursor: Settings → MCP → Add Server → paste:
npx @21st-dev/magic@latest
```

Или вручную в `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "magic": {
      "command": "npx",
      "args": ["-y", "@21st-dev/magic@latest"],
      "env": {
        "TWENTY_FIRST_API_KEY": "YOUR_KEY_HERE"
      }
    }
  }
}
```
> Ключ получить на: https://21st.dev — бесплатный tier есть

**Как использовать в POXY:**
```
/ui create a dark lootbox opening card with glow animation for mythic rarity
/ui create a crypto hash display component with monospace font and green terminal style
```

---

### 2. Playwright MCP (тестирование)
Автоматически тестирует UI в браузере — полезно когда меняешь мобильный layout.

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

**Как использовать:**
```
Open https://poxygen1.vercel.app on mobile viewport 375px and check the bottom nav
```

---

### 3. Context7 MCP (документация библиотек)
Подтягивает актуальную документацию Supabase, не из кэша обучения.

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

**Как использовать:**
```
use context7 — how do I call an Edge Function with JWT in Supabase JS v2?
```

---

### 4. Sequential Thinking MCP
Заставляет Cursor думать по шагам перед сложными изменениями — критично для crypto engine.

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

**Как использовать:** просто активируй — Cursor автоматически применяет для сложных задач.

---

## Где лежит конфиг MCP

**Windows (этот проект):**
```
POXY GENS/.cursor/mcp.json
```

**Глобально (Mac/Linux):**
```
~/.cursor/mcp.json
```

**Полный пример `.cursor/mcp.json` для POXY:**
```json
{
  "mcpServers": {
    "stitch": {
      "command": "node",
      "args": ["C:/Users/Satoru Gojo/Desktop/POXY GENS/tools/stitch-mcp-proxy.mjs"],
      "env": {
        "STITCH_API_KEY": "YOUR_STITCH_KEY"
      }
    },
    "magic": {
      "command": "npx",
      "args": ["-y", "@21st-dev/magic@latest"],
      "env": {
        "TWENTY_FIRST_API_KEY": "your_key"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

> `.cursor/mcp.json` в `.gitignore` — ключи не коммитятся.

---

## Cursor Rules — установка

Файл `.cursor/rules/poxy.mdc` уже создан в проекте.

```
your-project/
├── .cursor/
│   ├── mcp.json              ← MCP серверы (локально, не в git)
│   └── rules/
│       └── poxy.mdc          ← master rules
├── poxy_v3.html
├── scripts/
└── ...
```

Cursor подхватит правила автоматически для всех файлов проекта.

---

## Промпт-паттерны для POXY в Cursor

### Добавление фичи (бэкенд):
```
Following poxy.mdc rules: add [feature] to poxy_v3.html.
- Read the existing [section] code first
- Preserve all existing Supabase RPC calls
- Do not touch the crypto engine
- Mobile-first, test mentally at 375px
```

### Дизайн-правки:
```
Following poxy.mdc rules: improve the [component] design.
- Stay within POXY dark cyber-luxury aesthetic
- Use existing CSS variables only
- CSS animations only, no new JS libraries
- Keep all existing functionality intact
```

### Supabase миграция:
```
Write a Supabase SQL migration for [feature].
- Use the "new snippet" approach (separate file per migration)
- Include RLS policies
- Append-only for any ledger-related tables
- Add appropriate indexes
```

### Дебаг:
```
Debug this issue in poxy_v3.html: [описание]
- Identify root cause first
- Fix only what's broken
- Explain what changed and why
```

---

## Gemini 2.5 (пока лимиты на Claude)

Для бэкенда в Cursor с Gemini 2.5 используй такой системный промпт в начале сессии:

```
You are working on POXY WORLD — a mobile-first web app (poxy_v3.html).
Stack: Vanilla JS + Supabase (auth/RPC/Edge Functions) + Vercel.
The app has a cryptographic engine: SHA-256 hashes, ED25519 signatures, 
append-only Merkle ledger, commit-reveal RNG. NEVER modify this engine.
Always read existing code before adding. Never break existing features.
Mobile-first (375px). Dark cyber-luxury aesthetic.
```

---

## Полезные ссылки

- Cursor MCP docs: https://docs.cursor.com/context/model-context-protocol
- 21st.dev Magic MCP: https://21st.dev
- Supabase MCP: https://github.com/supabase-community/supabase-mcp
- Context7: https://context7.com
- MCP registry: https://mcp.so

---

*POXY WORLD © 2026*

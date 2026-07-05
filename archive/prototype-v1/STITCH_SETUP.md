# Google Stitch + Cursor (способ 1 — API key)

Пошаговая настройка для **POXY GENS**. Ключ не коммитить в git.

## Шаг 1 — API key в Stitch

1. Открой [stitch.withgoogle.com](https://stitch.withgoogle.com) и войди в аккаунт.
2. Аватар (правый верх) → **Stitch settings**.
3. Раздел **API key** → **Create key**.
4. Скопируй ключ сразу (потом не покажут). Храни в менеджере паролей.

## Шаг 2 — Node.js

В PowerShell:

```powershell
node -v
```

Нужен **Node 18+**. Если нет — установи с [nodejs.org](https://nodejs.org/).

## Шаг 3 — MCP в Cursor (подробно)

Файл: `POXY GENS\.cursor\mcp.json` — уже создан в проекте.

### 3A — Вставить API key

1. В Cursor открой **папку** `POXY GENS` (File → Open Folder), не только `index.html`.
2. В дереве файлов: `.cursor` → `mcp.json`.
3. Замени `PASTE_YOUR_KEY_HERE` на ключ из Stitch. Сохрани (**Ctrl+S**).

Команда `copy` в PowerShell **не обязательна** — она только копирует пример в `mcp.json`, если файла ещё нет.

### 3B — Включить в интерфейсе Cursor

1. **Ctrl+Shift+J** → Cursor Settings.
2. Слева **MCP**.
3. Сервер **stitch** → включить (toggle). Если ошибка — **Refresh / Reload**.
4. Зелёная точка + список tools (не «0 tools»).

Или: **Ctrl+Shift+P** → `MCP` → Open MCP Settings.

### Вариант A (официальный JSON из Stitch)

Если Stitch показал блок с `"url": "https://stitch.googleapis.com/mcp"` — **вставь его целиком** в `.cursor/mcp.json` (это правильный способ, без npx).

Ключ — из поля **«Настроить MCP»** → `X-Goog-Api-Key`.

### Вариант A2 (запасной, npx)

Если HTTP не подключается, верни `command` + `npx @_davideast/stitch-mcp proxy` — см. историю в git или спроси агента.

### Вариант B: если в MCP «0 tools» (баг Cursor)

Используй локальный прокси (уже в репо `tools/stitch-mcp-proxy.mjs`):

```json
{
  "mcpServers": {
    "stitch": {
      "command": "node",
      "args": ["C:/Users/Satoru Gojo/Desktop/POXY GENS/tools/stitch-mcp-proxy.mjs"],
      "env": {
        "STITCH_API_KEY": "YOUR_KEY"
      }
    }
  }
}
```

Путь замени на свой, если проект лежит в другой папке. Снова Reload MCP.

## Шаг 4 — Не сломать git

В корне проекта добавь в `.gitignore` (если ещё нет):

```
.cursor/mcp.json
.env
```

Никогда не пушь файл с ключом.

## Шаг 5 — Первый безопасный запуск в чате

После зелёного статуса MCP напиши агенту, например:

```
Прочитай DESIGN.md и .cursor/rules/stitch-safe-redesign.mdc.
В Stitch: сгенерируй только экран AUTH CARD для POXY WORLD (mobile).
Не трогай Supabase и скрипты. Потом внедри только CSS + разметку #authOverlay.
```

Порядок пилотов: Auth → Sidebar → **Stitch Dashboard** → Collection page → Cases (см. `DESIGN.md`).

### Экспорт HTML из Stitch (для точного совпадения)

Если есть готовый экран в Stitch, в чате с MCP:

```
get_screen_code для экрана Dashboard — только HTML/CSS фрагмент.
Внедрить в #poxyStitchDashboard, ids не менять.
```

## Шаг 6 — Проверка после любого дизайна

- Sign In работает
- Профиль / аватар / рамки
- Коллекция: обычная карточка квадратная, Club — вертикальная, меню ⋮ не обрезано
- Один кейс открывается, баланс обновляется

## Связать Stitch-проект с папкой (опционально)

Через MCP: `set_workspace_project` с `projectId` из `list_projects`,  
или вручную файл `.stitch-project.json` в корне (не секрет, можно в git).

## Troubleshooting

| Симптом | Действие |
|--------|----------|
| MCP красный | Проверь ключ, Node, Reload MCP |
| 0 tools | Вариант B (`stitch-mcp-proxy.mjs`) |
| Login не работает | Откат CSS/HTML auth; проверь что не удалили `bootApp()` |
| «Photo saved» но нет фото | Не связано со Stitch — `profiles.avatar_url` + Storage path |

## Официальные ссылки

- Stitch: https://stitch.withgoogle.com  
- MCP endpoint: `https://stitch.googleapis.com/mcp`  
- CLI/proxy: https://www.npmjs.com/package/@_davideast/stitch-mcp  

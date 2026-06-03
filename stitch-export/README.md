# Stitch export — Premium Modern UI Overhaul

| Field | Value |
|-------|--------|
| Project | Premium Modern UI Overhaul |
| Project ID | `3452513058897199540` |
| Screen | POXY Gaming Dashboard - Hub |
| Screen ID | `c7d591e793cd422f8d14ee9c38224f60` |

## Files

- `dashboard-hub.html` — raw HTML from Stitch (`htmlCode.downloadUrl`)
- `dashboard-hub-screenshot.png` — preview image
- `screen-meta.json` — optional metadata (run fetch script)

## Correct MCP export workflow

1. In Cursor chat (Stitch MCP enabled), call **`get_screen`** with:
   - `name`: `projects/3452513058897199540/screens/c7d591e793cd422f8d14ee9c38224f60`
   - or `projectId` + `screenId` as in tool schema

2. From the response, download:
   - `screenshot.downloadUrl` → PNG reference
   - `htmlCode.downloadUrl` → full HTML (Tailwind)

3. CLI alternative:
   ```powershell
   $env:STITCH_API_KEY = "your-key"
   npx -y @_davideast/stitch-mcp tool get_screen_code -d "{\"projectId\":\"3452513058897199540\",\"screenId\":\"c7d591e793cd422f8d14ee9c38224f60\"}"
   ```

4. Or run (if it times out, use step 3 — CLI is more reliable):
   ```powershell
   node tools/fetch-stitch-screen.mjs 3452513058897199540 c7d591e793cd422f8d14ee9c38224f60
   ```
   On `ECONNRESET`, download `htmlCode.downloadUrl` from MCP `get_screen` with `curl -L` instead.

## Site integration

Vanilla port (no Tailwind CDN on production):

- `assets/stitch-dashboard.css` — design tokens from Stitch
- `#poxyStitchDashboard` in `index.html` — wired to Supabase / hunt / bank ids

Do **not** paste Stitch `<script>` tags into `index.html`.

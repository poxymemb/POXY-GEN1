/**
 * Download all Lumina OS (Silk Edition) Stitch screens (HTML + PNG).
 * Usage: node tools/fetch-lumina-os-stitch-screens.mjs
 * Meta: stitch-export/lumina-os-screens.json (from MCP get_screen).
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const metaPath = join(root, "stitch-export", "lumina-os-screens.json");
const DOWNLOAD_TIMEOUT_MS = 120_000;

const KEYS = [
  "messages",
  "friends",
  "squads",
  "activity",
  "notifications",
  "settings",
];

async function download(url, dest) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, { redirect: "follow", signal: ac.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(dest, buf);
    return dest;
  } finally {
    clearTimeout(timer);
  }
}

const meta = JSON.parse(readFileSync(metaPath, "utf8"));
const outDir = join(root, "stitch-export", "lumina-os");
mkdirSync(outDir, { recursive: true });

for (const key of KEYS) {
  const m = meta[key];
  if (!m?.htmlUrl) {
    console.warn("skip", key, "no htmlUrl");
    continue;
  }
  const htmlPath = join(outDir, key + ".html");
  const pngPath = join(outDir, key + ".png");
  console.log("Downloading", key, m.title, "...");
  await download(m.htmlUrl, htmlPath);
  if (m.screenshotUrl) await download(m.screenshotUrl, pngPath);
  console.log("  ", htmlPath);
}

const readme = `# Lumina OS — Stitch reference (Silk Edition)

Project: **POXY GEN1** (\`3452513058897199540\`)

| Screen | ID | Files |
|--------|-----|-------|
| Messages | \`c18b7cd03c324af8bdc13291c330485b\` | messages.html / .png |
| Friends | \`787ab3885d0f4231ba28a59770040670\` | friends.html / .png |
| Squads | \`e67ddf058d71401095b48427fceea4c4\` | squads.html / .png |
| Activity | \`a565437fda5a4068b9f4e7624f49d3e4\` | activity.html / .png |
| Notifications | \`bf836aeda2ce41208ad70978617971d5\` | notifications.html / .png |
| Settings | \`f71bca14ba5847a186fc80ea65a1634d\` | settings.html / .png |

Light-mode tokens in the live app: \`assets/lumina-os/tokens.js\` (SICHA_WHITE — must match tailwind config in these HTML files).

Refresh exports:

\`\`\`bash
node tools/fetch-lumina-os-stitch-screens.mjs
\`\`\`

Live SPA: \`#/lumina-os\`
`;
writeFileSync(join(outDir, "README.md"), readme, "utf8");
console.log("Done:", outDir);

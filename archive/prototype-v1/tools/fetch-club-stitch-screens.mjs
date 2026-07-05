/**
 * Download all POXY CLUB Stitch screens (HTML + PNG).
 * Usage: node tools/fetch-club-stitch-screens.mjs
 * Requires stitch-export/club-screens.json (from MCP get_screen responses).
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const metaPath = join(root, "stitch-export", "club-screens.json");
const DOWNLOAD_TIMEOUT_MS = 120_000;

const SCREENS = [
  { key: "awakening", screenId: "c3fa3a6bdaf84bc286fc76b0219ca6d8", title: "POXY - The Awakening Onboarding" },
  { key: "boarding-pass", screenId: "ae592b217cb3430d8530a6addad5d3e1", title: "POXY - London Boarding Pass (VIP Profile)" },
  { key: "feed", screenId: "65ea2a681d8a48fc996c4b8910160641", title: "POXY CLUB - The Feed (Gold Edition)" },
  { key: "otc-forge", screenId: "60642f5bea5e4604aaa4a7a311ab6c44", title: "POXY CLUB - Secure OTC Desk & Forge" },
  { key: "governance", screenId: "ffea8979fc14412789f8e540e7f57821", title: "POXY CLUB - DAO Council & Voting" },
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

let meta;
try {
  meta = JSON.parse(readFileSync(metaPath, "utf8"));
} catch {
  console.error("Missing", metaPath, "- run MCP get_screen and save URLs first");
  process.exit(1);
}

const outDir = join(root, "stitch-export", "club");
mkdirSync(outDir, { recursive: true });

for (const s of SCREENS) {
  const m = meta[s.key];
  if (!m?.htmlUrl) {
    console.warn("skip", s.key, "no htmlUrl");
    continue;
  }
  const htmlPath = join(outDir, s.key + ".html");
  const pngPath = join(outDir, s.key + ".png");
  console.log("Downloading", s.key, "...");
  await download(m.htmlUrl, htmlPath);
  if (m.screenshotUrl) await download(m.screenshotUrl, pngPath);
  console.log("  ", htmlPath);
}

console.log("Done:", outDir);

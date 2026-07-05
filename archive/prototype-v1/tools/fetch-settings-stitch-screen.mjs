/**
 * Download POXY Global Settings Terminal from Stitch export metadata.
 * Usage: node tools/fetch-settings-stitch-screen.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const metaPath = join(root, "stitch-export", "settings-screens.json");
const outDir = join(root, "stitch-export", "settings");

async function download(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

const meta = JSON.parse(readFileSync(metaPath, "utf8"));
const m = meta["global-settings"];
mkdirSync(outDir, { recursive: true });
console.log("Downloading Global Settings screen…");
await download(m.htmlUrl, join(outDir, "global-settings.html"));
await download(m.screenshotUrl, join(outDir, "global-settings.png"));
console.log("Done:", outDir);

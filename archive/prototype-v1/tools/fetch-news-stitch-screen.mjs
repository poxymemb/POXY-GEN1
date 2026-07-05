/**
 * Download POXY Global News & Patch Notes from Stitch export metadata.
 * Usage: node tools/fetch-news-stitch-screen.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const metaPath = join(root, "stitch-export", "news-screens.json");
const outDir = join(root, "stitch-export", "news");

async function download(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

const meta = JSON.parse(readFileSync(metaPath, "utf8"));
const m = meta["global-news"];
mkdirSync(outDir, { recursive: true });
console.log("Downloading Global News screen…");
await download(m.htmlUrl, join(outDir, "global-news.html"));
await download(m.screenshotUrl, join(outDir, "global-news.png"));
console.log("Done:", outDir);

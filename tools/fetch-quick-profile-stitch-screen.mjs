/**
 * Download POXY Premium Quick Profile Modal from Stitch.
 * Usage: STITCH_API_KEY=... node tools/fetch-quick-profile-stitch-screen.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const metaPath = join(root, "stitch-export", "quick-profile-screens.json");
const outDir = join(root, "stitch-export", "quick-profile");

async function download(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

const meta = JSON.parse(readFileSync(metaPath, "utf8"));
const m = meta["quick-profile"];
mkdirSync(outDir, { recursive: true });
console.log("Downloading quick profile modal…");
await download(m.htmlUrl, join(outDir, "quick-profile.html"));
await download(m.screenshotUrl, join(outDir, "quick-profile.png"));
console.log("Done:", outDir);

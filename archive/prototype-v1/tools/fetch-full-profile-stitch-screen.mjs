/**
 * Download POXY Premium User Passport (Full Profile) from Stitch.
 * Usage: node tools/fetch-full-profile-stitch-screen.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const metaPath = join(root, "stitch-export", "full-profile-screens.json");
const outDir = join(root, "stitch-export", "full-profile");

async function download(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

const meta = JSON.parse(readFileSync(metaPath, "utf8"));
const m = meta["full-profile"];
mkdirSync(outDir, { recursive: true });
console.log("Downloading full profile passport…");
await download(m.htmlUrl, join(outDir, "full-profile.html"));
await download(m.screenshotUrl, join(outDir, "full-profile.png"));
console.log("Done:", outDir);

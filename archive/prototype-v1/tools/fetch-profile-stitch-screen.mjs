/**
 * Download POXY Refined Profile HUD from Stitch export metadata.
 * Usage: node tools/fetch-profile-stitch-screen.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const metaPath = join(root, "stitch-export", "profile-screens.json");
const outDir = join(root, "stitch-export", "profile");

async function download(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

const meta = JSON.parse(readFileSync(metaPath, "utf8"));
const m = meta["profile-hud"];
mkdirSync(outDir, { recursive: true });
console.log("Downloading profile HUD…");
await download(m.htmlUrl, join(outDir, "profile-hud.html"));
await download(m.screenshotUrl, join(outDir, "profile-hud.png"));
console.log("Done:", outDir);

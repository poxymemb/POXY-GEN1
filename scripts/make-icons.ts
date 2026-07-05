// One-off icon generator (02H): rasterizes the canonical star into the PWA
// icon set. Run from repo root:
//   deno run --allow-read --allow-write --allow-net scripts/make-icons.ts
// --allow-net fetches the resvg wasm binary only.

import { initWasm, Resvg } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";

const INK = "#1C1C1E";
const PAPER = "#F0F0F1";

const starMarkup = await Deno.readTextFile("apps/web/src/ui/brand/star.svg");
const starPath = starMarkup.match(/d="([^"]+)"/)![1];

await initWasm(fetch("https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm"));

/** Star centered on a square canvas. `starRatio` = star size / canvas. */
function iconSvg(size: number, bg: string, fg: string, starRatio: number): string {
  const star = size * starRatio;
  const off = (size - star) / 2;
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="${bg}"/>
    <path d="${starPath}" fill="${fg}"
      transform="translate(${off} ${off}) scale(${star / 100})"/>
  </svg>`;
}

function png(svg: string): Uint8Array {
  return new Resvg(svg).render().asPng();
}

const out = "apps/web/public";

// Maskable 192/512: ink ground, star inside the 80% safe zone (56% of edge).
await Deno.writeFile(`${out}/icon-192.png`, png(iconSvg(192, INK, PAPER, 0.56)));
await Deno.writeFile(`${out}/icon-512.png`, png(iconSvg(512, INK, PAPER, 0.56)));
// Apple touch 180: same composition; iOS applies its own corner mask.
await Deno.writeFile(`${out}/apple-touch-icon.png`, png(iconSvg(180, INK, PAPER, 0.62)));

// favicon.ico — a single 32px PNG wrapped in an ICO container (all modern
// browsers accept PNG-compressed ICO entries).
const fav = png(iconSvg(32, PAPER, INK, 0.84));
const ico = new Uint8Array(6 + 16 + fav.length);
const dv = new DataView(ico.buffer);
dv.setUint16(2, 1, true); // type: icon
dv.setUint16(4, 1, true); // count
ico[6] = 32; // width
ico[7] = 32; // height
ico[10] = 1; // planes (lo)
dv.setUint16(12, 32, true); // bpp
dv.setUint32(14, fav.length, true);
dv.setUint32(18, 22, true); // data offset
ico.set(fav, 22);
await Deno.writeFile(`${out}/favicon.ico`, ico);

console.log("icons written to", out);

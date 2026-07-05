// =============================================================================
// og-image — Still Water link previews (02H).
// Composes an SVG per template and rasterizes with resvg-wasm. No satori:
// direct SVG gives exact control over the plaque, star and pigment gem.
//
// GET /og-image?kind=figure&name=Katana&rarity=legendary&remaining=1203&run=2500
// GET /og-image?kind=opening&rarity=mythic&mint=142&run=2500
// GET /og-image?kind=museum&collector=Aiko&score=8412&owned=37
// GET /og-image?kind=passport&collector=Aiko&score=8412&season=Season%201
//        (passport renders the 9:16 story variant, 1080x1920)
//
// Deploy public (link scrapers send no auth): see docs/RUNBOOK.md.
// Cache-Control: 1h — previews may lag reality by an hour, acceptable.
// =============================================================================

import { initWasm, Resvg } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";

const WASM_URL = "https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm";

// ---------------------------------------------------------------- palette --
const PAPER = "#F0F0F1";
const INK = "#1C1C1E";
const DIM = "#6E6E73";
const HAIRLINE = "rgba(28,28,30,0.12)";

const PIGMENTS: Record<string, string> = {
  common: "#8A8F98",
  uncommon: "#7BA98F",
  rare: "#60C2E0",
  epic: "#456DB0",
  legendary: "#E0A23C",
  mythic: "#D9744F",
  secret: "#1C1C1E",
};

// Four-point star (the brand mark), path in a 100x100 box.
const STAR_PATH =
  "M50 0 C54 28 72 46 100 50 C72 54 54 72 50 100 C46 72 28 54 0 50 C28 46 46 28 50 0 Z";

// ------------------------------------------------------------------ utils --
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const num = (n: number) => n.toLocaleString("en-GB");

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function star(cx: number, cy: number, size: number, fill: string, opacity = 1): string {
  const s = size / 100;
  return `<path d="${STAR_PATH}" fill="${fill}" opacity="${opacity}"
    transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${s})"/>`;
}

function frame(w: number, h: number, inset = 40): string {
  return `<rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}"
    fill="none" stroke="${HAIRLINE}" stroke-width="2"/>`;
}

function ground(w: number, h: number): string {
  return `<rect width="${w}" height="${h}" fill="${PAPER}"/>`;
}

function plaque(cx: number, y: number, text: string, fontSize = 30): string {
  const w = text.length * fontSize * 0.62 + 72;
  return `
    <rect x="${cx - w / 2}" y="${y}" width="${w}" height="${fontSize * 2}" fill="${INK}" rx="3"/>
    <text x="${cx}" y="${y + fontSize * 1.34}" text-anchor="middle"
      font-family="JetBrains Mono" font-size="${fontSize}" fill="${PAPER}"
      letter-spacing="1">${esc(text)}</text>`;
}

function wordmark(cx: number, y: number, size = 24): string {
  return `<text x="${cx}" y="${y}" text-anchor="middle" font-family="Fraunces"
    font-size="${size}" letter-spacing="${size * 0.16}" fill="${DIM}">POXY WORLD</text>`;
}

// -------------------------------------------------------------- templates --

function figureCard(p: URLSearchParams): string {
  const name = p.get("name") ?? "POXY";
  const rarity = (p.get("rarity") ?? "common").toLowerCase();
  const remaining = Number(p.get("remaining") ?? 0);
  const run = Number(p.get("run") ?? 0);
  const gem = PIGMENTS[rarity] ?? PIGMENTS.common;
  const scarcity =
    remaining > 0 && run > 0
      ? `${num(remaining)} remaining \u00b7 run ${num(run)}`
      : run > 0
        ? `Run ${num(run)}`
        : "";

  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    ${ground(1200, 630)}
    ${frame(1200, 630)}
    ${star(600, 200, 120, INK, 0.9)}
    <circle cx="600" cy="316" r="10" fill="${gem}"/>
    <text x="600" y="408" text-anchor="middle" font-family="Fraunces"
      font-size="72" fill="${INK}">${esc(name)}</text>
    <text x="600" y="456" text-anchor="middle" font-family="Inter"
      font-size="26" fill="${DIM}">${esc(cap(rarity))}</text>
    ${scarcity ? `<text x="600" y="516" text-anchor="middle" font-family="JetBrains Mono" font-size="26" fill="${DIM}">${esc(scarcity)}</text>` : ""}
    ${wordmark(600, 574)}
  </svg>`;
}

function openingCard(p: URLSearchParams): string {
  const rarity = (p.get("rarity") ?? "common").toLowerCase();
  const mint = Number(p.get("mint") ?? 0);
  const run = Number(p.get("run") ?? 0);
  const gem = PIGMENTS[rarity] ?? PIGMENTS.common;
  const mintText =
    mint > 0 && run > 0 ? `\u2116 ${String(mint).padStart(4, "0")} / ${num(run)}` : "";

  // The seal's home: authenticity verdicts. A ring + star in seal red.
  const SEAL_RED = "#C24A55";

  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    ${ground(1200, 630)}
    ${frame(1200, 630)}
    <circle cx="600" cy="212" r="86" fill="none" stroke="${SEAL_RED}" stroke-width="5"/>
    ${star(600, 212, 88, SEAL_RED)}
    <text x="600" y="392" text-anchor="middle" font-family="Fraunces"
      font-size="60" fill="${INK}">Proven fair</text>
    <text x="600" y="440" text-anchor="middle" font-family="Inter"
      font-size="26" fill="${gem === PIGMENTS.common ? DIM : gem}">${esc(cap(rarity))}</text>
    ${mintText ? plaque(600, 470, mintText, 28) : ""}
    ${wordmark(600, 574)}
  </svg>`;
}

function museumCard(p: URLSearchParams): string {
  const collector = p.get("collector") ?? "A collector";
  const score = Number(p.get("score") ?? 0);
  const owned = Number(p.get("owned") ?? 0);

  // Pedestal row: three plinths with star silhouettes.
  const plinths = [430, 600, 770]
    .map(
      (x, i) => `
      <rect x="${x - 56}" y="300" width="112" height="${74 + (i === 1 ? 22 : 0)}"
        fill="rgba(28,28,30,0.05)" stroke="${HAIRLINE}"/>
      ${star(x, 258 - (i === 1 ? 22 : 0), 64, INK, i === 1 ? 0.9 : 0.55)}`,
    )
    .join("");

  return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    ${ground(1200, 630)}
    ${frame(1200, 630)}
    ${plinths}
    <text x="600" y="452" text-anchor="middle" font-family="Fraunces"
      font-size="48" fill="${INK}">${esc(collector)}'s museum</text>
    <text x="600" y="510" text-anchor="middle" font-family="JetBrains Mono"
      font-size="28" fill="${DIM}">Collector Score ${num(score)}${owned ? ` \u00b7 ${num(owned)} figures` : ""}</text>
    ${wordmark(600, 574)}
  </svg>`;
}

function passportStory(p: URLSearchParams): string {
  const collector = p.get("collector") ?? "A collector";
  const score = Number(p.get("score") ?? 0);
  const season = p.get("season") ?? "";

  return `<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
    ${ground(1080, 1920)}
    ${frame(1080, 1920, 56)}
    ${wordmark(540, 220, 30)}
    ${star(540, 760, 260, INK, 0.92)}
    <text x="540" y="1150" text-anchor="middle" font-family="Fraunces"
      font-size="84" fill="${INK}">${esc(collector)}</text>
    ${season ? `<text x="540" y="1224" text-anchor="middle" font-family="Inter" font-size="34" fill="${DIM}">${esc(season)}</text>` : ""}
    ${plaque(540, 1300, `Collector Score ${num(score)}`, 38)}
    <text x="540" y="1770" text-anchor="middle" font-family="Inter"
      font-size="28" fill="${DIM}">poxy.world</text>
  </svg>`;
}

// ------------------------------------------------------------------ serve --

let fontsPromise: Promise<Uint8Array[]> | null = null;
let wasmReady: Promise<void> | null = null;

function loadFonts(): Promise<Uint8Array[]> {
  fontsPromise ??= Promise.all(
    [
      "fonts/Fraunces-SemiBold.ttf",
      "fonts/Inter-Regular.ttf",
      "fonts/Inter-SemiBold.ttf",
      "fonts/JetBrainsMono-Medium.ttf",
    ].map(async (rel) => {
      const bytes = await Deno.readFile(new URL(rel, import.meta.url));
      return new Uint8Array(bytes);
    }),
  );
  return fontsPromise;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const p = new URL(req.url).searchParams;
    const kind = p.get("kind") ?? "figure";

    const svg =
      kind === "opening"
        ? openingCard(p)
        : kind === "museum"
          ? museumCard(p)
          : kind === "passport"
            ? passportStory(p)
            : figureCard(p);

    wasmReady ??= initWasm(fetch(WASM_URL));
    await wasmReady;
    const fontBuffers = await loadFonts();

    const resvg = new Resvg(svg, {
      font: { fontBuffers, defaultFontFamily: "Inter" },
      background: PAPER,
    });
    const png = resvg.render().asPng();

    return new Response(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("og-image", e);
    return new Response("og-image failed", { status: 500 });
  }
});

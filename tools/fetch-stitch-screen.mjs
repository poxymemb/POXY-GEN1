/**
 * Fetch Stitch screen HTML + screenshot via API key (see STITCH_SETUP.md).
 * Usage: STITCH_API_KEY=... node tools/fetch-stitch-screen.mjs <projectId> <screenId>
 */
import { request } from "https";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, "..");
const projectId = process.argv[2] || "3452513058897199540";
const screenId = process.argv[3] || "c7d591e793cd422f8d14ee9c38224f60";
const apiKey = process.env.STITCH_API_KEY;
if (!apiKey) {
  console.error("Set STITCH_API_KEY");
  process.exit(1);
}

function mcpCall(method, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
    const req = request(
      {
        hostname: "stitch.googleapis.com",
        path: "/mcp",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "X-Goog-Api-Key": apiKey,
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(new Error(raw.slice(0, 300)));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const run = (u, redirects = 0) => {
      const parsed = new URL(u);
      const lib = parsed.protocol === "https:" ? request : null;
      if (!lib) return reject(new Error("bad protocol"));
      lib(parsed, (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 5) {
          return run(res.headers.location, redirects + 1);
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          writeFileSync(dest, Buffer.concat(chunks));
          resolve(dest);
        });
      }).on("error", reject);
    };
    run(url);
  });
}

const outDir = join(root, "stitch-export");
mkdirSync(outDir, { recursive: true });

async function mcpWithRetry(method, params, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      return await mcpCall(method, params);
    } catch (e) {
      last = e;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw last;
}

let screenRes;
try {
  screenRes = await mcpWithRetry("tools/call", {
    name: "get_screen",
    arguments: {
      name: `projects/${projectId}/screens/${screenId}`,
      projectId,
      screenId,
    },
  });
} catch (e) {
  console.warn("MCP get_screen failed, use: npx @_davideast/stitch-mcp tool get_screen_code", e.message);
  process.exit(1);
}

const screen = screenRes?.result?.content?.[0]?.text
  ? JSON.parse(screenRes.result.content[0].text)
  : screenRes?.result?.structuredContent || screenRes?.result;

const codeRes = await mcpCall("tools/call", {
  name: "get_screen_code",
  arguments: { projectId, screenId },
});

let html =
  codeRes?.result?.content?.[0]?.text ||
  (codeRes?.result?.structuredContent?.htmlContent ?? "");
if (html.startsWith("{")) {
  try {
    html = JSON.parse(html).htmlContent || html;
  } catch (_) {}
}

writeFileSync(join(outDir, "dashboard-hub.html"), html, "utf8");
writeFileSync(
  join(outDir, "screen-meta.json"),
  JSON.stringify({ projectId, screenId, title: screen?.title, width: screen?.width, height: screen?.height }, null, 2)
);

if (screen?.screenshot?.downloadUrl) {
  await download(screen.screenshot.downloadUrl, join(outDir, "dashboard-hub-screenshot.png"));
  console.log("screenshot saved");
}
console.log("html bytes", html.length);
console.log("saved to stitch-export/");

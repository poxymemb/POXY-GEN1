/**
 * Cursor workaround: official Stitch tools/list payload can exceed Cursor's limit (~287KB).
 * Proxies stdio MCP to https://stitch.googleapis.com/mcp and strips outputSchema from tools/list.
 * Usage in .cursor/mcp.json — see STITCH_SETUP.md
 */
import { createInterface } from "readline";
import { request } from "https";

const API_KEY = process.env.STITCH_API_KEY;
const STITCH_URL = "https://stitch.googleapis.com/mcp";

if (!API_KEY) {
  process.stderr.write("STITCH_API_KEY env var is required\n");
  process.exit(1);
}

function postToStitch(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const parsed = new URL(STITCH_URL);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
        "X-Goog-Api-Key": API_KEY,
      },
    };
    const req = request(opts, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}\n${raw.slice(0, 200)}`));
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function stripOutputSchema(response) {
  if (!response?.result?.tools) return response;
  const tools = response.result.tools.map((t) => {
    const { outputSchema, ...rest } = t;
    return rest;
  });
  return { ...response, result: { ...response.result, tools } };
}

const rl = createInterface({ input: process.stdin, terminal: false });

rl.on("line", async (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  if (msg.id === undefined) {
    postToStitch(msg).catch((err) =>
      process.stderr.write(String(err) + "\n")
    );
    return;
  }
  try {
    let response = await postToStitch(msg);
    if (msg.method === "tools/list") {
      response = stripOutputSchema(response);
    }
    process.stdout.write(JSON.stringify(response) + "\n");
  } catch (err) {
    process.stdout.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: msg.id,
        error: { code: -32603, message: String(err.message || err) },
      }) + "\n"
    );
  }
});

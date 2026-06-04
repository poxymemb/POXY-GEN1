/**
 * Download Lumina Chatting OS reference from Stitch.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const metaPath = join(root, 'stitch-export', 'lumina-chat-screens.json');
const outDir = join(root, 'stitch-export', 'chat');

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
const m = meta['lumina-chat-os'];
mkdirSync(outDir, { recursive: true });
console.log('Downloading Lumina Chat OS reference…');
await download(m.screenshotUrl, join(outDir, 'lumina-chat-os.png'));
console.log('Done:', outDir);

import fs from 'node:fs';

const required = ['index.html', 'assets', 'vercel.json'];
const missing = required.filter((p) => !fs.existsSync(p));
if (missing.length) {
  console.error('[vercel-build] Missing required paths:', missing.join(', '));
  process.exit(1);
}
console.log('[vercel-build] Static POXY site verified — serving repo root.');

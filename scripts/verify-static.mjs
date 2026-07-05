// Vercel "build" for the transition period: the archived prototype-v1 stays
// the deployed product until apps/web reaches beta parity. This script only
// asserts the archive is intact; vercel.json serves archive/prototype-v1.
import fs from 'node:fs';

const required = [
  'archive/prototype-v1/index.html',
  'archive/prototype-v1/assets',
  'archive/prototype-v1/public/sw.js',
  'vercel.json',
];
const missing = required.filter((p) => !fs.existsSync(p));
if (missing.length) {
  console.error('[vercel-build] Missing required paths:', missing.join(', '));
  process.exit(1);
}
console.log('[vercel-build] Prototype archive verified — serving archive/prototype-v1.');

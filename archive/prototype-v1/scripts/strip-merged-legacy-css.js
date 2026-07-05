/**
 * Remove merged Stitch legacy blocks from Sky screen CSS files.
 * Blocks start with: /* ── merged legacy:
 */
const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, '..', 'assets', 'poxy-sky', 'screens');
const marker = '/* ── merged legacy:';

const files = fs.readdirSync(screensDir).filter((f) => f.endsWith('.css'));

files.forEach((file) => {
  const filePath = path.join(screensDir, file);
  let css = fs.readFileSync(filePath, 'utf8');
  const idx = css.indexOf(marker);
  if (idx === -1) {
    console.log('skip (no legacy):', file);
    return;
  }
  css = css.slice(0, idx).trimEnd() + '\n';
  fs.writeFileSync(filePath, css);
  console.log('stripped legacy from:', file);
});

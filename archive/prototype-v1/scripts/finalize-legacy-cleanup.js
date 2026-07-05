/**
 * Post–Stage 11: merge legacy page CSS into Sky screens, build runtime.css, prep deletes.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function appendMerge(targetRel, sourceRel, label) {
  const target = path.join(root, targetRel);
  const source = path.join(root, sourceRel);
  if (!fs.existsSync(source)) {
    console.warn('skip merge, missing:', sourceRel);
    return;
  }
  const block =
    '\n\n/* ── merged legacy: ' +
    label +
    ' ── */\n' +
    fs.readFileSync(source, 'utf8').trim() +
    '\n';
  fs.appendFileSync(target, block);
  console.log('merged', sourceRel, '→', targetRel);
}

const merges = [
  // Disabled — merged legacy CSS caused Stitch palette to override Sky screens.
  // Use scripts/strip-merged-legacy-css.js if legacy blocks reappear.
];

merges.forEach(([t, s, l]) => appendMerge(t, s, l));

// Secondary panels → dedicated screen css files
const secondary = [
  ['explore', 'assets/poxy-explore-page.css'],
  ['gens', 'assets/poxy-gens-page.css'],
  ['friends', 'assets/poxy-friends-page.css'],
  ['news', 'assets/poxy-news-page.css'],
];

secondary.forEach(([name, src]) => {
  const dest = path.join(root, 'assets/poxy-sky/screens', name + '.css');
  const header = '/* POXY Sky — ' + name + ' panel (from legacy page css) */\n';
  const body = fs.existsSync(path.join(root, src))
    ? fs.readFileSync(path.join(root, src), 'utf8').trim()
    : '';
  fs.writeFileSync(dest, header + body + '\n');
  console.log('wrote', 'assets/poxy-sky/screens/' + name + '.css');
});

// runtime.css from legacy-app-inline (strip Stitch pink token block + legacy font import)
const inlinePath = path.join(root, 'assets/poxy-sky/legacy-app-inline.css');
let runtime = fs.readFileSync(inlinePath, 'utf8');
runtime = runtime.replace(/@import url\('https:\/\/fonts\.googleapis\.com\/css2\?family=Syne[\s\S]*?display=swap'\);\s*/m, '');
runtime = runtime.replace(/\/\* ══ POXY Design System — Session C1 ══ \*\/\s*/, '/* POXY Sky runtime — functional layout (from legacy inline, tokens stripped) */\n');
runtime = runtime.replace(/:root\{[\s\S]*?\}\s*\/\* Typography[\s\S]*?font-family:var\(--font-mono\);\s*\}/m, '/* legacy :root tokens removed — use assets/poxy-sky/tokens.css */\n');

const runtimeOut = path.join(root, 'assets/poxy-sky/runtime.css');
fs.writeFileSync(
  runtimeOut,
  runtime.trim() +
    '\n\n/* Sky mode: neutralize legacy stitch body chrome */\nbody.poxy-sky-app-active.poxy-stitch-dash{background:var(--bg)!important;color:var(--text)!important}\nbody.poxy-sky-app-active.poxy-stitch-dash .page{background:transparent!important;color:inherit!important}\n'
);
console.log('wrote assets/poxy-sky/runtime.css');

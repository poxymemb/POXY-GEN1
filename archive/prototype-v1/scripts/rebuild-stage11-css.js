/**
 * Stage 11 — Sky CSS for collections, community, messenger, events, quests, levels.
 */
const fs = require('fs');
const path = require('path');

const mock = fs.readFileSync(path.join(__dirname, '../design/v2/poxy-dashboard.html'), 'utf8');
const cssMatch = mock.match(/<style>([\s\S]*?)<\/style>/);
if (!cssMatch) throw new Error('mockup style not found');
const mockStyle = cssMatch[1];

function extractRule(selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(esc + '\\{([^}]+)\\}', 'm');
  const m = mockStyle.match(re);
  if (m) return selector + '{' + m[1].trim() + '}';
  const reNested = new RegExp(esc + '\\{([\\s\\S]*?)\\n  \\}', 'm');
  const m2 = mockStyle.match(reNested);
  return m2 ? selector + '{' + m2[1].trim() + '}' : '';
}

function scopeCss(css, scope) {
  return css
    .replace(/^(\s*)(\.[\w#][^{]*)\{/gm, (m, indent, sel) => {
      const t = sel.trim();
      if (t.startsWith('@')) return m;
      return indent + scope + ' ' + t + '{';
    })
    .replace(/\}(\s*)(\.[\w#][^{]*)\{/g, '}$1' + scope + ' $2{');
}

const SCREENS = [
  {
    file: 'collections-overview.css',
    scope: 'body.poxy-sky-app-active #stPanelTierList',
    blocks: [
      '.page-head',
      '.panel-h',
      '.col-section',
      '.col-sec-h',
      '.col-grid',
      '.col-card',
      '.col-banner',
      '.col-banner-frogs',
      '.col-status',
      '.col-body',
      '.col-top',
      '.col-season',
      '.col-tag',
      '.col-stats',
      '.col-prog',
      '.col-btn',
      '.rarity-explain',
      '.rx-axis',
    ],
    manual: `
body.poxy-sky-app-active #stPanelTierList {
  background: transparent !important;
}
body.poxy-sky-app-active #stPanelTierList .rarity-page-header {
  display: none !important;
}
body.poxy-sky-app-active #stPanelTierList .rarity-tier-card {
  background: var(--card) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--r-lg) !important;
  box-shadow: var(--shadow) !important;
  color: var(--text) !important;
}
body.poxy-sky-app-active #stPanelTierList .rarity-lb-panel {
  background: var(--card) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--r-lg) !important;
  box-shadow: var(--shadow) !important;
}
body.poxy-sky-app-active #stPanelTierList .rarity-lb-tab {
  font-family: var(--px-font) !important;
}
body.poxy-sky-app-active #stPanelTierList .rarity-lb-tab.active {
  background: var(--sky-500) !important;
  color: #fff !important;
}
`,
  },
  {
    file: 'community.css',
    scope: 'body.poxy-sky-app-active #stPanelClub',
    blocks: [
      '.page-head',
      '.comm-layout',
      '.comm-tabs',
      '.comm-tab',
      '.feed',
      '.post',
      '.post-head',
      '.post-av',
      '.post-who',
      '.post-name',
      '.post-time',
      '.post-text',
      '.post-actions',
      '.pa',
      '.comm-side',
      '.comm-side-card',
      '.comm-search-box',
      '.cs-item',
      '.cs-av',
      '.cs-mid',
      '.cs-name',
      '.cs-followers',
      '.cs-join',
      '.verified',
    ],
    manual: `
body.poxy-sky-app-active.dark-club #stPanelClub,
body.poxy-sky-app-active #stPanelClub {
  background: transparent !important;
}
body.poxy-sky-app-active #stPanelClub .club-page,
body.poxy-sky-app-active #stPanelClub #clubPage {
  background: transparent !important;
  color: var(--text) !important;
}
body.poxy-sky-app-active #stPanelClub .club-topbar,
body.poxy-sky-app-active #stPanelClub .poxy-club-glass {
  background: var(--card) !important;
  border-color: var(--border) !important;
  box-shadow: var(--shadow) !important;
  color: var(--text) !important;
}
body.poxy-sky-app-active #stPanelClub .club-nav-btn.active {
  background: var(--sky-500) !important;
  color: #fff !important;
}
`,
  },
  {
    file: 'messenger.css',
    scope: 'body.poxy-sky-app-active #stPanelMessenger',
    blocks: [
      '.page-head',
      '.msg-wrap',
      '.msg-side',
      '.msg-side-head',
      '.msg-new',
      '.chat-list',
      '.chat-item',
      '.chat-av',
      '.chat-online',
      '.chat-mid',
      '.chat-top',
      '.chat-name',
      '.chat-time',
      '.chat-last',
      '.chat-unread',
      '.msg-main',
      '.msg-main-head',
      '.msg-body',
      '.bubble',
      '.msg-compose',
      '.msg-attach',
      '.msg-input',
      '.msg-send',
    ],
    manual: `
body.poxy-sky-app-active #stPanelMessenger {
  background: transparent !important;
}
body.poxy-sky-app-active #stPanelMessenger .px-sky-msg-open {
  margin-top: 16px;
}
`,
  },
  {
    file: 'events.css',
    scope: 'body.poxy-sky-app-active #stPanelEvents',
    blocks: [
      '.page-head',
      '.panel-h',
      '.ev-sec',
      '.ev-grid',
      '.ev-card',
      '.ev-banner',
      '.ev-status',
      '.ev-body',
      '.ev-org',
      '.ev-org-name',
      '.verified',
      '.ev-open',
      '.back-row',
      '.back-btn',
    ],
    manual: `
body.poxy-sky-app-active #stPanelEvents {
  background: transparent !important;
}
`,
  },
  {
    file: 'quests.css',
    scope: 'body.poxy-sky-app-active #stPanelQuests',
    blocks: [
      '.page-head',
      '.quest-group',
      '.qg-head',
      '.qg-count',
      '.quest-list',
      '.quest',
      '.q-check',
      '.q-txt',
      '.q-title',
      '.q-desc',
      '.q-reward',
      '.coin-sm',
    ],
    manual: `
body.poxy-sky-app-active #stPanelQuests {
  background: transparent !important;
}
body.poxy-sky-app-active #stPanelQuests .quest .q-reward.is-ready {
  background: var(--sky-500) !important;
  color: #fff !important;
  border-color: var(--sky-500) !important;
  cursor: pointer;
}
`,
  },
  {
    file: 'levels.css',
    scope: 'body.poxy-sky-app-active #stPanelRanks',
    blocks: [
      '.page-head',
      '.lvl-head',
      '.lvl-big',
      '.lvl-head-txt',
      '.lvl-tabs',
      '.lvl-tab',
      '.lvl-track',
      '.lvl-node',
      '.lvl-num',
      '.lvl-info',
      '.lvl-name',
      '.lvl-reward',
      '.lvl-coins',
      '.lvl-claim',
      '.coin-sm',
      '.leaderboard',
      '.lb-row',
      '.lb-rank',
      '.lb-av',
      '.lb-name',
      '.lb-score',
    ],
    manual: `
body.poxy-sky-app-active #stPanelRanks {
  background: transparent !important;
}
body.poxy-sky-app-active #stPanelRanks .ranks-hero {
  display: none !important;
}
body.poxy-sky-app-active #stPanelRanks .ranks-list-heading {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-faint);
}
body.poxy-sky-app-active #stPanelRanks .ranks-podium-wrap {
  margin-top: 8px;
}
body.poxy-sky-app-active #stPanelRanks .lb-toggle-btn.active {
  background: var(--sky-500) !important;
  color: #fff !important;
}
`,
  },
];

const outDir = path.join(__dirname, '../assets/poxy-sky/screens');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

SCREENS.forEach((cfg) => {
  const extracted = cfg.blocks.map(extractRule).filter(Boolean).join('\n');
  const header = `/* POXY Sky Stage 11 — ${cfg.file} from poxy-dashboard.html */\n`;
  fs.writeFileSync(
    path.join(outDir, cfg.file),
    header + cfg.manual + scopeCss(extracted, cfg.scope) + '\n'
  );
  console.log('assets/poxy-sky/screens/' + cfg.file + ' built');
});

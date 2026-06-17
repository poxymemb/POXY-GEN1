/**
 * POXY Sky Stage 11 — collections, community, messenger, events, quests, levels.
 */
(function (global) {
  'use strict';

  var COIN_SVG =
    '<span class="coin-sm" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="20" fill="url(#pxSt11Coin)"/><circle cx="24" cy="24" r="20" stroke="#8BE3FF" stroke-width="2.5"/><circle cx="24" cy="24" r="14" stroke="#0E3A48" stroke-width="2" stroke-opacity="0.45"/><path d="M24 14 L24 34 M18.5 19 Q24 14.5 29.5 19 M18.5 29 Q24 33.5 29.5 29" stroke="#0E3A48" stroke-width="3" stroke-linecap="round" stroke-opacity="0.8"/><defs><radialGradient id="pxSt11Coin" cx="0.4" cy="0.32" r="0.85"><stop offset="0" stop-color="#A6E9FF"/><stop offset="0.55" stop-color="#60C2E0"/><stop offset="1" stop-color="#2E9CC0"/></radialGradient></defs></svg></span>';

  var QUEST_LABELS = {
    open_3_cases: { title: 'Open 3 boxes', desc: 'Keep the streak going today' },
    burn_5_commons: { title: 'Sell 5 commons for coins', desc: 'Clear shelf space and earn dust' },
    list_1_market: { title: 'List on the market', desc: 'Put a figure up for sale' },
    send_chat: { title: 'Send a message', desc: 'Say hi in messages' },
  };

  var EVENTS = [
    {
      id: 'open1000',
      color: '#E0563A',
      status: 'Live now',
      statusColor: '#3DBE8B',
      title: 'Community Box Rush',
      body: 'Open boxes together. The community goal is 1,000 boxes opened. The top openers take the rewards.',
    },
    {
      id: 'season2',
      color: '#E5C84F',
      status: 'Upcoming',
      statusColor: '#E0A23C',
      title: 'Season 02 Launch Party',
      body: 'The Tokens collection goes live. Join the launch and get an early-bird figure.',
    },
    {
      id: 'genesis',
      color: '#60C2E0',
      status: 'Ended',
      statusColor: '#8A8F98',
      title: 'Genesis Drop',
      body: 'The very first POXY drop. Where it all started.',
    },
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function isSky() {
    return document.body.classList.contains('poxy-sky-app-active');
  }

  function ensurePageHead(parent, key, title, subtitle) {
    if (!parent) return;
    var head = parent.querySelector('.px-sky-page-head[data-sky-key="' + key + '"]');
    if (!head) {
      head = document.createElement('div');
      head.className = 'px-sky-page-head page-head';
      head.dataset.skyKey = key;
      head.innerHTML = '<h1></h1><p></p>';
      parent.insertBefore(head, parent.firstChild);
    }
    head.querySelector('h1').textContent = title;
    head.querySelector('p').textContent = subtitle;
  }

  function levelTitle(lvl) {
    var n = Number(lvl) || 1;
    if (n >= 15) return 'Legend';
    if (n >= 10) return 'Master';
    if (n >= 7) return 'Expert';
    if (n >= 4) return 'Collector';
    return 'Newcomer';
  }

  /* ── Collections (tierlist rail) ── */
  function ensureCollectionsOverview() {
    var panel = $('stPanelTierList');
    if (!panel || $('pxSkyColOverview')) return;
    var wrap = document.createElement('div');
    wrap.id = 'pxSkyColOverview';
    wrap.innerHTML =
      '<div class="col-section"><div class="col-sec-h">Current</div><div class="col-grid">' +
      '<button type="button" class="col-card" style="--acc:#E0566A"><div class="col-banner"><span class="col-status" style="--sc:#3DBE8B">Live now</span></div>' +
      '<div class="col-body"><div class="col-top"><h3>Hearts</h3><span class="col-season">Season 01</span></div>' +
      '<p class="col-tag">The first drop. Six symbols, fourteen mutations each.</p>' +
      '<div class="col-stats"><span>6 items</span><span>·</span><span>100 each</span></div>' +
      '<span class="col-btn">Explore drop →</span></div></button></div></div>' +
      '<div class="panel-h" style="margin-top:8px">Rarity system</div>';
    var root = $('rarityPageRoot');
    if (root) root.insertBefore(wrap, root.firstChild);
    else panel.insertBefore(wrap, panel.firstChild);
  }

  var PoxyCollectionsSky = {
    onShow: function () {
      if (!isSky()) return;
      var panel = $('stPanelTierList');
      ensurePageHead(
        panel,
        'collections',
        'Collections',
        'Every drop, past and upcoming. Explore how rarity works across the ecosystem.'
      );
      ensureCollectionsOverview();
    },
  };

  /* ── Community (club rail) ── */
  var PoxyCommunitySky = {
    onShow: function () {
      if (!isSky()) return;
      var panel = $('stPanelClub');
      ensurePageHead(
        panel,
        'community',
        'Community',
        'Club feed, VIP lounge, and collector intel. Your circle inside POXY.'
      );
    },
  };

  /* ── Messenger ── */
  function ensureMessengerShell() {
    var panel = $('stPanelMessenger');
    if (!panel || $('pxSkyMessengerRoot')) return;
    panel.innerHTML =
      '<div class="px-sky-page-head page-head" data-sky-key="messenger"><h1>Messages</h1><p>Chats, channels, and groups. Send trades, gifts, and figures.</p></div>' +
      '<div id="pxSkyMessengerRoot">' +
      '<div class="msg-wrap">' +
      '<div class="msg-side"><div class="msg-side-head"><h3>Chats</h3><button type="button" class="msg-new" id="pxSkyMsgNew" aria-label="New chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></div>' +
      '<div class="chat-list" id="pxSkyChatList">' +
      '<button type="button" class="chat-item active"><div class="chat-av" style="--ac:#60C2E0">P</div><div class="chat-mid"><div class="chat-top"><span class="chat-name">POXY News</span><span class="chat-time">now</span></div><div class="chat-last">Season updates and drops</div></div></button>' +
      '</div></div>' +
      '<div class="msg-main"><div class="msg-main-head"><div class="chat-av" style="--ac:#60C2E0">P</div><div><div class="mmh-name">POXY News</div><div class="mmh-status">official</div></div></div>' +
      '<div class="msg-body"><div class="bubble them">Welcome to POXY messages. Open the full app to chat, trade, and gift.</div></div>' +
      '<div class="msg-compose"><input class="msg-input" placeholder="Open messages to reply" disabled></div></div></div>' +
      '<button type="button" class="btn btn-primary px-sky-msg-open" id="pxSkyOpenLumina">Open messages app</button></div>';
    var openBtn = $('pxSkyOpenLumina');
    var newBtn = $('pxSkyMsgNew');
    var open = function () {
      if (typeof global.openLuminaOS === 'function') global.openLuminaOS(null, 'messages');
      else if (typeof global.showToast === 'function') global.showToast('Messages app loading…');
    };
    if (openBtn) openBtn.addEventListener('click', open);
    if (newBtn) newBtn.addEventListener('click', open);
    var list = $('pxSkyChatList');
    if (list) list.addEventListener('click', open);
  }

  var PoxyMessengerSky = {
    onShow: function () {
      if (!isSky()) return;
      ensureMessengerShell();
    },
  };

  /* ── Events ── */
  function eventCard(ev) {
    return (
      '<button type="button" class="ev-card" style="--evc:' +
      ev.color +
      '" data-ev="' +
      ev.id +
      '"><div class="ev-banner"><span class="ev-status" style="--sc:' +
      ev.statusColor +
      '">' +
      ev.status +
      '</span></div><div class="ev-body"><div class="ev-org"><span class="ev-org-name">POXY Dev Team</span><span class="verified">✓</span></div>' +
      '<h3>' +
      ev.title +
      '</h3><p>' +
      ev.body +
      '</p><span class="ev-open">View event →</span></div></button>'
    );
  }

  function ensureEventsShell() {
    var panel = $('stPanelEvents');
    if (!panel || $('pxSkyEventsRoot')) return;
    var live = EVENTS.filter(function (e) {
      return e.status === 'Live now';
    });
    var upcoming = EVENTS.filter(function (e) {
      return e.status === 'Upcoming';
    });
    var past = EVENTS.filter(function (e) {
      return e.status === 'Ended';
    });
    panel.innerHTML =
      '<div class="px-sky-page-head page-head" data-sky-key="events"><h1>Events</h1><p>Community goals, launches, and history. Tap an event to see details.</p></div>' +
      '<div id="pxSkyEventsRoot">' +
      (live.length
        ? '<div class="ev-sec"><div class="panel-h">Happening now</div><div class="ev-grid">' +
          live.map(eventCard).join('') +
          '</div></div>'
        : '') +
      (upcoming.length
        ? '<div class="ev-sec"><div class="panel-h">Upcoming</div><div class="ev-grid">' +
          upcoming.map(eventCard).join('') +
          '</div></div>'
        : '') +
      (past.length
        ? '<div class="ev-sec"><div class="panel-h">Past events</div><div class="ev-grid">' +
          past.map(eventCard).join('') +
          '</div></div>'
        : '') +
      '</div>';
    panel.querySelectorAll('.ev-card').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (typeof global.showToast === 'function') {
          global.showToast('Event details coming soon.');
        }
      });
    });
  }

  var PoxyEventsSky = {
    onShow: function () {
      if (!isSky()) return;
      ensureEventsShell();
    },
  };

  /* ── Quests ── */
  function renderQuestRows(quests, root) {
    if (!root) return;
    if (!quests || !quests.length) {
      root.innerHTML =
        '<div class="quest-group"><div class="qg-head"><h3>Today</h3></div><p style="color:var(--text-dim);font-size:14px">No quests loaded yet.</p></div>';
      return;
    }
    var done = quests.filter(function (q) {
      return q.claimed || q.progress >= q.goal;
    }).length;
    root.innerHTML =
      '<div class="quest-group"><div class="qg-head"><h3>Daily directives</h3><span class="qg-count">' +
      done +
      '/' +
      quests.length +
      '</span></div><div class="quest-list" id="pxSkyQuestList"></div></div>';
    var list = $('pxSkyQuestList');
    if (!list) return;
    quests.forEach(function (q) {
      var meta = QUEST_LABELS[q.quest_key] || { title: q.quest_key, desc: 'Complete this task' };
      var pct = Math.min(100, Math.round((q.progress / q.goal) * 100));
      var claimed = !!q.claimed;
      var ready = q.progress >= q.goal && !claimed;
      var row = document.createElement('div');
      row.className = 'quest' + (claimed || ready ? ' done' : '');
      var reward = document.createElement('button');
      reward.type = 'button';
      reward.className =
        'q-reward' + (claimed ? ' claimed' : ready ? ' is-ready' : '');
      if (claimed) reward.textContent = 'Claimed';
      else if (ready) {
        reward.textContent = 'Claim';
        reward.addEventListener('click', function () {
          if (typeof global.claimQuestReward === 'function') global.claimQuestReward(q.id);
        });
      } else reward.innerHTML = COIN_SVG + String(q.reward || 50);
      row.innerHTML =
        '<span class="q-check' +
        (claimed || ready ? ' done' : '') +
        '">' +
        (claimed || ready ? '✓' : '') +
        '</span><div class="q-txt"><div class="q-title">' +
        meta.title +
        '</div><div class="q-desc">' +
        meta.desc +
        ' · ' +
        pct +
        '%</div></div>';
      row.appendChild(reward);
      list.appendChild(row);
    });
  }

  function ensureQuestsShell() {
    var panel = $('stPanelQuests');
    if (!panel) return;
    if (!$('pxSkyQuestsRoot')) {
      panel.innerHTML =
        '<div class="px-sky-page-head page-head" data-sky-key="quests"><h1>Quests</h1><p>Complete tasks, earn coins, and level up your account.</p></div>' +
        '<div id="pxSkyQuestsRoot"></div>';
    }
    var quests = global.dailyQuests || [];
    renderQuestRows(quests, $('pxSkyQuestsRoot'));
    if (typeof global.loadDailyQuests === 'function' && global.currentUser) {
      global.loadDailyQuests();
    }
  }

  var PoxyQuestsSky = {
    onShow: function () {
      if (!isSky()) return;
      ensureQuestsShell();
    },
    syncFromDaily: function (quests) {
      if (!isSky()) return;
      renderQuestRows(quests || global.dailyQuests || [], $('pxSkyQuestsRoot'));
    },
  };

  /* ── Levels (ranks rail) ── */
  function syncLevelHead() {
    var panel = $('stPanelRanks');
    if (!panel) return;
    var lvl =
      (global.playerEconomy && global.playerEconomy.xp_level) ||
      (global.currentProfile && global.currentProfile.xp_level) ||
      1;
    var progress = Math.max(
      0,
      Math.min(1, parseFloat((global.playerEconomy && global.playerEconomy.xp_progress) || 0.64))
    );
    var head = $('pxSkyLvlHead');
    if (!head) {
      head = document.createElement('div');
      head.id = 'pxSkyLvlHead';
      head.className = 'lvl-head';
      var main = panel.querySelector('.st-main') || panel;
      main.insertBefore(head, main.firstChild);
    }
    head.innerHTML =
      '<div class="lvl-big">' +
      lvl +
      '</div><div class="lvl-head-txt"><div class="lh-name">Level ' +
      lvl +
      ' · ' +
      levelTitle(lvl) +
      '</div><div class="lh-bar"><i style="width:' +
      Math.round(progress * 100) +
      '%"></i></div><div class="lh-xp">Keep collecting and opening to climb</div></div>';
  }

  var PoxyLevelsSky = {
    onShow: function () {
      if (!isSky()) return;
      var panel = $('stPanelRanks');
      ensurePageHead(
        panel,
        'levels',
        'Levels',
        'Grow your account by collecting, opening, and taking part. Global ranks below.'
      );
      syncLevelHead();
    },
  };

  /* ── Hooks ── */
  function wrapLoadDailyQuests() {
    if (typeof global.loadDailyQuests !== 'function' || global.loadDailyQuests._pxSkyWrapped) return;
    var orig = global.loadDailyQuests;
    global.loadDailyQuests = async function () {
      await orig.apply(this, arguments);
      PoxyQuestsSky.syncFromDaily(global.dailyQuests);
    };
    global.loadDailyQuests._pxSkyWrapped = true;
  }

  function init() {
    wrapLoadDailyQuests();
  }

  global.PoxyCollectionsSky = PoxyCollectionsSky;
  global.PoxyCommunitySky = PoxyCommunitySky;
  global.PoxyMessengerSky = PoxyMessengerSky;
  global.PoxyEventsSky = PoxyEventsSky;
  global.PoxyQuestsSky = PoxyQuestsSky;
  global.PoxyLevelsSky = PoxyLevelsSky;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);

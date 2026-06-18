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

  var FROG_BANNER =
    '<div class="col-banner-frogs">' +
    '<div class="frog" style="--c1:var(--acc);--c2:var(--acc);--belly:#c0344d"><div class="fb"></div><div class="fe l"></div><div class="fe r"></div><div class="fm"></div></div>' +
    '<div class="frog" style="--c1:#60C2E0;--c2:#3A90B0;--belly:#c0344d"><div class="fb"></div><div class="fe l"></div><div class="fe r"></div><div class="fm"></div></div>' +
    '<div class="frog" style="--c1:#E5C84F;--c2:#C0A52F;--belly:#c0344d"><div class="fb"></div><div class="fe l"></div><div class="fe r"></div><div class="fm"></div></div>' +
    '</div>';

  var LEVEL_NODES = [
    { n: 1, name: 'Newcomer', reward: 'Welcome bonus', coins: 50 },
    { n: 2, name: 'Collector', reward: 'Coin pack', coins: 80 },
    { n: 3, name: 'Trader', reward: 'Profile colour unlock' },
    { n: 4, name: 'Curator', reward: 'Coin pack', coins: 120 },
    { n: 5, name: 'Enthusiast', reward: 'Banner: Sky Wave' },
    { n: 6, name: 'Veteran', reward: 'Coin pack', coins: 200 },
    { n: 7, name: 'Expert', reward: 'Animated avatar slot' },
    { n: 8, name: 'Master', reward: 'Coin pack', coins: 300 },
    { n: 9, name: 'Legend', reward: 'Exclusive figure' },
    { n: 10, name: 'POXY Elite', reward: 'Elite badge + big bonus', coins: 500 },
  ];

  function colCard(opts) {
    var prog = opts.prog
      ? '<div class="col-prog"><i style="width:' + opts.prog + '%"></i></div>'
      : '';
    return (
      '<button type="button" class="col-card" style="--acc:' +
      opts.acc +
      '"><div class="col-banner">' +
      FROG_BANNER +
      '<span class="col-status" style="--sc:' +
      opts.statusColor +
      '">' +
      opts.status +
      '</span></div><div class="col-body"><div class="col-top"><h3>' +
      opts.title +
      '</h3><span class="col-season">' +
      opts.season +
      '</span></div><p class="col-tag">' +
      opts.tag +
      '</p><div class="col-stats">' +
      opts.stats +
      '</div>' +
      prog +
      '<span class="col-btn">' +
      opts.cta +
      '</span></div></button>'
    );
  }

  function frogMini(c1, c2) {
    return (
      '<div class="frog" style="--c1:' +
      c1 +
      ';--c2:' +
      c2 +
      ';--belly:#c0344d"><div class="fb"></div><div class="fe l"></div><div class="fe r"></div><div class="fm"></div></div>'
    );
  }

  function itemCard(name) {
    return (
      '<button type="button" class="item-card" data-col-item="' +
      name +
      '"><div class="item-frame">' +
      frogMini('#E0566A', '#B03048') +
      '</div><div class="item-meta"><div class="item-name">' +
      name +
      '</div><div class="item-sub">14 mutations · 100 minted</div></div></button>'
    );
  }

  var COL_HEARTS_ITEMS = ['Heart', 'Star', 'Drop', 'Bolt', 'Moon', 'Crown'];

  function colView(id) {
    return $('pxSkyCol' + id);
  }

  function showColView(which) {
    ['Overview', 'Detail', 'Item'].forEach(function (v) {
      var el = colView(v);
      if (el) el.hidden = v !== which;
    });
    var main = $('pxSkyMain');
    if (main) main.scrollTop = 0;
    try {
      window.scrollTo(0, 0);
    } catch (e) {}
  }

  function showColOverview() {
    showColView('Overview');
    var panel = $('stPanelTierList');
    if (panel) {
      ensurePageHead(
        panel,
        'collections',
        'Collections',
        'Every drop, past and upcoming. Tap one to explore its items and rarity.'
      );
    }
  }

  function showColDetail() {
    showColView('Detail');
    var panel = $('stPanelTierList');
    if (panel) {
      ensurePageHead(
        panel,
        'collections',
        'Hearts · Season 01',
        'Six symbols, each with its own mutations. Tap an item to see the full rarity system.'
      );
    }
  }

  function showColItem(name) {
    showColView('Item');
    var panel = $('stPanelTierList');
    var title = name || 'Heart';
    if (panel) {
      ensurePageHead(
        panel,
        'collections',
        title,
        'The signature symbol of Season 01. Fourteen mutations, one hundred minted, three rarity axes stacked on every copy.'
      );
    }
    var h2 = $('pxSkyColItemTitle');
    if (h2) h2.textContent = title;
  }

  /* ── Collections (tierlist rail) ── */
  function ensureCollectionsOverview() {
    var panel = $('stPanelTierList');
    if (!panel || $('pxSkyColRoot')) return;
    var root = document.createElement('div');
    root.id = 'pxSkyColRoot';
    root.innerHTML =
      '<div id="pxSkyColOverview">' +
      '<div class="col-section"><div class="col-sec-h">Current</div><div class="col-grid">' +
      colCard({
        acc: '#E0566A',
        status: 'Live now',
        statusColor: '#3DBE8B',
        title: 'Hearts',
        season: 'Season 01',
        tag: 'The first drop. Six symbols, fourteen mutations each.',
        stats: '<span>6 items</span><span>·</span><span>100 each</span><span>·</span><span>63 minted</span>',
        prog: 63,
        cta: 'Explore drop →',
      }) +
      '</div></div>' +
      '<div class="col-section"><div class="col-sec-h">Upcoming</div><div class="col-grid">' +
      colCard({
        acc: '#E5C84F',
        status: 'Coming soon',
        statusColor: '#E0A23C',
        title: 'Tokens',
        season: 'Season 02',
        tag: 'Coming next. Coins, gems, and lucky charms.',
        stats: '<span>6 items</span><span>·</span><span>100 each</span>',
        cta: 'Preview →',
      }) +
      '</div></div>' +
      '<div class="col-section"><div class="col-sec-h">Past</div><div class="col-grid">' +
      colCard({
        acc: '#60C2E0',
        status: 'Completed',
        statusColor: '#8A8F98',
        title: 'Beginnings',
        season: 'Season 00',
        tag: 'The genesis set. Where POXY started.',
        stats: '<span>4 items</span><span>·</span><span>50 each</span><span>·</span><span>50 minted</span>',
        cta: 'View archive →',
      }) +
      '</div></div></div>' +
      '<div id="pxSkyColDetail" hidden><div class="back-row"><button type="button" class="back-btn" id="pxSkyColBackOverview">← All collections</button></div>' +
      '<div class="panel-h">How rarity works</div>' +
      '<div class="rarity-explain">' +
      '<div class="rx-axis"><div class="rx-n">1</div><h4>Mutation</h4><p>The look of the item. Each symbol has its own named mutations with their own drop rates.</p></div>' +
      '<div class="rx-axis"><div class="rx-n">2</div><h4>Number</h4><p>Your mint number out of the total. Low numbers and pretty patterns are worth more.</p></div>' +
      '<div class="rx-axis"><div class="rx-n">3</div><h4>Background</h4><p>The frame and glow behind the item. A system-wide scale, shared across every collection.</p></div>' +
      '</div><div class="panel-h">Items in this drop</div>' +
      '<div class="items-grid">' +
      COL_HEARTS_ITEMS.map(itemCard).join('') +
      '</div></div>' +
      '<div id="pxSkyColItem" hidden><div class="back-row"><button type="button" class="back-btn" id="pxSkyColBackDetail">← Hearts</button></div>' +
      '<div class="item-detail-head"><div class="idh-frame">' +
      frogMini('#E0566A', '#B03048') +
      '</div><div class="idh-txt"><h2 id="pxSkyColItemTitle">Heart</h2><p>The signature symbol of Season 01. Fourteen mutations, one hundred minted, three rarity axes stacked on every copy.</p></div></div>' +
      '<div class="axis-block"><div class="ab-h"><h3>1 · Mutation</h3><span>the look, with its own drop rate</span></div>' +
      '<div class="mut-grid">' +
      '<div class="mut-chip"><div class="mut-swatch">' +
      frogMini('#E0566A', '#B03048') +
      '</div><div class="mut-info"><span class="mut-name">Classic Red</span><span class="mut-rate">30.0%</span></div></div>' +
      '<div class="mut-chip"><div class="mut-swatch">' +
      frogMini('#60C2E0', '#3A90B0') +
      '</div><div class="mut-info"><span class="mut-name">Blue Sky Poxy</span><span class="mut-rate">10.0%</span></div></div>' +
      '<div class="mut-chip"><div class="mut-swatch">' +
      frogMini('#E5C84F', '#C0A52F') +
      '</div><div class="mut-info"><span class="mut-name">Golden Heart</span><span class="mut-rate">5.0%</span></div></div>' +
      '</div></div></div>';
    var mount = $('rarityPageRoot');
    if (mount) mount.insertBefore(root, mount.firstChild);
    else panel.insertBefore(root, panel.firstChild);

    var overview = $('pxSkyColOverview');
    if (overview) {
      overview.querySelectorAll('.col-card').forEach(function (btn, idx) {
        btn.addEventListener('click', function () {
          if (idx === 0) showColDetail();
          else if (typeof global.showToast === 'function') {
            global.showToast(idx === 1 ? 'Tokens preview opens at launch.' : 'Beginnings archive is read-only.');
          }
        });
      });
    }
    var backOverview = $('pxSkyColBackOverview');
    if (backOverview) backOverview.addEventListener('click', showColOverview);
    var backDetail = $('pxSkyColBackDetail');
    if (backDetail) backDetail.addEventListener('click', showColDetail);
    root.querySelectorAll('[data-col-item]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showColItem(btn.getAttribute('data-col-item'));
      });
    });
  }

  var PoxyCollectionsSky = {
    onShow: function () {
      if (!isSky()) return;
      ensureCollectionsOverview();
      showColOverview();
    },
  };

  /* ── Community (club rail) ── */
  var SHARE_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>';

  var COMM_POSTS = [
    {
      commId: 'poxydev',
      color: '#60C2E0',
      initial: 'P',
      name: 'POXY Dev Team',
      time: '2h',
      text: "Season 02 Tokens is almost here. Six new symbols, fresh mutations, and a launch event with an early-bird figure for everyone online. Get ready.",
      likes: '1.2k',
      reposts: '340',
    },
    {
      commId: 'collectors',
      color: '#9B8FE0',
      initial: 'C',
      name: 'Collectors Club',
      time: '5h',
      text: 'Showcase of the week: someone pulled Full BW Chained Heart on number #1 with a Dark Blood Red background. One of the rarest combos possible. Congrats to the lucky collector.',
      likes: '864',
      reposts: '210',
      liked: true,
      saved: true,
    },
    {
      commId: 'rarehunt',
      color: '#E0A23C',
      initial: 'R',
      name: 'Rare Hunters',
      time: '1d',
      text: 'Reminder: low numbers AND pretty numbers both carry a rarity bonus. A #11 beats a #47 even on the same mutation. Hunt smart.',
      likes: '512',
      reposts: '98',
    },
    {
      commId: 'poxydev',
      color: '#60C2E0',
      initial: 'P',
      name: 'POXY Dev Team',
      time: '2d',
      text: 'The Community Box Rush is live. Help open 1,000 boxes together and the top players take the rewards. Every box you open counts.',
      likes: '945',
      reposts: '187',
    },
  ];

  var COMM_PROFILES = {
    poxydev: {
      banner: '#60C2E0',
      color: '#60C2E0',
      initial: 'P',
      name: 'POXY Dev Team',
      handle: '@poxydev · 24.1k followers',
      desc: 'Official updates from the team building POXY WORLD. Announcements, seasons, and behind the scenes.',
      channels: [
        { label: 'Discord', handle: 'discord.gg/poxy' },
        { label: 'X / Twitter', handle: '@poxyworld' },
        { label: 'Telegram', handle: 't.me/poxyworld' },
      ],
      posts: ['poxydev', 'poxydev'],
    },
    collectors: {
      banner: '#9B8FE0',
      color: '#9B8FE0',
      initial: 'C',
      name: 'Collectors Club',
      handle: '@collectors · 12.8k followers',
      desc: 'The biggest player-run community. Trades, showcases, and rarity talk.',
      channels: [
        { label: 'Discord', handle: 'discord.gg/collectors' },
        { label: 'X / Twitter', handle: '@poxycollect' },
      ],
      posts: ['collectors'],
    },
    rarehunt: {
      banner: '#E0A23C',
      color: '#E0A23C',
      initial: 'R',
      name: 'Rare Hunters',
      handle: '@rarehunt · 7.3k followers',
      desc: 'For the people chasing the lowest numbers and the rarest mutations.',
      channels: [{ label: 'Discord', handle: 'discord.gg/rarehunt' }],
      posts: ['rarehunt'],
    },
  };

  function communityPost(opts) {
    var likeCls = opts.liked ? ' liked' : '';
    var saveCls = opts.saved ? ' saved' : '';
    var likeFill = opts.liked ? ' fill="#E0566A"' : ' fill="none"';
    var saveFill = opts.saved ? ' fill="currentColor"' : ' fill="none"';
    return (
      '<div class="post" data-comm="' +
      opts.commId +
      '"><button type="button" class="post-head" data-comm-open="' +
      opts.commId +
      '"><span class="post-av" style="--ac:' +
      opts.color +
      '">' +
      opts.initial +
      '</span><div class="post-who"><span class="post-name">' +
      opts.name +
      '<span class="verified">✓</span></span><span class="post-time">' +
      opts.time +
      '</span></div></button><div class="post-text">' +
      opts.text +
      '</div><div class="post-actions">' +
      '<button type="button" class="pa like' +
      likeCls +
      '"><svg viewBox="0 0 24 24"' +
      likeFill +
      ' stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg><span>' +
      opts.likes +
      '</span></button>' +
      '<button type="button" class="pa repost"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg><span>' +
      opts.reposts +
      '</span></button>' +
      '<button type="button" class="pa save' +
      saveCls +
      '"><svg viewBox="0 0 24 24"' +
      saveFill +
      ' stroke="currentColor" stroke-width="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg><span>Save</span></button>' +
      '<button type="button" class="pa share">' +
      SHARE_SVG +
      '<span>Share</span></button></div></div>'
    );
  }

  function postByCommId(commId, index) {
    var matches = COMM_POSTS.filter(function (p) {
      return p.commId === commId;
    });
    return matches[index || 0] || COMM_POSTS[0];
  }

  function commSideItem(id, color, initial, name, followers) {
    return (
      '<button type="button" class="cs-item" data-comm-open="' +
      id +
      '"><span class="cs-av" style="--ac:' +
      color +
      '">' +
      initial +
      '</span><span class="cs-mid"><span class="cs-name">' +
      name +
      '<span class="verified">✓</span></span><span class="cs-followers">' +
      followers +
      '</span></span><span class="cs-join">Follow</span></button>'
    );
  }

  function buildCommProfilePage(id) {
    var p = COMM_PROFILES[id];
    if (!p) return '';
    var channels = p.channels
      .map(function (ch) {
        return (
          '<button type="button" class="cp-channel"><span class="cp-ch-ic">↗</span>' +
          ch.label +
          '<span class="cp-ch-handle">' +
          ch.handle +
          '</span></button>'
        );
      })
      .join('');
    var posts = p.posts
      .map(function (commId, idx) {
        return communityPost(postByCommId(commId, idx));
      })
      .join('');
    return (
      '<div class="cp-banner" style="--cpc:' +
      p.banner +
      '"></div><div class="cp-head"><span class="cp-av" style="--ac:' +
      p.color +
      '">' +
      p.initial +
      '</span><div class="cp-info"><h1 class="cp-name">' +
      p.name +
      '<span class="verified big">✓</span></h1><div class="cp-meta">' +
      p.handle +
      '</div></div><button type="button" class="cp-follow">Follow</button></div>' +
      '<p class="cp-desc">' +
      p.desc +
      '</p><div class="panel-h">Channels & links</div><div class="cp-channels">' +
      channels +
      '</div><div class="panel-h" style="margin-top:22px">Latest posts</div><div class="cp-feed">' +
      posts +
      '</div>'
    );
  }

  function showCommFeed() {
    var feed = $('pxSkyCommFeed');
    var detail = $('pxSkyCommDetail');
    if (feed) feed.hidden = false;
    if (detail) detail.hidden = true;
    var panel = $('stPanelClub');
    if (panel) {
      ensurePageHead(
        panel,
        'community',
        'Community',
        'Posts from verified channels. Like, save, repost, and share.'
      );
    }
    scrollCommTop();
  }

  function showCommDetail(id) {
    var feed = $('pxSkyCommFeed');
    var detail = $('pxSkyCommDetail');
    var content = $('pxSkyCommDetailContent');
    if (!detail || !content) return;
    if (feed) feed.hidden = true;
    detail.hidden = false;
    content.innerHTML = buildCommProfilePage(id);
    bindCommunityActions(content);
    var p = COMM_PROFILES[id];
    if (p) setCommHead(p.name, p.handle);
    scrollCommTop();
  }

  function setCommHead(title, sub) {
    var panel = $('stPanelClub');
    if (!panel) return;
    var head = panel.querySelector('.px-sky-page-head');
    if (!head) return;
    var h1 = head.querySelector('h1');
    var p = head.querySelector('p');
    if (h1) h1.textContent = title;
    if (p) p.textContent = sub;
  }

  function scrollCommTop() {
    var main = $('pxSkyMain');
    if (main) main.scrollTop = 0;
    try {
      window.scrollTo(0, 0);
    } catch (e) {}
  }

  function toggleCommLike(btn) {
    var liked = btn.classList.toggle('liked');
    var svg = btn.querySelector('svg');
    if (svg) svg.setAttribute('fill', liked ? '#E0566A' : 'none');
  }

  function toggleCommSave(btn) {
    var saved = btn.classList.toggle('saved');
    var svg = btn.querySelector('svg');
    if (svg) svg.setAttribute('fill', saved ? 'currentColor' : 'none');
  }

  function bumpCommRepost(btn) {
    btn.style.color = 'var(--sky-700)';
    setTimeout(function () {
      btn.style.color = '';
    }, 400);
  }

  function showCommShare() {
    if (typeof global.showToast === 'function') {
      global.showToast('Share: copy link · send to chat · share externally');
    }
  }

  function bindCommunityActions(root) {
    if (!root) return;
    root.querySelectorAll('[data-comm-open]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        showCommDetail(btn.getAttribute('data-comm-open'));
      });
    });
    root.querySelectorAll('.pa.like').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleCommLike(btn);
      });
    });
    root.querySelectorAll('.pa.save').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleCommSave(btn);
      });
    });
    root.querySelectorAll('.pa.repost').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        bumpCommRepost(btn);
      });
    });
    root.querySelectorAll('.pa.share').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        showCommShare();
      });
    });
    root.querySelectorAll('.cp-follow, .cs-join').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (typeof global.showToast === 'function') {
          global.showToast('Follow saved for this channel.');
        }
      });
    });
    root.querySelectorAll('.cp-channel').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (typeof global.showToast === 'function') {
          global.showToast('External links open in a future update.');
        }
      });
    });
  }

  function ensureCommunityShell() {
    var panel = $('stPanelClub');
    if (!panel || $('pxSkyCommunityRoot')) return;
    var shell = document.createElement('div');
    shell.id = 'pxSkyCommunityRoot';
    shell.innerHTML =
      '<div id="pxSkyCommFeed"><div class="comm-layout"><div>' +
      '<div class="comm-tabs">' +
      '<button type="button" class="comm-tab on" data-comm-tab="rec">Recommended</button>' +
      '<button type="button" class="comm-tab" data-comm-tab="follow">Following</button>' +
      '</div><div class="feed" id="pxSkyCommFeedList">' +
      COMM_POSTS.map(communityPost).join('') +
      '</div></div>' +
      '<aside class="comm-side"><div class="comm-side-card"><h4>Find a community</h4>' +
      '<div class="comm-search-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>' +
      '<input type="search" placeholder="Search communities" id="pxSkyCommSearch" aria-label="Search communities"></div>' +
      commSideItem('poxydev', '#60C2E0', 'P', 'POXY Dev Team', '24.1k followers') +
      commSideItem('collectors', '#9B8FE0', 'C', 'Collectors Club', '12.8k followers') +
      commSideItem('rarehunt', '#E0A23C', 'R', 'Rare Hunters', '7.3k followers') +
      '</div></aside></div></div>' +
      '<div id="pxSkyCommDetail" hidden><div class="back-row"><button type="button" class="back-btn" id="pxSkyCommBack">← Community</button></div>' +
      '<div id="pxSkyCommDetailContent"></div></div>';
    panel.insertBefore(shell, panel.firstChild);

    $('pxSkyCommBack').addEventListener('click', showCommFeed);
    shell.querySelectorAll('.comm-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        shell.querySelectorAll('.comm-tab').forEach(function (t) {
          t.classList.toggle('on', t === tab);
        });
        if (tab.dataset.commTab === 'follow' && typeof global.showToast === 'function') {
          global.showToast('Following feed shows channels you follow.');
        }
      });
    });
    var search = $('pxSkyCommSearch');
    if (search) {
      search.addEventListener('input', function () {
        var q = search.value.trim().toLowerCase();
        shell.querySelectorAll('.cs-item').forEach(function (item) {
          var name = item.querySelector('.cs-name');
          item.hidden = !!(q && name && name.textContent.toLowerCase().indexOf(q) === -1);
        });
      });
    }
    bindCommunityActions(shell);
  }

  var PoxyCommunitySky = {
    onShow: function () {
      if (!isSky()) return;
      ensureCommunityShell();
      showCommFeed();
    },
  };

  /* ── Messenger ── */
  var MSG_SEND_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>';

  var SKY_CHATS = [
    {
      id: 'slava',
      color: '#60C2E0',
      initial: 'S',
      name: 'Slava',
      time: '2m',
      last: 'Sent you a trade offer',
      unread: 2,
      online: true,
      status: 'online',
      placeholder: 'Message Slava',
      messages: [
        { who: 'them', text: 'Hey, you around? Got a trade idea' },
        { who: 'them', text: 'I want your Golden Heart #11', time: '14:02' },
        { who: 'me', text: 'Maybe! What are you offering?', time: '14:03' },
        { who: 'them', text: 'Two figures: Frost Heart and Royal. Fair?', time: '14:03' },
        { who: 'me', text: "Send the trade, I'll look", time: '14:04' },
      ],
    },
    {
      id: 'news',
      color: '#E0A23C',
      initial: 'P',
      name: 'POXY News',
      time: '1h',
      last: 'Season 02 is coming soon!',
      status: 'official',
      placeholder: 'Message POXY News',
      messages: [
        { who: 'them', text: 'Season 02 Tokens is almost here.' },
        { who: 'them', text: 'Six new symbols, fresh mutations, and a launch event with an early-bird figure.', time: '11:20' },
      ],
    },
    {
      id: 'collectors',
      color: '#9B8FE0',
      initial: 'C',
      name: 'Collectors Club',
      time: '3h',
      last: 'alex: anyone got Golden Heart?',
      unread: 5,
      status: 'group · 12.8k members',
      placeholder: 'Message Collectors Club',
      messages: [
        { who: 'them', text: 'alex: anyone got Golden Heart?' },
        { who: 'them', text: 'nova: I have #47, not selling yet', time: '09:14' },
      ],
    },
    {
      id: 'mira',
      color: '#7BE0A0',
      initial: 'M',
      name: 'Mira',
      time: '1d',
      last: 'Thanks for the gift!',
      online: true,
      status: 'online',
      placeholder: 'Message Mira',
      messages: [
        { who: 'them', text: 'Thanks for the gift!' },
        { who: 'me', text: 'Enjoy it!', time: '18:22' },
      ],
    },
    {
      id: 'tradehub',
      color: '#8BCFE4',
      initial: 'T',
      name: 'Trade Hub',
      time: '2d',
      last: 'New listings you might like',
      status: 'group · 3.4k members',
      placeholder: 'Message Trade Hub',
      messages: [{ who: 'them', text: 'New listings you might like. Tap Market to browse.' }],
    },
  ];

  var MSG_SEARCH_PEOPLE = [
    { color: '#60C2E0', initial: 'S', name: 'Slava', handle: '@slava', online: true, chatId: 'slava' },
    { color: '#7BE0A0', initial: 'M', name: 'Mira', handle: '@mira_k', online: true, chatId: 'mira' },
    { color: '#9B8FE0', initial: 'A', name: 'Alex P', handle: '@alex_p', chatId: 'slava' },
    { color: '#E5C84F', initial: 'N', name: 'Nova', handle: '@nova', chatId: 'mira' },
  ];

  var MSG_SEARCH_GROUPS = [
    { color: '#9B8FE0', initial: 'C', name: 'Collectors Club', handle: '@collectors · 12.8k members', verified: true, chatId: 'collectors' },
    { color: '#8BCFE4', initial: 'T', name: 'Trade Hub', handle: '@tradehub · 3.4k members', chatId: 'tradehub' },
    { color: '#E0A23C', initial: 'R', name: 'Rare Hunters', handle: '@rarehunt · 7.3k members', verified: true, chatId: 'collectors' },
  ];

  function chatById(id) {
    for (var i = 0; i < SKY_CHATS.length; i++) {
      if (SKY_CHATS[i].id === id) return SKY_CHATS[i];
    }
    return SKY_CHATS[0];
  }

  function chatListItem(chat, active) {
    var online = chat.online
      ? '<span class="chat-online" aria-hidden="true"></span>'
      : '';
    var unread = chat.unread
      ? '<span class="chat-unread">' + chat.unread + '</span>'
      : '';
    return (
      '<button type="button" class="chat-item' +
      (active ? ' active' : '') +
      '" data-chat-id="' +
      chat.id +
      '"><div class="chat-av" style="--ac:' +
      chat.color +
      '">' +
      chat.initial +
      online +
      '</div><div class="chat-mid"><div class="chat-top"><span class="chat-name">' +
      chat.name +
      '</span><span class="chat-time">' +
      chat.time +
      '</span></div><div class="chat-last">' +
      chat.last +
      '</div></div>' +
      unread +
      '</button>'
    );
  }

  function bubbleHtml(msg) {
    var time = msg.time ? '<div class="bt">' + msg.time + '</div>' : '';
    return (
      '<div class="bubble ' +
      msg.who +
      '">' +
      msg.text +
      time +
      '</div>'
    );
  }

  function renderChatBody(chat) {
    return chat.messages.map(bubbleHtml).join('');
  }

  function searchResultItem(opts) {
    var online = opts.online ? '<span class="sr-online" aria-hidden="true"></span>' : '';
    var verified = opts.verified ? '<span class="verified">✓</span>' : '';
    var groupCls = opts.group ? ' group' : '';
    return (
      '<button type="button" class="sr-item" data-chat-id="' +
      opts.chatId +
      '"><span class="sr-av' +
      groupCls +
      '" style="--ac:' +
      opts.color +
      '">' +
      opts.initial +
      online +
      '</span><span class="sr-mid"><span class="sr-name">' +
      opts.name +
      verified +
      '</span><span class="sr-handle">' +
      opts.handle +
      '</span></span><span class="sr-action">' +
      (opts.group ? 'Join' : 'Message') +
      '</span></button>'
    );
  }

  function buildSearchResults() {
    var people = MSG_SEARCH_PEOPLE.map(searchResultItem).join('');
    var groups = MSG_SEARCH_GROUPS.map(function (g) {
      return searchResultItem({
        color: g.color,
        initial: g.initial,
        name: g.name,
        handle: g.handle,
        verified: g.verified,
        chatId: g.chatId,
        group: true,
      });
    }).join('');
    return (
      '<div class="sr-group-h">People</div>' +
      people +
      '<div class="sr-group-h">Public groups</div>' +
      groups
    );
  }

  function openSkyChat(id) {
    var chat = chatById(id);
    var list = $('pxSkyChatList');
    if (list) {
      list.querySelectorAll('.chat-item').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.chatId === id);
      });
    }
    var headAv = $('pxSkyMsgHeadAv');
    if (headAv) {
      headAv.style.setProperty('--ac', chat.color);
      headAv.textContent = chat.initial;
    }
    var headName = $('pxSkyMsgHeadName');
    if (headName) headName.textContent = chat.name;
    var headStatus = $('pxSkyMsgHeadStatus');
    if (headStatus) headStatus.textContent = chat.status;
    var body = $('pxSkyMsgBody');
    if (body) body.innerHTML = renderChatBody(chat);
    var input = $('pxSkyMsgInput');
    if (input) {
      input.placeholder = chat.placeholder;
      input.value = '';
    }
    var results = $('pxSkyMsgResults');
    var search = $('pxSkyMsgSearch');
    if (results) results.classList.remove('show');
    if (search) search.value = '';
    if (list) list.style.display = '';
  }

  function bindMessengerUi(root) {
    if (!root) return;
    root.querySelectorAll('[data-chat-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openSkyChat(btn.dataset.chatId);
      });
    });
    var search = $('pxSkyMsgSearch');
    var list = $('pxSkyChatList');
    var results = $('pxSkyMsgResults');
    if (search && list && results) {
      search.addEventListener('input', function () {
        var has = search.value.trim().length > 0;
        results.classList.toggle('show', has);
        list.style.display = has ? 'none' : '';
      });
    }
    var attachBtn = $('pxSkyMsgAttach');
    var attachMenu = $('pxSkyMsgAttachMenu');
    if (attachBtn && attachMenu) {
      attachBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        attachMenu.classList.toggle('open');
      });
      document.addEventListener('click', function (e) {
        if (!attachMenu.classList.contains('open')) return;
        if (attachMenu.contains(e.target) || attachBtn.contains(e.target)) return;
        attachMenu.classList.remove('open');
      });
    }
    root.querySelectorAll('.attach-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        attachMenu.classList.remove('open');
        if (typeof global.showToast === 'function') {
          global.showToast('Attachments open in the full messenger.');
        }
      });
    });
    var sendBtn = $('pxSkyMsgSend');
    var input = $('pxSkyMsgInput');
    if (sendBtn && input) {
      sendBtn.addEventListener('click', function () {
        var text = input.value.trim();
        if (!text) return;
        var body = $('pxSkyMsgBody');
        if (body) {
          body.insertAdjacentHTML('beforeend', bubbleHtml({ who: 'me', text: text, time: 'now' }));
          body.scrollTop = body.scrollHeight;
        }
        input.value = '';
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendBtn.click();
        }
      });
    }
    var newBtn = $('pxSkyMsgNew');
    if (newBtn) {
      newBtn.addEventListener('click', function () {
        if (typeof global.showToast === 'function') {
          global.showToast('Start a chat from search or a profile.');
        }
      });
    }
  }

  function ensureMessengerShell() {
    var panel = $('stPanelMessenger');
    if (!panel || $('pxSkyMessengerRoot')) return;
    panel.innerHTML =
      '<div class="px-sky-page-head page-head" data-sky-key="messenger"><h1>Messages</h1><p>Chats, channels, and groups. Send trades, gifts, and figures.</p></div>' +
      '<div id="pxSkyMessengerRoot"><div class="msg-wrap">' +
      '<div class="msg-side"><div class="msg-side-head"><h3>Chats</h3><button type="button" class="msg-new" id="pxSkyMsgNew" aria-label="New chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></div>' +
      '<div class="msg-search"><div class="msg-search-bar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>' +
      '<input type="search" id="pxSkyMsgSearch" placeholder="Search @username or public groups" aria-label="Search chats"></div></div>' +
      '<div class="msg-results" id="pxSkyMsgResults">' +
      buildSearchResults() +
      '</div>' +
      '<div class="chat-list" id="pxSkyChatList">' +
      SKY_CHATS.map(function (c, i) {
        return chatListItem(c, i === 0);
      }).join('') +
      '</div></div>' +
      '<div class="msg-main"><div class="msg-main-head"><div class="chat-av" id="pxSkyMsgHeadAv" style="--ac:#60C2E0">S</div><div><div class="mmh-name" id="pxSkyMsgHeadName">Slava</div><div class="mmh-status" id="pxSkyMsgHeadStatus">online</div></div></div>' +
      '<div class="msg-body" id="pxSkyMsgBody">' +
      renderChatBody(SKY_CHATS[0]) +
      '</div><div class="msg-compose"><div class="msg-attach-wrap">' +
      '<button type="button" class="msg-attach" id="pxSkyMsgAttach" aria-label="Attach"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12l-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a1.5 1.5 0 0 1-2-2l8-8"/></svg></button>' +
      '<div class="attach-menu" id="pxSkyMsgAttachMenu">' +
      '<button type="button" class="attach-opt"><span class="ao-ic">🖼</span>Photo or GIF</button>' +
      '<button type="button" class="attach-opt"><span class="ao-ic">⇄</span>Send a trade</button>' +
      '<button type="button" class="attach-opt"><span class="ao-ic">🎁</span>Send a gift</button>' +
      '<button type="button" class="attach-opt"><span class="ao-ic">📦</span>Gift a case</button>' +
      '<button type="button" class="attach-opt"><span class="ao-ic">★</span>Gift a subscription</button>' +
      '</div></div><input class="msg-input" id="pxSkyMsgInput" placeholder="Message Slava" autocomplete="off">' +
      '<button type="button" class="msg-send" id="pxSkyMsgSend" aria-label="Send">' +
      MSG_SEND_SVG +
      '</button></div></div></div></div>';
    bindMessengerUi(panel);
    openSkyChat('slava');
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

  /* ── Levels (levels rail) ── */
  function playerLevel() {
    return (
      (global.playerEconomy && global.playerEconomy.xp_level) ||
      (global.currentProfile && global.currentProfile.xp_level) ||
      1
    );
  }

  function playerXpProgress() {
    return Math.max(
      0,
      Math.min(1, parseFloat((global.playerEconomy && global.playerEconomy.xp_progress) || 0))
    );
  }

  function levelNodeRow(node, currentLvl) {
    var state = 'locked';
    if (node.n < currentLvl) state = 'claimed';
    else if (node.n === currentLvl) state = 'ready';
    var reward = node.reward;
    if (node.coins) {
      reward +=
        ' <span class="lvl-coins">' + COIN_SVG + String(node.coins) + '</span>';
    }
    var claim =
      state === 'claimed'
        ? '<span class="lvl-claim claimed">Claimed</span>'
        : state === 'ready'
          ? '<button type="button" class="lvl-claim ready">Claim</button>'
          : '<span class="lvl-claim locked">Locked</span>';
    return (
      '<div class="lvl-node' +
      (state === 'claimed' ? ' done' : '') +
      '"><span class="lvl-num">' +
      node.n +
      '</span><div class="lvl-info"><div class="lvl-name">' +
      node.name +
      '</div><div class="lvl-reward">' +
      reward +
      '</div></div>' +
      claim +
      '</div>'
    );
  }

  function bindLevelTabs(panel) {
    var mainBtn = panel.querySelector('#pxSkyLvlTabMain');
    var passBtn = panel.querySelector('#pxSkyLvlTabPass');
    var main = $('pxSkyLvlMain');
    var pass = $('pxSkyLvlPass');
    if (!mainBtn || !passBtn || !main || !pass) return;
    var setTab = function (which) {
      var onMain = which === 'main';
      mainBtn.classList.toggle('on', onMain);
      passBtn.classList.toggle('on', !onMain);
      main.hidden = !onMain;
      pass.hidden = onMain;
    };
    mainBtn.addEventListener('click', function () {
      setTab('main');
    });
    passBtn.addEventListener('click', function () {
      setTab('pass');
    });
  }

  function ensureLevelsShell() {
    var panel = $('stPanelLevels');
    if (!panel || $('pxSkyLevelsRoot')) return;
    var lvl = playerLevel();
    var progress = playerXpProgress();
    var track = LEVEL_NODES.map(function (n) {
      return levelNodeRow(n, lvl);
    }).join('');
    panel.innerHTML =
      '<div class="px-sky-page-head page-head" data-sky-key="levels"><h1>Levels</h1><p>Grow your account by collecting, opening, and taking part. Claim rewards as you climb.</p></div>' +
      '<div id="pxSkyLevelsRoot">' +
      '<div class="lvl-head" id="pxSkyLvlHead"><div class="lvl-big" id="pxSkyLvlBig">' +
      lvl +
      '</div><div class="lvl-head-txt"><div class="lh-name" id="pxSkyLvlName">Level ' +
      lvl +
      ' · ' +
      levelTitle(lvl) +
      '</div><div class="lh-bar"><i id="pxSkyLvlBar" style="width:' +
      Math.round(progress * 100) +
      '%"></i></div><div class="lh-xp" id="pxSkyLvlXp">Keep collecting and opening to climb</div></div></div>' +
      '<div class="lvl-tabs"><button type="button" class="lvl-tab on" id="pxSkyLvlTabMain">Account</button>' +
      '<button type="button" class="lvl-tab pass" id="pxSkyLvlTabPass">POXY PASS</button></div>' +
      '<div id="pxSkyLvlMain"><div class="lvl-track" id="pxSkyLvlTrack">' +
      track +
      '</div></div>' +
      '<div id="pxSkyLvlPass" hidden><div class="pass-banner"><span class="pb-ic">★</span>' +
      '<div class="pb-txt"><div class="t">POXY PASS</div><div class="d">A separate reward track with exclusive figures, boxes, and coins.</div></div>' +
      '<button type="button" class="btn btn-primary">Get the Pass</button></div></div></div>';
    bindLevelTabs(panel);
    panel.querySelectorAll('.lvl-claim.ready').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (typeof global.showToast === 'function') {
          global.showToast('Level rewards sync with your account soon.');
        }
      });
    });
  }

  function syncLevelsHead() {
    var lvl = playerLevel();
    var progress = playerXpProgress();
    var big = $('pxSkyLvlBig');
    var name = $('pxSkyLvlName');
    var bar = $('pxSkyLvlBar');
    if (big) big.textContent = String(lvl);
    if (name) name.textContent = 'Level ' + lvl + ' · ' + levelTitle(lvl);
    if (bar) bar.style.width = Math.round(progress * 100) + '%';
    var track = $('pxSkyLvlTrack');
    if (track) {
      track.innerHTML = LEVEL_NODES.map(function (n) {
        return levelNodeRow(n, lvl);
      }).join('');
    }
  }

  var PoxyLevelsSky = {
    onShow: function () {
      if (!isSky()) return;
      ensureLevelsShell();
      syncLevelsHead();
    },
    sync: function () {
      if (!isSky()) return;
      if (!$('pxSkyLevelsRoot')) ensureLevelsShell();
      syncLevelsHead();
    },
  };

  /* ── Hooks ── */
  function wrapLoadDailyQuests() {
    if (typeof global.loadDailyQuests !== 'function' || global.loadDailyQuests._pxSkyWrapped) return;
    var orig = global.loadDailyQuests;
    global.loadDailyQuests = async function () {
      await orig.apply(this, arguments);
      PoxyQuestsSky.syncFromDaily(global.dailyQuests);
      if (isSky()) syncLevelsHead();
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

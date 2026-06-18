/**
 * POXY Sky notification inbox — mail-panel dropdown (preserves notify hooks).
 */
(function (global) {
  'use strict';

  var NOTIFY_LS = 'poxy_notify_queue_v1';
  var skyFilter = 'all';
  var tabsReady = false;

  function $(id) {
    return document.getElementById(id);
  }

  function isSky() {
    return document.body.classList.contains('poxy-sky-app-active');
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function dotColor(type, text) {
    if (type === 'trade_request') return '#60C2E0';
    if (type === 'gift_received' || (text && text.indexOf('Gift') !== -1)) return '#7BE0A0';
    if (text && text.indexOf('Season') !== -1) return '#E0A23C';
    if (text && text.indexOf('Welcome') !== -1) return '#9B8FE0';
    return '#8A8F98';
  }

  function activityDescFromTitle(titleText) {
    var t = (titleText || '').toLowerCase();
    if (t.indexOf('gift') !== -1) return 'Tap Gifts to open';
    if (t.indexOf('trade') !== -1) return 'Review the offer details';
    if (t.indexOf('season') !== -1) return 'Read the announcement';
    return 'Activity on your account';
  }

  function positionSkyInbox() {
    var bell = $('stNavNotify');
    var drawer = document.querySelector('.poxy-notify-drawer');
    if (!bell || !drawer) return;
    var rect = bell.getBoundingClientRect();
    drawer.style.top = Math.round(rect.bottom + 8) + 'px';
    drawer.style.right = Math.max(12, Math.round(window.innerWidth - rect.right)) + 'px';
  }

  function ensureSkyFoot() {
    var drawer = document.querySelector('.poxy-notify-drawer');
    if (!drawer || drawer.querySelector('.px-sky-mail-foot')) return;
    var foot = document.createElement('div');
    foot.className = 'px-sky-mail-foot';
    foot.innerHTML =
      '<button type="button" id="pxSkyMarkAllRead">Mark all as read</button>';
    drawer.appendChild(foot);
    var btn = $('pxSkyMarkAllRead');
    if (btn) {
      btn.addEventListener('click', function () {
        markAllRead();
      });
    }
  }

  function ensureSkyTabs() {
    if (tabsReady) return;
    var tablist = document.querySelector('.poxy-notify-tabs');
    if (!tablist) return;
    tabsReady = true;
    tablist.innerHTML =
      '<button type="button" class="poxy-notify-tab active px-sky-mh-tab" data-sky-filter="all">All</button>' +
      '<button type="button" class="poxy-notify-tab px-sky-mh-tab" data-sky-filter="trades">Trades</button>' +
      '<button type="button" class="poxy-notify-tab px-sky-mh-tab" data-sky-filter="gifts">Gifts</button>';
    tablist.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-sky-filter]');
      if (!btn) return;
      setSkyNotifyFilter(btn.getAttribute('data-sky-filter') || 'all');
    });
  }

  function setSkyNotifyFilter(filter) {
    skyFilter = filter || 'all';
    document.querySelectorAll('.px-sky-mh-tab').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-sky-filter') === skyFilter);
    });
    if (skyFilter === 'gifts') {
      if (typeof global.switchNotifyTab === 'function') global.switchNotifyTab('gifts');
    } else {
      if (typeof global.switchNotifyTab === 'function') global.switchNotifyTab('activity');
      applySkyNotifyFilter();
    }
  }

  function applySkyNotifyFilter() {
    var list = $('notifyActivityList');
    if (!list) return;
    list.querySelectorAll('.px-sky-mail-item').forEach(function (row) {
      var kind = row.getAttribute('data-sky-kind') || 'activity';
      var show = skyFilter === 'all' || (skyFilter === 'trades' && kind === 'trade');
      row.hidden = !show;
    });
    var empty = $('notifyActivityEmpty');
    if (empty) {
      var visible = list.querySelectorAll('.px-sky-mail-item:not([hidden])').length;
      empty.hidden = visible > 0;
    }
  }

  function enhanceSkyMailList() {
    if (!isSky()) return;
    var list = $('notifyActivityList');
    if (!list) return;

    list.querySelectorAll('.poxy-notify-activity-item').forEach(function (el) {
      if (el.dataset.skyMail === '1') return;
      el.dataset.skyMail = '1';
      el.classList.add('px-sky-mail-item');
      el.setAttribute('data-sky-kind', 'activity');
      var timeEl = el.querySelector('time');
      var timeText = timeEl ? timeEl.textContent : '';
      var titleText = (el.textContent || '').replace(timeText, '').trim();
      var color = dotColor('', titleText);
      el.innerHTML =
        '<span class="px-sky-mail-dot" style="background:' +
        color +
        '"></span>' +
        '<div class="px-sky-mail-body"><div class="px-sky-mail-title">' +
        esc(titleText) +
        '</div><div class="px-sky-mail-desc">' +
        esc(activityDescFromTitle(titleText)) +
        '</div></div>' +
        '<span class="px-sky-mail-time">' +
        esc(timeText) +
        '</span>';
    });

    list.querySelectorAll('.poxy-notify-trade-card').forEach(function (card) {
      if (card.dataset.skyMail === '1') return;
      card.dataset.skyMail = '1';
      card.classList.add('px-sky-mail-item');
      card.setAttribute('data-sky-kind', 'trade');
      if (!card.querySelector('.px-sky-mail-dot')) {
        var dot = document.createElement('span');
        dot.className = 'px-sky-mail-dot';
        dot.style.background = '#60C2E0';
        card.insertBefore(dot, card.firstChild);
      }
      var timeEl = card.querySelector('time');
      if (timeEl) {
        timeEl.classList.add('px-sky-mail-time');
        card.appendChild(timeEl);
      }
    });

    applySkyNotifyFilter();
  }

  function applySkyInboxChrome() {
    if (!isSky()) return;
    var title = $('notifyHubTitle');
    if (title) title.textContent = 'Inbox';
    ensureSkyTabs();
    ensureSkyFoot();
    enhanceSkyMailList();
  }

  function markAllRead() {
    var user = global.currentUser;
    if (!user || !user.id) {
      if (typeof global.showToast === 'function') global.showToast('Sign in first.');
      return;
    }
    var key = NOTIFY_LS + '_' + user.id;
    try {
      var raw = localStorage.getItem(key);
      if (raw) {
        var q = JSON.parse(raw);
        if (Array.isArray(q)) {
          q.forEach(function (n) {
            if (n.type !== 'trade_request') n.read = true;
          });
          localStorage.setItem(key, JSON.stringify(q));
        }
      }
    } catch (e) {
      console.warn('pxSky markAllRead', e);
    }
    if (typeof global.renderNotifyActivityList === 'function') {
      global.renderNotifyActivityList();
    }
    if (typeof global.updateNotifyBellDot === 'function') {
      global.updateNotifyBellDot();
    }
    if (typeof global.showToast === 'function') {
      global.showToast('All notifications marked as read.');
    }
  }

  function wrapRenderNotifyActivityList() {
    if (
      typeof global.renderNotifyActivityList !== 'function' ||
      global.renderNotifyActivityList._pxSkyWrapped
    ) {
      return;
    }
    var orig = global.renderNotifyActivityList;
    global.renderNotifyActivityList = function () {
      orig.apply(this, arguments);
      applySkyInboxChrome();
    };
    global.renderNotifyActivityList._pxSkyWrapped = true;
  }

  function wrapRenderNotifyGiftsList() {
    if (
      typeof global.renderNotifyGiftsList !== 'function' ||
      global.renderNotifyGiftsList._pxSkyWrapped
    ) {
      return;
    }
    var orig = global.renderNotifyGiftsList;
    global.renderNotifyGiftsList = function () {
      orig.apply(this, arguments);
      if (isSky()) {
        document.querySelectorAll('#notifyGiftsList .poxy-notify-gift-card').forEach(function (card) {
          card.classList.add('px-sky-mail-item');
        });
      }
    };
    global.renderNotifyGiftsList._pxSkyWrapped = true;
  }

  function wrapOpenNotifyHub() {
    if (typeof global.openNotifyHub !== 'function' || global.openNotifyHub._pxSkyWrapped) return;
    var orig = global.openNotifyHub;
    global.openNotifyHub = function () {
      orig.apply(this, arguments);
      if (!isSky()) return;
      document.body.style.overflow = '';
      positionSkyInbox();
      applySkyInboxChrome();
      var pending =
        typeof global.countPendingGifts === 'function' ? global.countPendingGifts() : 0;
      setSkyNotifyFilter(pending > 0 ? 'gifts' : 'all');
    };
    global.openNotifyHub._pxSkyWrapped = true;
  }

  function wrapSwitchNotifyTab() {
    if (typeof global.switchNotifyTab !== 'function' || global.switchNotifyTab._pxSkyWrapped) return;
    var orig = global.switchNotifyTab;
    global.switchNotifyTab = function (tab) {
      orig.apply(this, arguments);
      if (!isSky()) return;
      if (tab === 'gifts') {
        skyFilter = 'gifts';
        document.querySelectorAll('.px-sky-mh-tab').forEach(function (btn) {
          btn.classList.toggle('active', btn.getAttribute('data-sky-filter') === 'gifts');
        });
      }
    };
    global.switchNotifyTab._pxSkyWrapped = true;
  }

  function init() {
    wrapRenderNotifyActivityList();
    wrapRenderNotifyGiftsList();
    wrapOpenNotifyHub();
    wrapSwitchNotifyTab();
    window.addEventListener('resize', function () {
      if (isSky() && $('notifyHubOverlay') && !$('notifyHubOverlay').hidden) {
        positionSkyInbox();
      }
    });
  }

  global.PoxyNotifySky = {
    apply: applySkyInboxChrome,
    markAllRead: markAllRead,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);

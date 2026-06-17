/**
 * POXY Sky Settings screen (Stage 9).
 */
(function (global) {
  'use strict';

  var ARROW =
    '<span class="set-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span>';

  var GROUPS = [
    {
      title: 'Account',
      rows: [
        {
          id: 'profile',
          title: 'Profile',
          sub: '@yourname · edit name and avatar',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/></svg>',
          action: 'profile',
        },
        {
          id: 'security',
          title: 'Security',
          sub: 'Password, 2FA, backup codes',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
          action: 'detail',
          tab: 'security',
        },
        {
          id: 'devices',
          title: 'Devices',
          sub: 'Linked devices, sessions',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v7h-7"/></svg>',
          action: 'detail',
          tab: 'security',
        },
      ],
    },
    {
      title: 'Coins',
      rows: [
        {
          id: 'topup',
          title: 'Top up coins',
          sub: 'Add to your balance',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 12c-3.3 0-6-1.3-6-3"/></svg>',
          action: 'topup',
        },
        {
          id: 'donate',
          title: 'Donate to POXY',
          sub: 'Support the project',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18M9 3 7 9l5 12 5-12-2-6"/></svg>',
          action: 'donate',
        },
        {
          id: 'history',
          title: 'Transaction history',
          sub: 'Your coin activity',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 12c-3.3 0-6-1.3-6-3"/></svg>',
          action: 'history',
        },
      ],
    },
    {
      title: 'Appearance',
      rows: [
        {
          id: 'theme',
          title: 'Dark theme',
          sub: 'Switch the whole app',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>',
          action: 'theme',
        },
        {
          id: 'language',
          title: 'Language',
          sub: 'English',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/></svg>',
          action: 'detail',
          tab: 'account',
        },
      ],
    },
    {
      title: 'POXY',
      rows: [
        {
          id: 'help',
          title: 'Help center',
          sub: 'Guides and support',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 4 2c0 1.5-2 2-2 3.5"/><circle cx="11.5" cy="17.5" r="0.6" fill="currentColor"/></svg>',
          action: 'help',
        },
        {
          id: 'faq',
          title: 'What POXY can do',
          sub: 'Features and FAQ',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 4 2c0 1.5-2 2-2 3.5"/><circle cx="11.5" cy="17.5" r="0.6" fill="currentColor"/></svg>',
          action: 'faq',
        },
        {
          id: 'privacy',
          title: 'Privacy',
          sub: 'Policy and data',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
          action: 'privacy',
        },
      ],
    },
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function isSkySettingsVisible() {
    return (
      document.body.classList.contains('poxy-sky-app-active') &&
      $('settingsPage') &&
      $('settingsPage').classList.contains('visible')
    );
  }

  function ensurePageHead() {
    if (global.PoxyScreensSky) global.PoxyScreensSky.ensureHead('settings');
  }

  function ensureBackBar() {
    var viewport = document.querySelector('#settingsPage .poxy-settings-viewport');
    if (!viewport || $('pxSkySettingsBack')) return;
    var back = document.createElement('div');
    back.id = 'pxSkySettingsBack';
    back.innerHTML = '<button type="button" id="pxSkySettingsBackBtn">← Settings</button>';
    back.querySelector('#pxSkySettingsBackBtn').addEventListener('click', showHub);
    viewport.insertBefore(back, viewport.firstChild);
  }

  function buildRow(row) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'set-row px-sky-set-row';
    el.dataset.rowId = row.id;
    el.innerHTML =
      '<span class="set-ic" aria-hidden="true">' +
      row.icon +
      '</span><span class="set-txt"><span class="st">' +
      row.title +
      '</span><span class="sd" id="pxSkySetSub-' +
      row.id +
      '">' +
      row.sub +
      '</span></span>';
    if (row.action === 'theme') {
      el.innerHTML += '<span class="set-toggle" id="pxSkyThemeToggle" role="switch" aria-checked="false"></span>';
    } else if (row.action !== 'theme') {
      el.innerHTML += ARROW;
    }
    el.addEventListener('click', function () {
      onRowClick(row, el);
    });
    return el;
  }

  function ensureHub() {
    var page = $('settingsPage');
    if (!page || $('pxSkySettingsHub')) return;
    var hub = document.createElement('div');
    hub.id = 'pxSkySettingsHub';
    hub.className = 'settings-grid px-sky-settings-hub';
    GROUPS.forEach(function (group) {
      var block = document.createElement('div');
      block.className = 'set-group';
      block.innerHTML = '<h3>' + group.title + '</h3>';
      group.rows.forEach(function (row) {
        block.appendChild(buildRow(row));
      });
      hub.appendChild(block);
    });
    var shell = page.querySelector('.poxy-settings-shell');
    if (shell) page.insertBefore(hub, shell);
    else page.appendChild(hub);
    var themeToggle = $('pxSkyThemeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleTheme();
      });
    }
  }

  function showHub() {
    var page = $('settingsPage');
    if (!page) return;
    page.classList.add('px-sky-settings--hub');
    page.classList.remove('px-sky-settings--detail');
  }

  function openDetail(tab) {
    var page = $('settingsPage');
    if (!page) return;
    page.classList.remove('px-sky-settings--hub');
    page.classList.add('px-sky-settings--detail');
    if (typeof global.switchSettingsTab === 'function') global.switchSettingsTab(tab || 'account');
  }

  function onRowClick(row, el) {
    if (row.action === 'profile') {
      if (typeof global.showPage === 'function') global.showPage('profile');
      return;
    }
    if (row.action === 'detail') {
      openDetail(row.tab);
      return;
    }
    if (row.action === 'topup') {
      if (typeof global.openTopUpModal === 'function') global.openTopUpModal();
      return;
    }
    if (row.action === 'donate') {
      // TODO Stage 9: donate flow stub — no backend yet
      if (typeof global.showToast === 'function') {
        global.showToast('Donations open in a future update.');
      }
      return;
    }
    if (row.action === 'history') {
      // TODO Stage 9: transaction history stub — ledger UI not wired here yet
      if (typeof global.showToast === 'function') {
        global.showToast('Transaction history is coming soon.');
      }
      return;
    }
    if (row.action === 'theme') {
      toggleTheme();
      return;
    }
    if (row.action === 'help') {
      if (typeof global.openSupportPanel === 'function') global.openSupportPanel();
      return;
    }
    if (row.action === 'faq') {
      if (typeof global.openSupportPanel === 'function') global.openSupportPanel();
      if (typeof global.switchSupportTab === 'function') global.switchSupportTab('faq');
      return;
    }
    if (row.action === 'privacy') {
      if (typeof global.openSupportPanel === 'function') global.openSupportPanel();
      return;
    }
  }

  function toggleTheme() {
    var isLight = document.documentElement.getAttribute('data-theme') !== 'dark';
    var next = isLight ? 'dark' : 'light';
    if (global.PoxyAppShell && typeof global.PoxyAppShell.applyTheme === 'function') {
      global.PoxyAppShell.applyTheme(next);
    } else {
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem('poxy-sky-theme', next);
      } catch (e) {}
    }
    syncThemeToggle();
  }

  function syncThemeToggle() {
    var toggle = $('pxSkyThemeToggle');
    if (!toggle) return;
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    toggle.classList.toggle('on', dark);
    toggle.setAttribute('aria-checked', dark ? 'true' : 'false');
  }

  function syncProfileSub() {
    var sub = $('pxSkySetSub-profile');
    var handle = $('settingsDisplayHandle');
    if (sub && handle && handle.textContent) {
      sub.textContent = handle.textContent + ' · edit name and avatar';
    }
  }

  function syncLanguageSub() {
    var sub = $('pxSkySetSub-language');
    if (!sub) return;
    var active = document.querySelector('#settingsLangRow .poxy-settings-lang-btn.active');
    var label = active ? active.textContent.trim() : 'English';
    sub.textContent = label || 'English';
  }

  function wrapSwitchSettingsTab() {
    if (wrapSwitchSettingsTab.done || typeof global.switchSettingsTab !== 'function') return;
    var orig = global.switchSettingsTab;
    global.switchSettingsTab = function (tab) {
      orig(tab);
      syncLanguageSub();
    };
    wrapSwitchSettingsTab.done = true;
  }

  function onShow() {
    if (!document.body.classList.contains('poxy-sky-app-active')) return;
    ensurePageHead();
    ensureHub();
    ensureBackBar();
    wrapSwitchSettingsTab();
    showHub();
    syncThemeToggle();
    syncProfileSub();
    syncLanguageSub();
  }

  global.PoxySettingsSky = {
    onShow: onShow,
    showHub: showHub,
    openDetail: openDetail,
    syncThemeToggle: syncThemeToggle,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wrapSwitchSettingsTab);
  } else {
    wrapSwitchSettingsTab();
  }
})(window);

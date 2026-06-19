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
          sub: '@yourname · edit name & avatar',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/></svg>',
          action: 'profile',
        },
        {
          id: 'security',
          title: 'Security',
          sub: 'Password, 2FA, backup codes',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
          action: 'detail',
          detailId: 'security',
        },
        {
          id: 'devices',
          title: 'Devices',
          sub: 'Linked devices, sessions',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v7h-7"/></svg>',
          action: 'detail',
          detailId: 'devices',
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
          detailId: 'language',
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
          sub: 'Features & FAQ',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 4 2c0 1.5-2 2-2 3.5"/><circle cx="11.5" cy="17.5" r="0.6" fill="currentColor"/></svg>',
          action: 'faq',
        },
        {
          id: 'privacy',
          title: 'Privacy',
          sub: 'Policy & data',
          icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
          action: 'privacy',
        },
      ],
    },
  ];

  var DETAIL_COPY = {
    security: {
      title: 'Security',
      sub: 'Password, 2FA, and backup codes.',
    },
    devices: {
      title: 'Devices',
      sub: 'Linked devices and active sessions.',
    },
    language: {
      title: 'Language',
      sub: 'Interface language for POXY WORLD. Saved on this device.',
    },
  };

  var LANG_LABELS = { en: 'English', ru: 'Русский' };

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

  function isSkySettingsHub() {
    var page = $('settingsPage');
    return (
      document.body.classList.contains('poxy-sky-app-active') &&
      page &&
      page.classList.contains('px-sky-settings--hub')
    );
  }

  function prepSettingsPanel() {
    if (typeof global.hideHuntPageShell === 'function') global.hideHuntPageShell();
    var main = $('pxSkyMain');
    if (main) main.scrollTop = 0;
    try {
      window.scrollTo(0, 0);
    } catch (e) {}
    document.body.classList.add('poxy-sky-settings-active');
  }

  function onHide() {
    document.body.classList.remove('poxy-sky-settings-active');
  }

  function scrollToSettingsBlock(id) {
    requestAnimationFrame(function () {
      var el = typeof id === 'string' ? $(id) : id;
      if (el && el.scrollIntoView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  function ensurePageHead() {
    if (global.PoxyScreensSky) global.PoxyScreensSky.ensureHead('settings');
  }

  function setPageHead(title, subtitle) {
    var head = document.querySelector('#settingsPage .px-sky-page-head');
    if (!head) return;
    var h1 = head.querySelector('h1');
    var p = head.querySelector('p');
    if (h1) h1.textContent = title;
    if (p) p.textContent = subtitle;
  }

  function loadPrefs() {
    try {
      var raw = localStorage.getItem('poxy_settings_prefs_v1');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function ensureDetailViews() {
    var page = $('settingsPage');
    if (!page || $('pxSkySettingsDetail')) return;

    var detail = document.createElement('div');
    detail.id = 'pxSkySettingsDetail';
    detail.innerHTML =
      '<div id="pxSkySettingsBack"><button type="button" id="pxSkySettingsBackBtn">← Settings</button></div>' +
      '<div id="pxSkyDetailSecurity" class="px-sky-set-detail" hidden>' +
      '<div class="set-group px-sky-set-detail-group"><h3>Change password</h3><div class="px-sky-set-panel">' +
      '<div class="px-sky-set-field"><label class="px-sky-set-label" for="pxSkyPwdCurrent">Current password</label>' +
      '<input class="px-sky-set-input" id="pxSkyPwdCurrent" type="password" autocomplete="current-password" placeholder="••••••••"></div>' +
      '<div class="px-sky-set-field-grid">' +
      '<div class="px-sky-set-field"><label class="px-sky-set-label" for="pxSkyPwdNew">New password</label>' +
      '<input class="px-sky-set-input" id="pxSkyPwdNew" type="password" autocomplete="new-password" placeholder="Create a strong password"></div>' +
      '<div class="px-sky-set-field"><label class="px-sky-set-label" for="pxSkyPwdConfirm">Confirm new password</label>' +
      '<input class="px-sky-set-input" id="pxSkyPwdConfirm" type="password" autocomplete="new-password" placeholder="Repeat new password"></div>' +
      '</div>' +
      '<div class="px-sky-set-actions"><button type="button" class="px-sky-set-btn-primary" id="pxSkyPwdUpdate">Update password</button></div>' +
      '<div class="px-sky-set-msg" id="pxSkyPwdMsg" aria-live="polite"></div></div></div>' +
      '<div class="set-group px-sky-set-detail-group"><h3>Two-factor authentication</h3><div class="px-sky-set-panel">' +
      '<div class="px-set-toggle-row"><div class="px-set-toggle-info"><p class="px-set-toggle-title">Authenticator app (TOTP)</p>' +
      '<p class="px-set-toggle-desc">Require a one-time code when signing in from a new device.</p></div>' +
      '<label class="px-set-switch"><input type="checkbox" id="pxSky2faTotp"><span class="px-set-switch-slider"></span></label></div>' +
      '<div class="px-set-toggle-row"><div class="px-set-toggle-info"><p class="px-set-toggle-title">SMS backup codes</p>' +
      '<p class="px-set-toggle-desc">Receive backup codes via verified phone. Rollout Q3.</p></div>' +
      '<label class="px-set-switch"><input type="checkbox" id="pxSky2faSms" disabled><span class="px-set-switch-slider"></span></label></div>' +
      '</div></div></div>' +
      '<div id="pxSkyDetailDevices" class="px-sky-set-detail" hidden>' +
      '<div class="set-group px-sky-set-detail-group"><h3>Sessions</h3><div class="px-sky-set-panel">' +
      '<p class="px-set-toggle-desc px-sky-set-lead">Sign out everywhere except this browser. Use after a suspected login or device loss.</p>' +
      '<div class="px-sky-set-actions"><button type="button" class="px-sky-set-btn-primary" id="pxSkySignOutOthers">Log out of all other devices</button></div>' +
      '</div></div>' +
      '<div class="set-group px-sky-set-detail-group"><h3>Recent login history</h3><div class="px-sky-set-panel">' +
      '<div class="px-sky-session-list" id="pxSkyLoginHistory"></div></div></div></div>' +
      '<div id="pxSkyDetailLanguage" class="px-sky-set-detail" hidden>' +
      '<div class="set-group px-sky-set-detail-group"><h3>Language</h3><div class="px-sky-set-panel">' +
      '<p class="px-set-toggle-desc px-sky-set-lead">Choose the interface language. Your choice is saved on this device.</p>' +
      '<div class="px-sky-lang-row" id="pxSkyLangRow" role="group" aria-label="Interface language">' +
      '<button type="button" class="px-sky-lang-btn" data-locale="en">English</button>' +
      '<button type="button" class="px-sky-lang-btn" data-locale="ru">Русский</button>' +
      '</div></div></div></div>';

    page.appendChild(detail);

    $('pxSkySettingsBackBtn').addEventListener('click', showHub);

    $('pxSky2faTotp').addEventListener('change', function () {
      if (typeof global.onSettings2faToggle === 'function') {
        global.onSettings2faToggle(this.checked);
      }
    });

    $('pxSkyPwdUpdate').addEventListener('click', function () {
      var legacyNew = $('settingsPwdNew');
      var legacyConfirm = $('settingsPwdConfirm');
      var legacyCurrent = $('settingsPwdCurrent');
      var legacyMsg = $('settingsPwdMsg');
      var legacyBtn = $('btnSettingsUpdatePassword');
      if (legacyNew) legacyNew.value = ($('pxSkyPwdNew') && $('pxSkyPwdNew').value) || '';
      if (legacyConfirm) legacyConfirm.value = ($('pxSkyPwdConfirm') && $('pxSkyPwdConfirm').value) || '';
      if (legacyCurrent) legacyCurrent.value = ($('pxSkyPwdCurrent') && $('pxSkyPwdCurrent').value) || '';
      if (legacyBtn) {
        legacyBtn.click();
        if (legacyMsg && $('pxSkyPwdMsg')) {
          $('pxSkyPwdMsg').className = legacyMsg.className.replace('poxy-settings-msg', 'px-sky-set-msg');
          $('pxSkyPwdMsg').textContent = legacyMsg.textContent;
        }
      }
    });

    $('pxSkySignOutOthers').addEventListener('click', function () {
      if (typeof global.signOutAllDevices === 'function') global.signOutAllDevices();
    });

    detail.querySelectorAll('#pxSkyLangRow .px-sky-lang-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (typeof global.selectSettingsLocale === 'function') {
          global.selectSettingsLocale(btn.dataset.locale);
        }
      });
    });
  }

  function renderSkyLoginHistory() {
    var list = $('pxSkyLoginHistory');
    if (!list) return;
    var user = global.currentUser;
    var when = (user && (user.last_sign_in_at || user.created_at)) || null;
    var whenStr = when ? new Date(when).toLocaleString() : 'Unknown';
    var email = user && user.email ? user.email : '—';
    list.innerHTML =
      '<div class="px-sky-session-item"><div class="px-sky-session-main"><strong>This device · Active now</strong>' +
      '<span class="px-sky-session-meta">' +
      whenStr +
      ' · ' +
      email +
      '</span></div><span class="px-sky-session-badge">Current</span></div>' +
      '<div class="px-sky-session-item"><div class="px-sky-session-main"><strong>Web session</strong>' +
      '<span class="px-sky-session-meta">POXY WORLD · Encrypted TLS</span></div></div>';
  }

  function syncSecurityPrefs() {
    var p = loadPrefs();
    var totp = $('pxSky2faTotp');
    if (totp) totp.checked = !!p.totp2fa;
  }

  function ensureBackBar() {
    ensureDetailViews();
  }

  function buildRow(row) {
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'set-row px-sky-set-row';
    el.dataset.rowId = row.id;
    if (row.id === 'theme') el.id = 'rowTheme';
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
    var detail = $('pxSkySettingsDetail');
    if (detail) detail.hidden = true;
    ensurePageHead();
    setPageHead('Settings', 'Your account and everything around it.');
  }

  function openDetail(detailId) {
    var page = $('settingsPage');
    if (!page) return;
    ensureDetailViews();
    page.classList.remove('px-sky-settings--hub');
    page.classList.add('px-sky-settings--detail');
    var detail = $('pxSkySettingsDetail');
    if (detail) detail.hidden = false;
    ['Security', 'Devices', 'Language'].forEach(function (name) {
      var el = $('pxSkyDetail' + name);
      if (el) el.hidden = name.toLowerCase() !== detailId;
    });
    var copy = DETAIL_COPY[detailId] || DETAIL_COPY.security;
    setPageHead(copy.title, copy.sub);
    if (detailId === 'devices') renderSkyLoginHistory();
    if (detailId === 'security') syncSecurityPrefs();
    if (detailId === 'language') syncLanguageSub();
    var main = $('pxSkyMain');
    if (main) main.scrollTop = 0;
    try {
      window.scrollTo(0, 0);
    } catch (e) {}
  }

  function onRowClick(row, el) {
    if (row.action === 'profile') {
      if (typeof global.showPage === 'function') global.showPage('profile');
      return;
    }
    if (row.action === 'detail') {
      openDetail(row.detailId || row.tab);
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
      if (typeof global.showStitchTab === 'function') global.showStitchTab('explore');
      if (typeof global.switchExploreSection === 'function') global.switchExploreSection('legal');
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
      sub.textContent = handle.textContent + ' · edit name & avatar';
    }
  }

  function syncLanguageSub() {
    var sub = $('pxSkySetSub-language');
    var loc =
      (global.PoxyI18n && global.PoxyI18n.getLocale && global.PoxyI18n.getLocale()) ||
      loadPrefs().locale ||
      'en';
    var label = LANG_LABELS[loc] || 'English';
    if (sub) sub.textContent = label;
    document.querySelectorAll('#pxSkyLangRow .px-sky-lang-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.locale === loc);
    });
    document.querySelectorAll('#settingsLangRow .poxy-settings-lang-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.locale === loc);
    });
  }

  function isSkySettingsDetail() {
    var page = $('settingsPage');
    return (
      document.body.classList.contains('poxy-sky-app-active') &&
      page &&
      page.classList.contains('px-sky-settings--detail')
    );
  }

  function wrapSwitchSettingsTab() {
    if (wrapSwitchSettingsTab.done || typeof global.switchSettingsTab !== 'function') return;
    var orig = global.switchSettingsTab;
    global.switchSettingsTab = function (tab) {
      if (isSkySettingsHub() || isSkySettingsDetail()) {
        syncLanguageSub();
        return;
      }
      orig(tab);
      syncLanguageSub();
    };
    wrapSwitchSettingsTab.done = true;
  }

  function wrapRenderSettingsPage() {
    if (wrapRenderSettingsPage.done || typeof global.renderSettingsPage !== 'function') return;
    var orig = global.renderSettingsPage;
    global.renderSettingsPage = function () {
      orig.apply(this, arguments);
      if (document.body.classList.contains('poxy-sky-app-active')) {
        syncProfileSub();
        syncLanguageSub();
        syncThemeToggle();
        syncSecurityPrefs();
      }
    };
    wrapRenderSettingsPage.done = true;
  }

  function wrapSelectSettingsLocale() {
    if (wrapSelectSettingsLocale.done || typeof global.selectSettingsLocale !== 'function') return;
    var orig = global.selectSettingsLocale;
    global.selectSettingsLocale = function (loc) {
      orig(loc);
      syncLanguageSub();
    };
    wrapSelectSettingsLocale.done = true;
  }

  function installWraps() {
    wrapSwitchSettingsTab();
    wrapRenderSettingsPage();
    wrapSelectSettingsLocale();
  }

  function onShow() {
    if (!document.body.classList.contains('poxy-sky-app-active')) return;
    prepSettingsPanel();
    ensurePageHead();
    ensureHub();
    ensureBackBar();
    installWraps();
    showHub();
    syncThemeToggle();
    syncProfileSub();
    syncLanguageSub();
  }

  global.PoxySettingsSky = {
    onShow: onShow,
    onHide: onHide,
    showHub: showHub,
    openDetail: openDetail,
    syncThemeToggle: syncThemeToggle,
    prepSettingsPanel: prepSettingsPanel,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installWraps);
  } else {
    installWraps();
  }
})(window);

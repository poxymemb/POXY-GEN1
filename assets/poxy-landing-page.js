/**
 * POXY World — Sky landing (Stage 1)
 */
(function (global) {
  'use strict';

  var SKY_THEME_KEY = 'poxy-sky-theme';
  var TABS = ['main', 'faq', 'news', 'policy', 'about'];

  function $(id) {
    return document.getElementById(id);
  }

  function openPoxyAuth() {
    if (typeof global.switchTab === 'function') global.switchTab('login');
    var overlay = $('authOverlay');
    if (!overlay) return;
    overlay.classList.add('poxy-auth-overlay--open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('poxy-auth-modal-open');
    requestAnimationFrame(function () {
      var email = $('authEmail');
      if (email) email.focus();
    });
  }

  function closePoxyAuth() {
    var overlay = $('authOverlay');
    if (!overlay) return;
    overlay.classList.remove('poxy-auth-overlay--open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('poxy-auth-modal-open');
  }

  global.openPoxyAuth = openPoxyAuth;
  global.closePoxyAuth = closePoxyAuth;

  function getSkyTheme() {
    try {
      return localStorage.getItem(SKY_THEME_KEY) || 'light';
    } catch (e) {
      return 'light';
    }
  }

  function applySkyTheme(theme) {
    var t = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    try {
      localStorage.setItem(SKY_THEME_KEY, t);
    } catch (e) {}
    var btn = $('plThemeBtn');
    if (btn) btn.textContent = t === 'light' ? '◐' : '◑';
  }

  function bindLandingCtas() {
    document.querySelectorAll('#poxyLanding [data-pl-auth]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (document.body.classList.contains('poxy-landing-preview') && isLoggedInApp()) {
          closeLandingPreview();
          return;
        }
        openPoxyAuth();
      });
    });
    var back = $('plPreviewBack');
    if (back) {
      back.addEventListener('click', function (e) {
        e.preventDefault();
        closeLandingPreview();
      });
    }
  }

  function landingGo(tab) {
    if (TABS.indexOf(tab) < 0) tab = 'main';
    TABS.forEach(function (t) {
      var page = $('page-' + t);
      if (page) page.classList.toggle('active', t === tab);
      var nt = document.querySelector('#poxyLanding .nav-tab[data-tab="' + t + '"]');
      if (nt) nt.classList.toggle('active', t === tab);
    });
    document.querySelectorAll('#poxyLanding .article').forEach(function (a) {
      a.classList.remove('show');
    });
    var newsDoc = document.querySelector('#page-news .doc');
    if (newsDoc) newsDoc.style.display = tab === 'news' ? 'block' : '';
    window.scrollTo(0, 0);
    updateGoup();
  }

  function landingArticle(id) {
    landingGo('news');
    var newsDoc = document.querySelector('#page-news .doc');
    if (newsDoc) newsDoc.style.display = 'none';
    document.querySelectorAll('#poxyLanding .article').forEach(function (a) {
      a.classList.remove('show');
    });
    var art = $('article-' + id);
    if (art) art.classList.add('show');
    window.scrollTo(0, 0);
    updateGoup();
  }

  function bindLandingTabs() {
    document.querySelectorAll('#poxyLanding [data-px-tab]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        landingGo(el.getAttribute('data-px-tab'));
      });
    });
    document.querySelectorAll('#poxyLanding [data-px-article]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        landingArticle(el.getAttribute('data-px-article'));
      });
    });
    document.querySelectorAll('#poxyLanding .back-link[data-px-tab]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        landingGo(el.getAttribute('data-px-tab'));
      });
    });
    var howBtn = $('plScrollHow');
    if (howBtn) {
      howBtn.addEventListener('click', function () {
        landingGo('main');
        var how = document.getElementById('how');
        if (how) how.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  function bindLandingFaq() {
    document.querySelectorAll('#poxyLanding .faq-q').forEach(function (q) {
      q.addEventListener('click', function () {
        var item = q.closest('.faq-item');
        if (!item) return;
        var a = item.querySelector('.faq-a');
        var open = item.classList.toggle('open');
        if (a) a.style.maxHeight = open ? a.scrollHeight + 'px' : '0';
      });
    });
  }

  function bindLandingTheme() {
    applySkyTheme(getSkyTheme());
    var btn = $('plThemeBtn');
    if (btn) {
      btn.addEventListener('click', function () {
        applySkyTheme(getSkyTheme() === 'light' ? 'dark' : 'light');
      });
    }
  }

  function bindLandingLang() {
    var menu = $('plLangMenu');
    var btn = $('plLangBtn');
    if (!menu || !btn) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
    });
    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target) && e.target !== btn) menu.style.display = 'none';
    });
    menu.querySelectorAll('.lang-opt').forEach(function (o) {
      o.style.cssText =
        'text-align:left;background:none;border:none;font:500 14px var(--px-font);color:var(--px-text);padding:9px 12px;border-radius:9px;cursor:pointer;width:100%';
      o.addEventListener('mouseenter', function () {
        o.style.background = 'var(--px-glass-strong)';
      });
      o.addEventListener('mouseleave', function () {
        o.style.background = 'none';
      });
      o.addEventListener('click', function () {
        btn.textContent = (o.dataset.l || 'EN').slice(0, 2).toUpperCase();
        menu.style.display = 'none';
      });
    });
  }

  function bindGoup() {
    var goup = $('plGoup');
    if (!goup) return;
    function updateGoup() {
      var landing = $('poxyLanding');
      if (!landing || landing.hidden) {
        goup.classList.remove('show');
        return;
      }
      goup.classList.toggle('show', window.scrollY > 400);
    }
    global.updateGoup = updateGoup;
    window.addEventListener('scroll', updateGoup, { passive: true });
    goup.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    updateGoup();
  }

  function updateGoup() {
    if (typeof global.updateGoup === 'function') global.updateGoup();
  }

  function bindAuthOverlayUi() {
    var overlay = $('authOverlay');
    if (!overlay) return;
    var backdrop = overlay.querySelector('.poxy-auth-backdrop');
    if (backdrop) backdrop.addEventListener('click', closePoxyAuth);
    var closeBtn = overlay.querySelector('.poxy-auth-close');
    if (closeBtn) closeBtn.addEventListener('click', closePoxyAuth);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('poxy-auth-overlay--open')) closePoxyAuth();
      if (e.key === 'Escape' && landingPreviewOpen) closeLandingPreview();
    });
  }

  var landingPreviewOpen = false;

  function isLoggedInApp() {
    var shell = $('poxyAppShell');
    return !!(shell && shell.style.display !== 'none');
  }

  function refreshLandingPreviewChrome() {
    var back = $('plPreviewBack');
    var signIn = $('plSignInNav');
    var ctaNav = document.querySelector('#poxyLanding .cta-nav');
    if (back) back.hidden = !landingPreviewOpen;
    if (signIn) signIn.hidden = landingPreviewOpen && isLoggedInApp();
    if (ctaNav) ctaNav.hidden = landingPreviewOpen && isLoggedInApp();
  }

  function showLanding() {
    var landing = $('poxyLanding');
    if (landing) landing.hidden = false;
    document.body.classList.add('poxy-landing-active');
    document.body.classList.remove('poxy-landing-preview');
    landingPreviewOpen = false;
    applySkyTheme(getSkyTheme());
    closePoxyAuth();
    landingGo('main');
    refreshLandingPreviewChrome();
    updateGoup();
  }

  function hideLanding() {
    var landing = $('poxyLanding');
    if (landing) landing.hidden = true;
    document.body.classList.remove('poxy-landing-active', 'poxy-landing-preview', 'poxy-auth-modal-open');
    landingPreviewOpen = false;
    closePoxyAuth();
    refreshLandingPreviewChrome();
    updateGoup();
  }

  function openLandingPreview() {
    var landing = $('poxyLanding');
    if (!landing) return;
    landing.hidden = false;
    landingPreviewOpen = true;
    document.body.classList.add('poxy-landing-preview');
    document.body.classList.remove('poxy-auth-modal-open');
    applySkyTheme(getSkyTheme());
    closePoxyAuth();
    refreshLandingPreviewChrome();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateGoup();
  }

  function closeLandingPreview() {
    if (!landingPreviewOpen) return;
    var landing = $('poxyLanding');
    if (landing) landing.hidden = true;
    landingPreviewOpen = false;
    document.body.classList.remove('poxy-landing-preview', 'poxy-auth-modal-open');
    closePoxyAuth();
    refreshLandingPreviewChrome();
    updateGoup();
  }

  function toggleLandingPreview() {
    if (landingPreviewOpen) closeLandingPreview();
    else openLandingPreview();
  }

  global.showPoxyLanding = showLanding;
  global.hidePoxyLanding = hideLanding;
  global.openPoxyLandingPreview = openLandingPreview;
  global.closePoxyLandingPreview = closeLandingPreview;
  global.togglePoxyLandingPreview = toggleLandingPreview;

  function init() {
    bindLandingCtas();
    bindLandingTabs();
    bindLandingFaq();
    bindLandingTheme();
    bindLandingLang();
    bindGoup();
    bindAuthOverlayUi();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);

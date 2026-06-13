/**
 * POXY World — landing page L1/L2/L3 (8 sections, live data, subscribe)
 */
(function (global) {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function formatNum(n) {
    if (n == null || n === '' || Number.isNaN(Number(n))) return '—';
    return Number(n).toLocaleString();
  }

  function normalizeUuid(raw) {
    var s = String(raw || '').trim();
    if (!s) return null;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return s;
    var hex = s.replace(/[^0-9a-f]/gi, '');
    if (hex.length === 32) {
      return (
        hex.slice(0, 8) +
        '-' +
        hex.slice(8, 12) +
        '-' +
        hex.slice(12, 16) +
        '-' +
        hex.slice(16, 20) +
        '-' +
        hex.slice(20)
      ).toLowerCase();
    }
    return null;
  }

  function openPoxyAuth() {
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

  function showAuth(mode) {
    if (typeof global.switchTab === 'function') {
      global.switchTab(mode === 'register' ? 'signup' : 'login');
    }
    openPoxyAuth();
  }

  global.showAuth = showAuth;

  function playIntro() {
    var el = document.getElementById('landing-fair');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  global.playIntro = playIntro;

  function renderSupplyBars(tiers) {
    var wrap = $('landing-supply-bars');
    if (!wrap) return;
    if (!tiers || !tiers.length) {
      wrap.innerHTML = '<div class="pl-supply-loading">Supply data unavailable.</div>';
      return;
    }
    wrap.innerHTML = '';
    tiers.forEach(function (t) {
      var row = document.createElement('div');
      row.className = 'pl-supply-row' + (t.sold_out ? ' is-sold-out' : '');
      var pct = Math.min(100, Number(t.pct) || 0);
      row.innerHTML =
        '<div class="pl-supply-meta">' +
        '<span class="pl-supply-tier">' +
        String(t.tier || '').toUpperCase() +
        '</span>' +
        (t.sold_out ? '<span class="pl-sold-badge">SOLD OUT</span>' : '') +
        '<span class="pl-supply-count">' +
        formatNum(t.minted) +
        ' / ' +
        formatNum(t.cap) +
        '</span></div>' +
        '<div class="pl-supply-track"><div class="pl-supply-fill" style="width:' +
        pct +
        '%" data-tier="' +
        String(t.tier || '') +
        '"></div></div>';
      wrap.appendChild(row);
    });
  }

  async function loadLandingData() {
    var sb = global.sb;
    if (!sb) return;

    try {
      var genRes = await sb.rpc('get_gen1_supply_status');
      var gen1 = genRes.data;
      if (typeof gen1 === 'string') {
        try {
          gen1 = JSON.parse(gen1);
        } catch (e) {}
      }
      if (gen1 && gen1.ok !== false) {
        var claimed = $('gen1-claimed');
        var cap = $('gen1-cap');
        if (claimed) claimed.textContent = formatNum(gen1.total_minted);
        if (cap) cap.textContent = formatNum(gen1.total_cap || 5000);
        renderSupplyBars(gen1.tiers || []);
      }
    } catch (e) {
      console.warn('[landing] gen1 supply:', e);
    }

    try {
      var statsRes = await sb.rpc('get_public_landing_stats');
      var stats = statsRes.data;
      if (typeof stats === 'string') {
        try {
          stats = JSON.parse(stats);
        } catch (e) {}
      }
      if (stats) {
        var tp = $('total-players');
        var tm = $('total-minted');
        var tt = $('total-trades');
        if (tp) tp.textContent = formatNum(stats.total_players);
        if (tm) tm.textContent = formatNum(stats.total_minted);
        if (tt) tt.textContent = formatNum(stats.total_trades);
      }
    } catch (e) {
      console.warn('[landing] public stats:', e);
      try {
        var ovRes = await sb.rpc('get_supply_overview');
        var row = (ovRes.data && ovRes.data[0]) || ovRes.data;
        if (row) {
          var tp2 = $('total-players');
          var tm2 = $('total-minted');
          if (tp2) tp2.textContent = formatNum(row.total_players);
          if (tm2) tm2.textContent = formatNum(row.total_minted);
        }
      } catch (e2) {
        console.warn('[landing] supply overview fallback:', e2);
      }
    }
  }

  global.loadLandingData = loadLandingData;

  async function demoVerify() {
    var input = $('demo-round-id');
    var out = $('demo-result');
    if (!input || !out) return;
    var raw = input.value.trim();
    if (!raw) {
      out.textContent = 'Enter a round UUID to verify.';
      out.className = 'pl-verify-result verify-result is-error';
      return;
    }
    var id = normalizeUuid(raw);
    if (!id) {
      out.textContent = 'Invalid round ID format.';
      out.className = 'pl-verify-result verify-result is-error';
      return;
    }
    out.textContent = 'Verifying…';
    out.className = 'pl-verify-result verify-result is-pending';
    try {
      var sb = global.sb;
      if (!sb) throw new Error('Client not ready');
      var res = await sb.rpc('public_verify_rng', { p_round_id: id });
      var data = res.data;
      if (res.error) throw res.error;
      if (!data || data.ok === false) {
        out.textContent = data && data.error ? data.error : 'Round not found.';
        out.className = 'pl-verify-result verify-result is-error';
        return;
      }
      if (data.status === 'pending') {
        out.textContent =
          'Round sealed (commit phase). Commit hash: ' + String(data.commit_hash || '').slice(0, 16) + '…';
        out.className = 'pl-verify-result verify-result is-pending';
        return;
      }
      var fair = !!(data.commit_matches && data.result_matches);
      out.textContent = fair
        ? '✓ VERIFIED — commit and result hashes match. Drop was provably fair.'
        : '✗ INTEGRITY FAILURE — hash mismatch detected.';
      out.className = 'pl-verify-result verify-result ' + (fair ? 'is-ok' : 'is-error');
    } catch (e) {
      out.textContent = 'Verify failed: ' + (e.message || 'error');
      out.className = 'pl-verify-result verify-result is-error';
    }
  }

  global.demoVerify = demoVerify;

  async function subscribeEmail() {
    var input = $('subscribe-email');
    var msg = $('subscribe-msg');
    if (!input) return;
    var email = input.value.trim().toLowerCase();
    if (!email || email.indexOf('@') < 1) {
      if (msg) {
        msg.hidden = false;
        msg.textContent = 'Enter a valid email address.';
        msg.className = 'pl-subscribe-msg is-error';
      }
      return;
    }
    if (msg) {
      msg.hidden = false;
      msg.textContent = 'Subscribing…';
      msg.className = 'pl-subscribe-msg';
    }
    try {
      var sb = global.sb;
      if (!sb) throw new Error('Client not ready');
      var res = await sb.from('email_subscribers').insert({ email: email, source: 'landing' });
      if (res.error) {
        if (res.error.code === '23505') {
          if (msg) {
            msg.textContent = "You're on the list! We'll notify you.";
            msg.className = 'pl-subscribe-msg is-ok';
          }
          input.value = '';
          return;
        }
        throw res.error;
      }
      if (msg) {
        msg.textContent = "You're on the list! We'll notify you.";
        msg.className = 'pl-subscribe-msg is-ok';
      }
      input.value = '';
    } catch (e) {
      if (msg) {
        msg.textContent = 'Could not subscribe. Try again later.';
        msg.className = 'pl-subscribe-msg is-error';
      }
      console.warn('[landing] subscribe:', e);
    }
  }

  global.subscribeEmail = subscribeEmail;

  function bindLandingCtas() {
    document.querySelectorAll('[data-pl-auth]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (document.body.classList.contains('poxy-landing-preview') && isLoggedInApp()) {
          closeLandingPreview();
          return;
        }
        var mode = btn.getAttribute('data-pl-auth') || 'login';
        showAuth(mode === 'register' ? 'register' : 'login');
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

  function bindNavScroll() {
    var links = document.querySelectorAll('.pl-nav-link[href^="#"]');
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        var id = link.getAttribute('href');
        if (!id || id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        links.forEach(function (l) {
          l.classList.toggle('is-active', l === link);
        });
      });
    });
  }

  function bindParallaxGlows() {
    var g1 = document.getElementById('plGlow1');
    var g2 = document.getElementById('plGlow2');
    if (!g1 && !g2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var raf = 0;
    document.addEventListener(
      'mousemove',
      function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var x = e.clientX / window.innerWidth;
          var y = e.clientY / window.innerHeight;
          if (g1) g1.style.transform = 'translate(' + x * 30 + 'px,' + y * 30 + 'px)';
          if (g2) g2.style.transform = 'translate(' + x * -40 + 'px,' + y * -40 + 'px)';
        });
      },
      { passive: true }
    );
  }

  function bindParticles() {
    var canvas = $('plParticles');
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var dots = [];
    var count = 48;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      dots = [];
      for (var i = 0; i < count; i++) {
        dots.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 1.2 + 0.4,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
        });
      }
    }

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(232, 121, 249, 0.35)';
      dots.forEach(function (d) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0) d.x = canvas.width;
        if (d.x > canvas.width) d.x = 0;
        if (d.y < 0) d.y = canvas.height;
        if (d.y > canvas.height) d.y = 0;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });
    requestAnimationFrame(tick);
  }

  function bindScrollReveal() {
    var nodes = document.querySelectorAll('#poxyLanding .pl-reveal');
    if (!nodes.length) return;
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(function (n) {
        n.classList.add('is-visible');
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    nodes.forEach(function (n) {
      io.observe(n);
    });
  }

  function bindAuthOverlayUi() {
    var overlay = $('authOverlay');
    if (!overlay) return;

    var backdrop = overlay.querySelector('.poxy-auth-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', closePoxyAuth);
    }
    var closeBtn = overlay.querySelector('.poxy-auth-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closePoxyAuth);
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('poxy-auth-overlay--open')) {
        closePoxyAuth();
      }
      if (e.key === 'Escape' && landingPreviewOpen) {
        closeLandingPreview();
      }
    });
  }

  var landingPreviewOpen = false;

  function isLoggedInApp() {
    var shell = $('poxyAppShell');
    return !!(shell && shell.style.display !== 'none');
  }

  function refreshLandingPreviewChrome() {
    var back = $('plPreviewBack');
    var signIn = document.querySelector('#poxyLanding .pl-nav .pl-btn--ghost[data-pl-auth]');
    if (back) back.hidden = !landingPreviewOpen;
    if (signIn) signIn.hidden = landingPreviewOpen && isLoggedInApp();
  }

  function showLanding() {
    var landing = $('poxyLanding');
    if (landing) landing.hidden = false;
    document.body.classList.add('poxy-landing-active');
    document.body.classList.remove('poxy-landing-preview');
    landingPreviewOpen = false;
    closePoxyAuth();
    refreshLandingPreviewChrome();
    loadLandingData();
  }

  function hideLanding() {
    var landing = $('poxyLanding');
    if (landing) landing.hidden = true;
    document.body.classList.remove('poxy-landing-active', 'poxy-landing-preview', 'poxy-auth-modal-open');
    landingPreviewOpen = false;
    closePoxyAuth();
    refreshLandingPreviewChrome();
  }

  function openLandingPreview() {
    var landing = $('poxyLanding');
    if (!landing) return;
    landing.hidden = false;
    landingPreviewOpen = true;
    document.body.classList.add('poxy-landing-preview');
    document.body.classList.remove('poxy-auth-modal-open');
    closePoxyAuth();
    if (typeof renderLandingMarketingNav === 'function') renderLandingMarketingNav();
    refreshLandingPreviewChrome();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    landing.querySelectorAll('.pl-reveal').forEach(function (n) {
      n.classList.add('is-visible');
    });
    loadLandingData();
  }

  function closeLandingPreview() {
    if (!landingPreviewOpen) return;
    var landing = $('poxyLanding');
    if (landing) landing.hidden = true;
    landingPreviewOpen = false;
    document.body.classList.remove('poxy-landing-preview', 'poxy-auth-modal-open');
    closePoxyAuth();
    refreshLandingPreviewChrome();
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
    bindNavScroll();
    bindParallaxGlows();
    bindParticles();
    bindScrollReveal();
    bindAuthOverlayUi();
    if (typeof renderLandingMarketingNav === 'function') renderLandingMarketingNav();
    if (document.body.classList.contains('poxy-landing-active')) {
      loadLandingData();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);

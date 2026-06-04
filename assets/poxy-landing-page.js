/**
 * POXY World — landing / entry page (motion + auth bridge)
 */
(function (global) {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function openPoxyAuth() {
    const overlay = $('authOverlay');
    if (!overlay) return;
    overlay.classList.add('poxy-auth-overlay--open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('poxy-auth-modal-open');
    requestAnimationFrame(function () {
      const email = $('authEmail');
      if (email) email.focus();
    });
  }

  function closePoxyAuth() {
    const overlay = $('authOverlay');
    if (!overlay) return;
    overlay.classList.remove('poxy-auth-overlay--open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('poxy-auth-modal-open');
  }

  global.openPoxyAuth = openPoxyAuth;
  global.closePoxyAuth = closePoxyAuth;

  function bindLandingCtas() {
    document.querySelectorAll('[data-pl-auth]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openPoxyAuth();
      });
    });
  }

  function bindNavScroll() {
    const links = document.querySelectorAll('.pl-nav-link[href^="#"]');
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        const id = link.getAttribute('href');
        if (!id || id.length < 2) return;
        const target = document.querySelector(id);
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
    const g1 = document.getElementById('plGlow1');
    const g2 = document.getElementById('plGlow2');
    if (!g1 && !g2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    document.addEventListener(
      'mousemove',
      function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          const x = e.clientX / window.innerWidth;
          const y = e.clientY / window.innerHeight;
          if (g1) g1.style.transform = 'translate(' + x * 30 + 'px,' + y * 30 + 'px)';
          if (g2) g2.style.transform = 'translate(' + x * -40 + 'px,' + y * -40 + 'px)';
        });
      },
      { passive: true }
    );
  }

  function bindScrollReveal() {
    const nodes = document.querySelectorAll('#poxyLanding .pl-reveal');
    if (!nodes.length) return;
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(function (n) {
        n.classList.add('is-visible');
      });
      return;
    }
    const io = new IntersectionObserver(
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
    const overlay = $('authOverlay');
    if (!overlay) return;

    const backdrop = overlay.querySelector('.poxy-auth-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', closePoxyAuth);
    }
    const closeBtn = overlay.querySelector('.poxy-auth-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closePoxyAuth);
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('poxy-auth-overlay--open')) {
        closePoxyAuth();
      }
    });
  }

  function showLanding() {
    const landing = $('poxyLanding');
    if (landing) landing.hidden = false;
    document.body.classList.add('poxy-landing-active');
    closePoxyAuth();
  }

  function hideLanding() {
    const landing = $('poxyLanding');
    if (landing) landing.hidden = true;
    document.body.classList.remove('poxy-landing-active', 'poxy-auth-modal-open');
    closePoxyAuth();
  }

  global.showPoxyLanding = showLanding;
  global.hidePoxyLanding = hideLanding;

  function init() {
    bindLandingCtas();
    bindNavScroll();
    bindParallaxGlows();
    bindScrollReveal();
    bindAuthOverlayUi();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);

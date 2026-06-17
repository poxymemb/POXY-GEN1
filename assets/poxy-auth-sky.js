/**
 * POXY Sky auth UI — screens, theme, strength, verify codes.
 * Supabase handlers stay in index.html (handleAuth, switchTab, …).
 */
(function (global) {
  'use strict';

  var SKY_THEME_KEY = 'poxy-sky-theme';

  function $(id) {
    return document.getElementById(id);
  }

  function applySkyTheme(theme) {
    var t = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    try {
      localStorage.setItem(SKY_THEME_KEY, t);
    } catch (e) {}
    var btn = $('authThemeBtn');
    if (btn) btn.textContent = t === 'light' ? '◐' : '◑';
  }

  function showAuthScreen(name) {
    var screens = ['login', 'register', 'verify'];
    screens.forEach(function (s) {
      var el = $('authScreen-' + s);
      if (el) el.classList.toggle('active', s === name);
    });
    window.scrollTo(0, 0);
  }

  global.PoxyAuthSky = {
    showScreen: showAuthScreen,
    showVerify: function (email) {
      var target = $('authVerifyEmail');
      if (target) target.textContent = email || '';
      showAuthScreen('verify');
    },
  };

  function bindTheme() {
    var btn = $('authThemeBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var next =
        document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applySkyTheme(next);
      var landingBtn = $('plThemeBtn');
      if (landingBtn) landingBtn.textContent = next === 'light' ? '◐' : '◑';
    });
    applySkyTheme(
      document.documentElement.getAttribute('data-theme') ||
        (function () {
          try {
            return localStorage.getItem(SKY_THEME_KEY);
          } catch (e) {
            return null;
          }
        })() ||
        'light'
    );
  }

  function bindUsernameHint() {
    var uname = $('authUsername');
    var uhint = $('authUsernameHint');
    if (!uname || !uhint) return;
    uname.addEventListener('input', function () {
      var v = uname.value.trim().toLowerCase();
      uname.classList.remove('ok', 'err');
      uhint.classList.remove('ok', 'err');
      if (!v) {
        uhint.textContent = '3–20 characters, letters and numbers.';
        return;
      }
      if (v.length < 3) {
        uhint.textContent = 'A little longer, at least 3 characters.';
        return;
      }
      if (!/^[a-z0-9_]+$/.test(v)) {
        uhint.classList.add('err');
        uname.classList.add('err');
        uhint.textContent = 'Letters, numbers, and underscores only.';
        return;
      }
      uhint.classList.add('ok');
      uname.classList.add('ok');
      uhint.textContent = '@' + v + ' looks good.';
    });
  }

  function bindPasswordStrength() {
    var pwd = $('authSignupPassword');
    var strength = $('authPasswordStrength');
    if (!pwd || !strength) return;
    pwd.addEventListener('input', function () {
      var v = pwd.value;
      var s = 0;
      if (v.length >= 8) s++;
      if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
      if (/[0-9]/.test(v)) s++;
      if (/[^A-Za-z0-9]/.test(v)) s++;
      strength.className = 'strength' + (v ? ' s' + Math.max(1, s) : '');
    });
  }

  function bindCodeInputs() {
    var row = $('authCodeRow');
    if (!row) return;
    var codes = [].slice.call(row.querySelectorAll('input'));
    codes.forEach(function (c, i) {
      c.addEventListener('input', function () {
        if (c.value && i < codes.length - 1) codes[i + 1].focus();
      });
      c.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !c.value && i > 0) codes[i - 1].focus();
      });
      c.addEventListener('paste', function (e) {
        var d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
        if (!d) return;
        d.split('').forEach(function (n, j) {
          if (codes[j]) codes[j].value = n;
        });
        codes[Math.min(d.length, codes.length - 1)].focus();
        e.preventDefault();
      });
    });
  }

  function bindVerifyBack() {
    var back = $('authVerifyBack');
    if (back) {
      back.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof global.switchTab === 'function') global.switchTab('signup');
      });
    }
    var resend = $('authResendBtn');
    if (resend) {
      resend.addEventListener('click', function () {
        if (resend.dataset.ready !== '1') return;
        var msg = $('authMsg');
        if (msg) {
          msg.className = 'auth-msg';
          msg.textContent = 'If an account exists, a new code was sent.';
        }
        startResendTimer(42);
      });
    }
  }

  function startResendTimer(seconds) {
    var resend = $('authResendBtn');
    var timer = $('authResendTimer');
    if (!resend) return;
    var t = seconds;
    resend.dataset.ready = '0';
    resend.style.cursor = 'default';
    if (window._authResendIv) clearInterval(window._authResendIv);
    window._authResendIv = setInterval(function () {
      t--;
      if (t <= 0) {
        clearInterval(window._authResendIv);
        resend.innerHTML = 'Resend code';
        resend.dataset.ready = '1';
        resend.style.cursor = 'pointer';
        return;
      }
      if (timer) timer.textContent = String(t);
    }, 1000);
  }

  function bindClose() {
    var close = $('authCloseBtn');
    if (close) {
      close.addEventListener('click', function () {
        if (typeof global.closePoxyAuth === 'function') global.closePoxyAuth();
      });
    }
  }

  function bindQr() {
    var qr = $('authQrBtn');
    if (qr) {
      qr.addEventListener('click', function () {
        if (typeof global.showToast === 'function') {
          global.showToast('Device linking (QR) — coming soon.');
        }
      });
    }
    var forgot = $('authForgotBtn');
    if (forgot) {
      forgot.addEventListener('click', function () {
        if (typeof global.showToast === 'function') {
          global.showToast('Password reset — coming soon.');
        }
      });
    }
  }

  function init() {
    bindTheme();
    bindUsernameHint();
    bindPasswordStrength();
    bindCodeInputs();
    bindVerifyBack();
    bindClose();
    bindQr();
    startResendTimer(42);
    showAuthScreen('login');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);

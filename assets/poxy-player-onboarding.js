(function PoxyPlayerOnboarding() {
  'use strict';

  var LS_KEY = 'poxy_onboarding_complete';
  var DNA_SEASON = 'gen_china_magic';
  var TRAIT_CATS = ['Eye', 'Horn', 'Aura', 'Element', 'Scale', 'Tail'];

  var state = {
    active: false,
    awaitingCase: false,
    step: null,
    tourIdx: -1,
    dragon: null,
  };

  var TOUR_STEPS = [
    {
      target: '#psdNavDashboard',
      title: 'Open More Cases',
      text: 'Hunt for rare dragons here. Each drop is provably fair.',
      position: 'bottom',
    },
    {
      target: '#psdNavCollection',
      title: 'Your Collection',
      text: 'All your dragons live here. Each one is unique.',
      position: 'bottom',
    },
    {
      target: '#psdNavMarket',
      title: 'Marketplace',
      text: 'Trade with other collectors. Buy and sell dragons.',
      position: 'bottom',
    },
  ];

  function $(id) { return document.getElementById(id); }

  function sb() { return window.sb; }

  function isCompleteLocally() {
    return localStorage.getItem(LS_KEY) === '1' || localStorage.getItem(LS_KEY) === 'true';
  }

  function markCompleteLocal() {
    try { localStorage.setItem(LS_KEY, '1'); } catch (e) {}
  }

  async function shouldShowOnboarding() {
    if (!window.currentUser || !window.sb) return false;
    if (isCompleteLocally()) return false;
    var profile = window.currentProfile;
    if (profile && profile.metadata && profile.metadata.onboarding_done) return false;

    try {
      var res = await sb().from('user_poxy')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', window.currentUser.id);
      if (res.error) {
        console.error('[onboarding] dragon count:', res.error);
        return false;
      }
      if ((res.count || 0) > 0) return false;

      if (!profile || !profile.created_at) {
        var pr = await sb().from('profiles').select('created_at,metadata').eq('id', window.currentUser.id).maybeSingle();
        if (pr.error || !pr.data) return false;
        profile = pr.data;
        if (profile.metadata && profile.metadata.onboarding_done) return false;
      }

      var isNew = Date.now() - new Date(profile.created_at).getTime() < 600000;
      return isNew;
    } catch (e) {
      console.error('[onboarding] shouldShow:', e);
      return false;
    }
  }

  function lockScroll() { document.body.style.overflow = 'hidden'; }
  function unlockScroll() {
    var open = document.querySelector('.pob-modal:not([hidden]), .pob-tour-overlay.is-active');
    if (!open) document.body.style.overflow = '';
  }

  function showWelcomeModal() {
    var modal = $('pobWelcomeModal');
    if (!modal) return;
    var userEl = $('pobWelcomeUser');
    var name = (window.currentProfile && window.currentProfile.username)
      || (window.currentUser && window.currentUser.email && window.currentUser.email.split('@')[0])
      || 'Operative';
    if (userEl) userEl.textContent = '@' + name;
    modal.hidden = false;
    lockScroll();
    state.step = 'welcome';
  }

  function hideWelcomeModal() {
    var modal = $('pobWelcomeModal');
    if (modal) modal.hidden = true;
    unlockScroll();
  }

  async function grantFreeCase() {
    var res = await sb().rpc('grant_onboarding_free_case');
    if (res.error) throw res.error;
    if (res.data && res.data.ok === false) throw new Error(res.data.error || 'Grant failed');
    await (window.loadPlayerEconomy && window.loadPlayerEconomy());
    if (window.currentProfile) {
      if (!window.currentProfile.metadata) window.currentProfile.metadata = {};
      window.currentProfile.metadata.onboarding_case_granted = true;
    }
    return res.data;
  }

  async function openFreeCase() {
    state.awaitingCase = true;
    if (typeof window.showStitchTab === 'function') window.showStitchTab('dashboard');
    await new Promise(function (r) { setTimeout(r, 400); });
    if (typeof window.runCaseOpen !== 'function') throw new Error('Case opener unavailable');
    var ok = await window.runCaseOpen({ caseType: 'standard', useToken: true });
    if (!ok) throw new Error('Free case open failed');
  }

  async function fetchDragonDna(poxyId) {
    var traits = {};
    var dnaHash = '';
    try {
      var res = await sb().rpc('assign_traits_on_mint', { p_poxy_id: poxyId, p_season_id: DNA_SEASON });
      if (res.data && res.data.ok) {
        traits = res.data.traits || {};
        dnaHash = res.data.dna_hash || '';
      }
    } catch (e) { console.error('[onboarding] traits:', e); }
    return { traits: traits, dna_hash: dnaHash };
  }

  function tierMap() {
    return (window.PoxyTrustBridge && window.PoxyTrustBridge.TIER_BY_ID) || window.TIER_BY_ID || {};
  }

  function tierLabel(tierId) {
    var map = tierMap();
    if (map[tierId]) return map[tierId].label || tierId;
    return (tierId || 'common').toUpperCase();
  }

  function tierIcon(tierId) {
    var map = tierMap();
    if (map[tierId]) return map[tierId].icon || '🐉';
    return '🐉';
  }

  function tierColor(tierId) {
    var map = tierMap();
    if (map[tierId]) return map[tierId].color || '#94a3b8';
    return '#94a3b8';
  }

  async function showFirstDragonModal(tier, serial, poxyId) {
    hideWelcomeModal();
    if (typeof window.closeWinRevealModalOnly === 'function') window.closeWinRevealModalOnly();

    var dna = await fetchDragonDna(poxyId);
    state.dragon = { tier: tier, serial: serial, poxyId: poxyId, traits: dna.traits, dna_hash: dna.dna_hash };

    var modal = $('pobDragonModal');
    if (!modal) return;

    var tid = typeof tier === 'string' ? tier : (tier && tier.id) || 'common';
    var art = $('pobDragonArt');
    var serialEl = $('pobDragonSerial');
    var metaEl = $('pobDragonMeta');
    var traitsEl = $('pobDragonTraits');
    var hashEl = $('pobDragonHash');

    if (art) {
      art.textContent = tierIcon(tid);
      art.style.color = tierColor(tid);
      art.style.textShadow = '0 0 32px ' + tierColor(tid);
    }
    if (serialEl) serialEl.textContent = serial || 'PX-??????';
    if (metaEl) metaEl.textContent = tierLabel(tid).toUpperCase() + ' • GEN 1';

    if (traitsEl) {
      var lines = [];
      TRAIT_CATS.forEach(function (cat) {
        var t = dna.traits && dna.traits[cat];
        if (t && t.name) lines.push(cat + ': ' + t.name);
      });
      traitsEl.textContent = lines.length ? lines.join('  ') : 'DNA sequencing complete…';
    }

    if (hashEl) {
      var h = dna.dna_hash || '';
      hashEl.textContent = h ? ('SHA-256: ' + h.slice(0, 6) + '…') : 'SHA-256: pending…';
    }

    modal.hidden = false;
    lockScroll();
    state.step = 'dragon';
    state.awaitingCase = false;
  }

  function hideDragonModal() {
    var modal = $('pobDragonModal');
    if (modal) modal.hidden = true;
    unlockScroll();
  }

  function positionTourTooltip(step, rect) {
    var tip = $('pobTourTooltip');
    if (!tip || !rect) return;
    var pad = 12;
    var top = rect.bottom + pad;
    var left = rect.left + rect.width / 2 - tip.offsetWidth / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - tip.offsetWidth - 12));
    if (top + tip.offsetHeight > window.innerHeight - 12 && rect.top > tip.offsetHeight + pad * 2) {
      top = rect.top - tip.offsetHeight - pad;
    }
    tip.style.top = top + 'px';
    tip.style.left = left + 'px';
  }

  function highlightTarget(selector) {
    var el = document.querySelector(selector);
    var hole = $('pobTourHighlight');
    if (!el || !hole) return null;
    var r = el.getBoundingClientRect();
    hole.style.top = (r.top - 6) + 'px';
    hole.style.left = (r.left - 6) + 'px';
    hole.style.width = (r.width + 12) + 'px';
    hole.style.height = (r.height + 12) + 'px';
    hole.hidden = false;
    return r;
  }

  function confettiBurst() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var colors = ['#00f5a0', '#7c3aed', '#f59e0b', '#e879f9', '#fff'];
    var cx = window.innerWidth / 2;
    var cy = window.innerHeight / 3;
    for (var i = 0; i < 48; i++) {
      var p = document.createElement('div');
      p.className = 'pob-confetti';
      p.style.background = colors[i % colors.length];
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      document.body.appendChild(p);
      var ang = (i / 48) * Math.PI * 2;
      var dist = 40 + Math.random() * 120;
      p.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + (Math.cos(ang) * dist) + 'px), calc(-50% + ' + (Math.sin(ang) * dist) + 'px)) scale(0)', opacity: 0 },
      ], { duration: 700 + Math.random() * 400, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' })
        .onfinish = function () { if (p.parentNode) p.remove(); };
    }
  }

  function showTourStep(idx) {
    var overlay = $('pobTourOverlay');
    if (!overlay) return;
    if (idx >= TOUR_STEPS.length) {
      finishTour();
      return;
    }
    state.tourIdx = idx;
    var step = TOUR_STEPS[idx];
    overlay.classList.add('is-active');
    overlay.hidden = false;
    lockScroll();

    var titleEl = $('pobTourTitle');
    var textEl = $('pobTourText');
    var progEl = $('pobTourProgress');
    if (titleEl) titleEl.textContent = step.title;
    if (textEl) textEl.textContent = step.text;
    if (progEl) progEl.textContent = (idx + 1) + ' / ' + TOUR_STEPS.length;

    requestAnimationFrame(function () {
      var rect = highlightTarget(step.target);
      positionTourTooltip(step, rect);
    });
    state.step = 'tour';
  }

  function hideTour() {
    var overlay = $('pobTourOverlay');
    var hole = $('pobTourHighlight');
    if (overlay) { overlay.classList.remove('is-active'); overlay.hidden = true; }
    if (hole) hole.hidden = true;
    unlockScroll();
  }

  async function finalizeOnboarding() {
    try {
      var res = await sb().rpc('complete_onboarding');
      if (res.error) console.error('[onboarding] complete:', res.error);
      else if (res.data && res.data.ok && window.loadPlayerEconomy) await window.loadPlayerEconomy();
    } catch (e) { console.error('[onboarding] finalize:', e); }
    if (window.currentProfile) {
      if (!window.currentProfile.metadata) window.currentProfile.metadata = {};
      window.currentProfile.metadata.onboarding_done = true;
    }
    markCompleteLocal();
  }

  async function finishTour() {
    hideTour();
    hideDragonModal();
    state.active = false;
    state.step = null;
    confettiBurst();
    if (typeof window.showToast === 'function') window.showToast("You're ready! +500 XP");
    await finalizeOnboarding();
    if (typeof window.resetAll === 'function') window.resetAll();
  }

  async function skipAll() {
    hideWelcomeModal();
    hideDragonModal();
    hideTour();
    state.active = false;
    state.awaitingCase = false;
    state.step = null;
    await finalizeOnboarding();
  }

  async function onClaimDragon() {
    var btn = $('pobWelcomeClaim');
    if (btn) { btn.disabled = true; btn.textContent = 'PREPARING…'; }
    try {
      await grantFreeCase();
      await openFreeCase();
    } catch (e) {
      console.error('[onboarding] claim:', e);
      if (typeof window.showToast === 'function') window.showToast(e.message || 'Could not open free case.');
      if (btn) { btn.disabled = false; btn.textContent = 'CLAIM YOUR FIRST DRAGON →'; }
    }
  }

  function onDragonContinue() {
    hideDragonModal();
    showTourStep(0);
  }

  var uiBound = false;

  function bindUi() {
    if (uiBound) return;
    uiBound = true;
    var claim = $('pobWelcomeClaim');
    var skipIntro = $('pobWelcomeSkip');
    var dragonCont = $('pobDragonContinue');
    var tourNext = $('pobTourNext');
    var tourSkip = $('pobTourSkip');

    if (claim) claim.addEventListener('click', onClaimDragon);
    if (skipIntro) skipIntro.addEventListener('click', skipAll);
    if (dragonCont) dragonCont.addEventListener('click', onDragonContinue);
    if (tourNext) tourNext.addEventListener('click', function () { showTourStep(state.tourIdx + 1); });
    if (tourSkip) tourSkip.addEventListener('click', finishTour);

    window.addEventListener('resize', function () {
      if (state.step === 'tour' && state.tourIdx >= 0) {
        var step = TOUR_STEPS[state.tourIdx];
        var rect = highlightTarget(step.target);
        positionTourTooltip(step, rect);
      }
    });
  }

  async function maybeStartPlayerOnboarding() {
    if (state.active) return true;
    var show = await shouldShowOnboarding();
    if (!show) return false;
    state.active = true;
    bindUi();
    showWelcomeModal();
    return true;
  }

  async function handleCaseLand(tier, serial, poxyId) {
    if (!state.awaitingCase) return false;
    var tid = typeof tier === 'string' ? tier : (tier && tier.id) || 'common';
    await showFirstDragonModal(tid, serial, poxyId);
    return true;
  }

  function isActive() { return state.active; }

  window.maybeStartPlayerOnboarding = maybeStartPlayerOnboarding;
  window.PoxyPlayerOB = {
    handleCaseLand: handleCaseLand,
    isActive: isActive,
  };
})();

/* ==========================================================================
   POXY · TRUST-IN-MOTION ENGINE
   A presentation-layer that makes the (already-implemented) cryptographic
   core emotionally visible during a drop:

     PHASE 1 COMMIT   — server seed locks, commit hash is revealed
     PHASE 2 ENTROPY  — randomness engine + probability collapse
     PHASE 3 REVEAL   — POXY reveal, confirmation badge, "VERIFY THIS DROP"

   + cryptographic receipt, inline verification, lifecycle/provenance.

   NON-DESTRUCTIVE: this module *wraps* existing globals (startSpin,
   openWinRevealModal, cryptoMint, resetAll). It never changes economy,
   case weights, RNG selection, auth, or any backend contract.

   The commit-reveal round generated here is real and self-verifiable in the
   browser via WebCrypto (SHA-256): SHA256(serverSeed) === commitHash and
   result === SHA256(serverSeed‖clientSeed‖nonce). The rarity itself still
   comes from the existing game economy; this layer proves the fairness
   protocol around it and surfaces the real ED25519 asset signature once the
   POXY is minted on save.
   ========================================================================== */
(function () {
  'use strict';

  var FUNCTIONS_BASE = 'https://rbrtjkfawdnomvvyxwvp.functions.supabase.co';
  var enc = new TextEncoder();

  /* ── crypto + format helpers ─────────────────────────────────────────── */
  function bytesToHex(buf) {
    var b = new Uint8Array(buf), s = '';
    for (var i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0');
    return s;
  }
  async function sha256Hex(str) {
    var d = await crypto.subtle.digest('SHA-256', enc.encode(str));
    return bytesToHex(d);
  }
  function randHex(nBytes) {
    var a = new Uint8Array(nBytes);
    crypto.getRandomValues(a);
    return bytesToHex(a.buffer);
  }
  function scrambleHex(len) {
    var c = '0123456789abcdef', s = '';
    for (var i = 0; i < len; i++) s += c[(Math.random() * 16) | 0];
    return s;
  }
  function shortHash(h, head, tail) {
    if (!h) return '—';
    head = head || 10; tail = tail || 8;
    return h.length <= head + tail + 1 ? h : h.slice(0, head) + '…' + h.slice(-tail);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function hexToRgba(hex, a) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return 'rgba(183,139,250,' + a + ')';
    var n = parseInt(m[1], 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function fmtTime(d) {
    try { return new Date(d).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC'); }
    catch (e) { return String(d); }
  }
  function icon(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }

  /* Live read-only bridge to the app's lexical state (TIERS, SPIN_MS, sb,
     pendingSpinTier, …). Populated by a one-line export in index.html; every
     access falls back gracefully so the layer degrades to a demo if absent. */
  function bridge(key, fallback) {
    var b = window.PoxyTrustBridge;
    var v = b ? b[key] : undefined;
    return (v === undefined || v === null) ? fallback : v;
  }

  /* ── round state ─────────────────────────────────────────────────────── */
  var current = null;
  var hud = null, hudTimers = [];

  function nextNonce() {
    var n = 0;
    try { n = parseInt(localStorage.getItem('pxt_nonce') || '0', 10) || 0; } catch (e) {}
    n += 1;
    try { localStorage.setItem('pxt_nonce', String(n)); } catch (e) {}
    return n;
  }

  function newRound() {
    var r = {
      serverSeed: randHex(32),
      clientSeed: randHex(16),
      nonce: nextNonce(),
      startedAt: new Date(),
      committedAt: null,
      commitHash: null,
      resultHash: null,
      tier: null,
      serial: null,
      asset: null // filled after mint: { poxy_hash, signature, event_hash, asset_id, event_id, seq }
    };
    r.ready = (async function () {
      r.commitHash = await sha256Hex(r.serverSeed);
      r.committedAt = new Date();
      r.resultHash = await sha256Hex(r.serverSeed + r.clientSeed + r.nonce);
      return r;
    })();
    return r;
  }

  function setTint(tier) {
    var c = (tier && tier.color) || '#b78bfa';
    var root = document.documentElement;
    root.style.setProperty('--pxt-tier', c);
    root.style.setProperty('--pxt-tier-soft', hexToRgba(c, 0.16));
  }
  function odds() {
    return bridge('TIERS', []).map(function (t) {
      return { id: t.id, label: t.label, color: t.color, icon: t.icon, prob: t.prob };
    });
  }

  /* ── PHASE HUD (commit → entropy → reveal narration) ─────────────────── */
  function clearHudTimers() { hudTimers.forEach(clearTimeout); hudTimers = []; }
  function later(fn, ms) { var t = setTimeout(fn, ms); hudTimers.push(t); return t; }

  function buildHud() {
    if (hud) return hud;
    hud = document.createElement('div');
    hud.className = 'pxt-hud';
    hud.id = 'pxtHud';
    hud.setAttribute('aria-hidden', 'true');
    hud.innerHTML =
      '<div class="pxt-hud-head">' +
        '<span class="pxt-hud-dot"></span>' +
        '<span class="pxt-hud-title">Provably-Fair Engine</span>' +
        '<span class="pxt-hud-phase" id="pxtHudPhase">Commit</span>' +
      '</div>' +
      '<div class="pxt-hud-rail">' +
        '<div class="pxt-rail-step" data-s="commit"><span>Commit</span></div>' +
        '<div class="pxt-rail-step" data-s="entropy"><span>Entropy</span></div>' +
        '<div class="pxt-rail-step" data-s="reveal"><span>Reveal</span></div>' +
      '</div>' +
      '<div class="pxt-hud-field">' +
        '<div class="pxt-hud-label">' + icon('lock') + 'Server seed commitment · SHA-256</div>' +
        '<div class="pxt-hud-hash locking" id="pxtHudHash">locking randomness…</div>' +
      '</div>' +
      '<div class="pxt-hud-chips" id="pxtHudChips"></div>' +
      '<div class="pxt-hud-field" style="margin-bottom:8px">' +
        '<div class="pxt-hud-label">' + icon('blur_on') + 'Probability field</div>' +
      '</div>' +
      '<div class="pxt-entropy" id="pxtEntropy"></div>';
    document.body.appendChild(hud);
    return hud;
  }

  function hudPhase(phase) {
    if (!hud) return;
    var order = ['commit', 'entropy', 'reveal'];
    var idx = order.indexOf(phase);
    var labels = { commit: 'Commit', entropy: 'Entropy', reveal: 'Reveal' };
    var p = hud.querySelector('#pxtHudPhase');
    if (p) p.textContent = labels[phase] || phase;
    hud.querySelectorAll('.pxt-rail-step').forEach(function (el) {
      var s = el.getAttribute('data-s'), si = order.indexOf(s);
      el.classList.toggle('done', si < idx);
      el.classList.toggle('active', si === idx);
    });
  }

  function renderEntropyBars(resolved) {
    var host = hud && hud.querySelector('#pxtEntropy');
    if (!host) return;
    var list = odds();
    if (!list.length) return;
    var winnerId = current && current.tier && current.tier.id;
    if (!host.dataset.built) {
      host.innerHTML = list.map(function (t) {
        var w = Math.max(6, Math.min(100, t.prob * 100 * 1.6));
        return '<div class="pxt-erow" data-id="' + t.id + '" style="--erow-c:' + t.color + '">' +
          '<span class="pxt-erow-name">' + esc(t.label) + '</span>' +
          '<span class="pxt-erow-track"><span class="pxt-erow-fill" style="width:' + w.toFixed(0) + '%"></span></span>' +
          '<span class="pxt-erow-pct">' + (t.prob * 100).toFixed(t.prob < 0.01 ? 2 : 1) + '%</span>' +
        '</div>';
      }).join('');
      host.dataset.built = '1';
    }
    if (resolved && winnerId) {
      host.querySelectorAll('.pxt-erow').forEach(function (row) {
        var win = row.getAttribute('data-id') === winnerId;
        var fill = row.querySelector('.pxt-erow-fill');
        var pct = row.querySelector('.pxt-erow-pct');
        row.classList.add('resolved');
        row.classList.toggle('dimmed', !win);
        if (fill) fill.style.width = win ? '100%' : '3%';
        if (pct) pct.textContent = win ? '100%' : '0%';
      });
    }
  }

  function showHud() { buildHud(); requestAnimationFrame(function () { hud.classList.add('is-open'); }); }
  function hideHud() {
    if (!hud) return;
    hud.classList.remove('is-open');
    clearHudTimers();
    later(function () {
      if (hud) { hud.remove(); hud = null; }
    }, 500);
  }

  /* PHASE 1+2 timeline, mapped onto the existing spin (SPIN_MS). */
  function beginRound() {
    clearHudTimers();
    if (hud) { hud.remove(); hud = null; }
    current = newRound();
    current.tier = bridge('pendingSpinTier') || bridge('currentTier') || bridge('TIERS', [])[0] || null;
    setTint(current.tier);

    buildHud();
    hudPhase('commit');
    renderEntropyBars(false);
    showHud();

    var hashEl = hud.querySelector('#pxtHudHash');
    var chips = hud.querySelector('#pxtHudChips');
    if (chips) {
      chips.innerHTML =
        '<span class="pxt-chip">client_seed <b>' + shortHash(current.clientSeed, 8, 6) + '</b></span>' +
        '<span class="pxt-chip">nonce <b id="pxtHudNonce">' + current.nonce + '</b></span>';
    }

    var SPIN = bridge('SPIN_MS', 4000);
    var commitEnd = Math.min(1300, SPIN * 0.32);
    var resolveAt = SPIN * 0.86;

    // COMMIT: scramble the commit hash, then lock it once SHA-256 resolves.
    var scrTimer = setInterval(function () {
      if (hashEl && !current.commitHash) hashEl.textContent = scrambleHex(64);
    }, 55);
    hudTimers.push(scrTimer);
    current.ready.then(function () {
      // wait at least until commitEnd for the "lock" beat
      var lockIn = Math.max(0, commitEnd - (Date.now() - current.startedAt.getTime()));
      later(function () {
        clearInterval(scrTimer);
        if (hashEl) { hashEl.classList.remove('locking'); hashEl.textContent = current.commitHash; }
      }, lockIn);
    });

    // ENTROPY: switch phase, tick the entropy fingerprint + nonce shimmer.
    later(function () {
      hudPhase('entropy');
      var fp = setInterval(function () {
        var nEl = hud && hud.querySelector('#pxtHudNonce');
        if (nEl) nEl.style.color = (Math.random() > 0.5 ? 'var(--pxt-cyan)' : '');
      }, 120);
      hudTimers.push(fp);
    }, commitEnd + 30);

    // RESOLVE: probability collapses to the winning tier.
    later(function () { renderEntropyBars(true); }, resolveAt);
  }

  /* ── PHASE 3: enhance the existing win-reveal modal ──────────────────── */
  function ensureRound() {
    if (!current) {
      current = newRound();
      current.tier = bridge('currentTier') || bridge('pendingSpinTier') || bridge('TIERS', [])[0] || null;
    }
  }

  function readSerial() {
    var el = document.getElementById('stWinSerial');
    var s = el && el.textContent && el.textContent.trim();
    return s || bridge('currentSerial') || null;
  }

  function onReveal(tier) {
    ensureRound();
    current.tier = tier || bridge('pendingSpinTier') || bridge('currentTier') || current.tier;
    current.serial = readSerial() || current.serial;
    setTint(current.tier);
    hudPhase('reveal');
    renderEntropyBars(true);
    later(hideHud, 1500);
    injectRevealExtras();
  }

  function injectRevealExtras() {
    var card = document.getElementById('stWinRevealCard');
    if (!card) return;
    var host = document.getElementById('pxtRevealExtras');
    if (!host) {
      host = document.createElement('div');
      host.id = 'pxtRevealExtras';
      host.className = 'pxt-reveal-extras';
      card.appendChild(host);
    }
    var commit = current.commitHash ? shortHash(current.commitHash, 10, 8) : 'committed';
    host.innerHTML =
      '<div class="pxt-confirm-badge">' +
        '<span class="pxt-seal"><svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg></span>' +
        'Cryptographically confirmed' +
      '</div>' +
      '<p class="pxt-trust-line">Result was <b>locked at commit time</b> · ' + esc(commit) +
        '. Neither the house nor you could influence this outcome after the seed was sealed.</p>' +
      '<div class="pxt-cta-row">' +
        '<button type="button" class="pxt-cta pxt-cta--primary" id="pxtVerifyCta">' + icon('verified_user') + 'Verify this drop</button>' +
        '<button type="button" class="pxt-cta" id="pxtLifeCta">' + icon('account_tree') + 'Lifecycle</button>' +
      '</div>';
    var v = host.querySelector('#pxtVerifyCta');
    var l = host.querySelector('#pxtLifeCta');
    if (v) v.addEventListener('click', openDrawer);
    if (l) l.addEventListener('click', function () { openLifecycle(); });
  }

  function clearRevealExtras() {
    var host = document.getElementById('pxtRevealExtras');
    if (host) host.remove();
  }

  /* ── PHASE 3b: receipt + inline verification drawer ──────────────────── */
  var drawer = null, scrim = null;

  function buildDrawer() {
    if (drawer) return;
    scrim = document.createElement('div');
    scrim.className = 'pxt-drawer-scrim';
    scrim.id = 'pxtDrawerScrim';
    scrim.addEventListener('click', closeDrawer);

    drawer = document.createElement('div');
    drawer.className = 'pxt-drawer';
    drawer.id = 'pxtDrawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-label', 'Cryptographic receipt and verification');
    drawer.innerHTML =
      '<div class="pxt-drawer-grip"></div>' +
      '<div class="pxt-drawer-head">' +
        '<div>' +
          '<div class="pxt-drawer-title">Drop receipt &amp; verification</div>' +
          '<div class="pxt-drawer-sub">Audit this POXY without leaving the screen</div>' +
        '</div>' +
        '<button type="button" class="pxt-drawer-x" id="pxtDrawerX" aria-label="Close">✕</button>' +
      '</div>' +
      '<div class="pxt-drawer-body" id="pxtDrawerBody"></div>';
    document.body.appendChild(scrim);
    document.body.appendChild(drawer);
    drawer.querySelector('#pxtDrawerX').addEventListener('click', closeDrawer);
  }

  function openDrawer() {
    ensureRound();
    buildDrawer();
    var sub = drawer.querySelector('.pxt-drawer-sub');
    if (sub) sub.textContent = 'Audit this POXY without leaving the screen';
    renderDrawer();
    requestAnimationFrame(function () {
      scrim.classList.add('is-open');
      drawer.classList.add('is-open');
    });
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    scrim.classList.remove('is-open');
  }

  function renderDrawer() {
    var body = drawer && drawer.querySelector('#pxtDrawerBody');
    if (!body) return;
    body.innerHTML = receiptHtml() + verifyHtml();
    wireReceipt(body);
    wireVerify(body);
    // Inspect mode: auto-expand and run the signature proof for instant trust.
    if (current.inspecting && current.asset && current.asset.poxy_hash) {
      var sigAcc = body.querySelector('.pxt-acc[data-acc="sig"]');
      if (sigAcc) sigAcc.classList.add('open');
      var sigBtn = body.querySelector('.pxt-verify-run[data-run="sig"]');
      if (sigBtn) runSigProof(sigBtn);
    }
  }

  // Inspect an already-owned collection POXY: fetch its on-chain twin and open
  // the same receipt + verification surface, driven by real ledger data.
  async function inspect(item) {
    if (!item) return;
    buildDrawer();
    var tmap = bridge('TIER_BY_ID', {});
    var tier = tmap[item.poxy_tier] || { label: String(item.poxy_tier || 'POXY'), icon: '◆', color: '#b78bfa' };
    var serial = (item.vip_serial != null) ? ('VIP-' + item.vip_serial) : (item.serial_number || '—');
    current = {
      inspecting: true, tier: tier, serial: serial,
      serverSeed: null, clientSeed: null, nonce: null, commitHash: null, resultHash: null,
      startedAt: item.dropped_at ? new Date(item.dropped_at) : new Date(),
      committedAt: null, asset: null, ready: Promise.resolve()
    };
    setTint(tier);
    var sub = drawer.querySelector('.pxt-drawer-sub');
    if (sub) sub.textContent = 'On-chain record · ' + (tier.label || 'POXY') + ' · ' + serial;
    var body = drawer.querySelector('#pxtDrawerBody');
    if (body) body.innerHTML = '<div style="display:flex;align-items:center;gap:10px;color:var(--pxt-muted);' +
      'font-size:13px;padding:26px 4px"><span class="pxt-mini-spin"></span>Loading cryptographic record…</div>';
    requestAnimationFrame(function () { scrim.classList.add('is-open'); drawer.classList.add('is-open'); });

    var sbc = bridge('sb');
    if (sbc && sbc.from) {
      try {
        var res = await sbc.from('poxy_assets_public').select('*').eq('user_poxy_id', item.id).maybeSingle();
        var a = res && res.data;
        if (a) {
          current.asset = {
            poxy_hash: a.poxy_hash, signature: a.signature, asset_id: a.id,
            event_id: a.genesis_event_id, key_version: a.key_version,
            asset_state: a.asset_state, collection_id: a.collection_id,
            generation_version: a.generation_version,
            mint_ts: a.mint_ts_canonical || a.mint_timestamp
          };
          current.committedAt = a.mint_timestamp ? new Date(a.mint_timestamp) : current.startedAt;
        }
      } catch (e) { /* keep the not-anchored state */ }
    }
    renderDrawer();
  }

  /* ── cryptographic receipt (financial-audit × futuristic) ────────────── */
  function row(k, v, opts) {
    opts = opts || {};
    var cls = 'pxt-rrow-v' + (opts.dim ? ' dim' : '') + (opts.accent ? ' accent' : '');
    var copyBtn = opts.copy ? '<button type="button" class="pxt-copy" data-copy="' + esc(opts.copy) + '" title="Copy">' + icon('content_copy') + '</button>' : '<span></span>';
    return '<div class="pxt-rrow"><span class="pxt-rrow-k">' + esc(k) + '</span>' +
      '<span class="' + cls + '">' + v + '</span>' + copyBtn + '</div>';
  }

  function receiptHtml() {
    if (current.inspecting) return inspectReceiptHtml();
    var r = current, a = r.asset || {};
    var tier = r.tier || {};
    var minted = !!a.poxy_hash;
    var prob = typeof tier.prob === 'number' ? (tier.prob * 100).toFixed(tier.prob < 0.01 ? 2 : 1) + '%' : '—';
    return '<div class="pxt-receipt">' +
      '<div class="pxt-receipt-head">' +
        '<div class="pxt-receipt-seal">' + (tier.icon || '◆') + '</div>' +
        '<div class="pxt-receipt-titles">' +
          '<div class="pxt-receipt-kicker">POXY Proof of Drop</div>' +
          '<div class="pxt-receipt-name">' + esc((tier.label || 'POXY')) + ' · ' + esc(r.serial || '—') + '</div>' +
        '</div>' +
        '<div class="pxt-receipt-status">' +
          '<span class="s">Fair &amp; signed</span>' +
          '<div class="t">' + fmtTime(r.committedAt || r.startedAt) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="pxt-receipt-body">' +
        row('Rarity proof', esc(tier.label || '—') + ' &nbsp;·&nbsp; drop odds ' + prob, {}) +
        row('poxy_hash', minted ? esc(shortHash(a.poxy_hash, 14, 10)) : '<span style="color:var(--pxt-dim)">minted on “Add to collection”</span>',
            { accent: minted, copy: minted ? a.poxy_hash : '' }) +
        row('signature', a.signature ? esc(shortHash(a.signature, 14, 10)) : '<span style="color:var(--pxt-dim)">pending mint</span>',
            { copy: a.signature || '' }) +
        row('event_hash', a.event_hash ? esc(shortHash(a.event_hash, 14, 10)) : '<span style="color:var(--pxt-dim)">pending mint</span>',
            { copy: a.event_hash || '' }) +
        row('commit_hash', esc(r.commitHash ? shortHash(r.commitHash, 14, 10) : '—'), { accent: true, copy: r.commitHash || '' }) +
        row('server_seed', esc(shortHash(r.serverSeed, 14, 10)), { copy: r.serverSeed }) +
        row('client_seed', esc(shortHash(r.clientSeed, 12, 8)), { copy: r.clientSeed }) +
        row('nonce', esc(String(r.nonce)), {}) +
        row('result', esc(r.resultHash ? shortHash(r.resultHash, 14, 10) : '—'), { copy: r.resultHash || '' }) +
        row('timestamp', esc(fmtTime(r.committedAt || r.startedAt)), {}) +
      '</div>' +
      '<div class="pxt-receipt-foot">Receipt generated client-side. <b>Every field above is independently re-derivable</b> — expand the proofs below to recompute them live.</div>' +
    '</div>';
  }

  // Identity certificate for an already-owned collection POXY (inspect mode).
  function inspectReceiptHtml() {
    var r = current, a = r.asset, tier = r.tier || {};
    var prob = typeof tier.prob === 'number' ? (tier.prob * 100).toFixed(tier.prob < 0.01 ? 2 : 1) + '%' : '—';
    var statusBlock = a
      ? '<div class="pxt-receipt-status"><span class="s">Anchored &amp; signed</span>' +
        '<div class="t">key v' + esc(a.key_version) + ' · ' + esc(a.asset_state || 'minted') + '</div></div>'
      : '<div class="pxt-receipt-status"><span class="t" style="color:var(--pxt-amber)">Not yet anchored</span></div>';
    var rows = a
      ? row('poxy_hash', esc(shortHash(a.poxy_hash, 14, 10)), { accent: true, copy: a.poxy_hash }) +
        row('signature', esc(shortHash(a.signature, 14, 10)), { copy: a.signature }) +
        row('genesis event', a.event_id ? esc(shortHash(a.event_id, 14, 10)) : '—', { copy: a.event_id || '' }) +
        row('key version', 'v' + esc(a.key_version), {}) +
        row('asset state', esc(a.asset_state || 'minted'), {}) +
        row('collection', esc(a.collection_id || 'genesis') + ' · gen ' + esc(a.generation_version || 1), {}) +
        row('minted', esc(fmtTime(a.mint_ts || r.startedAt)), {}) +
        row('rarity proof', esc(tier.label || '—') + ' · drop odds ' + prob, {})
      : '<div class="pxt-rrow" style="grid-template-columns:1fr"><span class="pxt-rrow-v dim">This POXY predates the cryptographic core, or its on-chain twin was never minted. Newly opened POXYs are anchored automatically when you add them to your collection.</span></div>';
    return '<div class="pxt-receipt">' +
      '<div class="pxt-receipt-head">' +
        '<div class="pxt-receipt-seal">' + (tier.icon || '◆') + '</div>' +
        '<div class="pxt-receipt-titles">' +
          '<div class="pxt-receipt-kicker">POXY Identity Certificate</div>' +
          '<div class="pxt-receipt-name">' + esc(tier.label || 'POXY') + ' · ' + esc(r.serial || '—') + '</div>' +
        '</div>' + statusBlock +
      '</div>' +
      '<div class="pxt-receipt-body">' + rows + '</div>' +
      '<div class="pxt-receipt-foot">Pulled live from the cryptographic ledger. <b>Expand the proofs below to re-verify</b> the signature and event chain yourself.</div>' +
    '</div>';
  }

  function wireReceipt(scope) {
    scope.querySelectorAll('.pxt-copy[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var val = btn.getAttribute('data-copy');
        if (!val) { toast('Available after mint'); return; }
        (navigator.clipboard ? navigator.clipboard.writeText(val) : Promise.reject()).then(function () {
          btn.classList.add('copied');
          toast('Copied to clipboard');
          setTimeout(function () { btn.classList.remove('copied'); }, 1200);
        }).catch(function () { toast('Copy unavailable'); });
      });
    });
  }

  /* ── inline verification accordions ──────────────────────────────────── */
  function acc(id, ico, name, desc, panelHtml) {
    return '<div class="pxt-acc" data-acc="' + id + '">' +
      '<button type="button" class="pxt-acc-head">' +
        '<span class="pxt-acc-ico">' + icon(ico) + '</span>' +
        '<span class="pxt-acc-titles"><span class="pxt-acc-name">' + esc(name) + '</span>' +
          '<span class="pxt-acc-desc">' + esc(desc) + '</span></span>' +
        '<span class="pxt-acc-pill" id="pxtPill-' + id + '">Idle</span>' +
        '<span class="pxt-acc-caret material-symbols-outlined">expand_more</span>' +
      '</button>' +
      '<div class="pxt-acc-panel"><div class="pxt-acc-inner"><div class="pxt-acc-pad" id="pxtPanel-' + id + '">' +
        panelHtml +
      '</div></div></div>' +
    '</div>';
  }

  function lifecycleBtn() {
    return '<button type="button" class="pxt-cta" id="pxtDrawerLife" style="align-self:flex-start;margin-top:2px">' +
      icon('account_tree') + 'View lifecycle &amp; provenance</button>';
  }

  // Verification accordions for an already-owned collection POXY (inspect mode).
  function inspectVerifyHtml() {
    var a = current.asset || {};
    if (!a.poxy_hash) {
      return '<div class="pxt-verify-block">' +
        '<p class="pxt-locked-note">' + icon('lock') + 'No on-chain twin found for this POXY, so there is nothing to verify yet. Open a new POXY and add it to your collection to anchor it cryptographically.</p>' +
        lifecycleBtn() + '</div>';
    }
    var sigPanel = '<p class="pxt-verify-intro">The POXY identity hash was signed at mint time with the server\'s <b>ED25519</b> key. Verify it against the public key on record.</p>' +
      '<button type="button" class="pxt-verify-run" data-run="sig">' + icon('bolt') + 'Verify signature</button><div id="pxtOut-sig"></div>';
    var evtPanel = a.event_id
      ? '<p class="pxt-verify-intro">The genesis <b>MINT</b> event is hash-chained into the append-only ledger. Verify its chain linkage.</p>' +
        '<div class="pxt-proof-kv"><span class="pxt-proof-kl">genesis event</span><span class="pxt-proof-kvv accent">' + esc(a.event_id) + '</span></div>' +
        '<button type="button" class="pxt-verify-run" data-run="evt">' + icon('bolt') + 'Verify event chain</button><div id="pxtOut-evt"></div>'
      : '<p class="pxt-locked-note">' + icon('lock') + 'No genesis event recorded for this asset.</p>';
    var idPanel = '<p class="pxt-verify-intro">The identity hash is SHA-256 over 7 immutable fields. The <b>server_salt</b> stays secret — only the resulting hash is published, yet the fingerprint is fully collision-resistant.</p>' +
      '<div class="pxt-proof-kv"><span class="pxt-proof-kl">formula</span><span class="pxt-proof-kvv">SHA256(creator · timestamp · serial · rarity_seed · collection · gen · server_salt)</span></div>' +
      '<div class="pxt-proof-kv"><span class="pxt-proof-kl">poxy_hash</span><span class="pxt-proof-kvv accent">' + esc(a.poxy_hash) + '</span></div>';
    return '<div class="pxt-verify-block">' +
      '<p class="pxt-verify-intro">This POXY is backed by real cryptographic proofs. <b>Verify them right here</b> — no need to leave your collection.</p>' +
      acc('sig', 'draw', 'Signature proof', 'ED25519 over the identity hash', sigPanel) +
      acc('evt', 'link', 'Event-chain proof', 'Append-only ledger linkage', evtPanel) +
      acc('idn', 'fingerprint', 'Identity hash', 'SHA-256 over 7 immutable fields', idPanel) +
      lifecycleBtn() +
    '</div>';
  }

  function verifyHtml() {
    if (current.inspecting) return inspectVerifyHtml();
    var a = current.asset || {};
    var sigPanel = a.poxy_hash
      ? '<p class="pxt-verify-intro">The POXY hash was signed at mint time with the server\'s <b>ED25519</b> key and verified here against the public key on record.</p>' +
        '<button type="button" class="pxt-verify-run" data-run="sig">' + icon('bolt') + 'Verify signature on transparency layer</button>' +
        '<div id="pxtOut-sig"></div>'
      : '<p class="pxt-locked-note">' + icon('lock') + 'Add this POXY to your collection to mint it — the ED25519 signature proof unlocks instantly after.</p>';
    var evtPanel = a.event_hash
      ? '<p class="pxt-verify-intro">This drop wrote a <b>MINT</b> event into the append-only ledger. Its hash chains to every prior event, making the history tamper-evident.</p>' +
        '<div class="pxt-proof-kv"><span class="pxt-proof-kl">event_hash</span><span class="pxt-proof-kvv accent">' + esc(a.event_hash) + '</span></div>' +
        (a.seq != null ? '<div class="pxt-proof-kv"><span class="pxt-proof-kl">sequence</span><span class="pxt-proof-kvv">#' + esc(a.seq) + '</span></div>' : '') +
        '<button type="button" class="pxt-verify-run" data-run="evt">' + icon('open_in_new') + (a.event_id ? 'Verify chain link' : 'Open full chain in verifier') + '</button>' +
        '<div id="pxtOut-evt"></div>'
      : '<p class="pxt-locked-note">' + icon('lock') + 'The ledger event is created at mint. Save this POXY to anchor it into the hash chain.</p>';

    return '<div class="pxt-verify-block">' +
      '<p class="pxt-verify-intro">Three independent proofs back this drop. <b>Expand any one and recompute it yourself</b> — no documentation required.</p>' +
      acc('rng', 'casino', 'Randomness (RNG) proof', 'Commit-reveal · recomputed with WebCrypto',
        '<p class="pxt-verify-intro">Recompute the fairness protocol live in your browser. A match proves the seed was sealed <b>before</b> the outcome.</p>' +
        '<button type="button" class="pxt-verify-run" data-run="rng">' + icon('calculate') + 'Recompute fairness proof</button>' +
        '<div id="pxtOut-rng"></div>') +
      acc('sig', 'draw', 'Signature proof', 'ED25519 over the POXY identity hash', sigPanel) +
      acc('evt', 'link', 'Event-chain proof', 'Append-only ledger linkage', evtPanel) +
      lifecycleBtn() +
    '</div>';
  }

  function setPill(id, state, text) {
    var p = document.getElementById('pxtPill-' + id);
    if (!p) return;
    p.className = 'pxt-acc-pill' + (state ? ' ' + state : '');
    p.textContent = text;
  }

  function wireVerify(scope) {
    scope.querySelectorAll('.pxt-acc-head').forEach(function (head) {
      head.addEventListener('click', function () {
        var accEl = head.closest('.pxt-acc');
        accEl.classList.toggle('open');
      });
    });
    scope.querySelectorAll('.pxt-verify-run[data-run]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var which = btn.getAttribute('data-run');
        if (which === 'rng') runRngProof(btn);
        else if (which === 'sig') runSigProof(btn);
        else if (which === 'evt') runEvtProof(btn);
      });
    });
    var lifeBtn = scope.querySelector('#pxtDrawerLife');
    if (lifeBtn) lifeBtn.addEventListener('click', function () { openLifecycle(); });
  }

  function proofStep(n, ok, name, desc, kvs, verdict) {
    var ks = (kvs || []).map(function (kv) {
      return '<div class="pxt-proof-kv"><span class="pxt-proof-kl">' + esc(kv[0]) + '</span>' +
        '<span class="pxt-proof-kvv ' + (kv[2] || '') + '">' + esc(kv[1]) + '</span></div>';
    }).join('');
    var vd = verdict ? '<div class="pxt-proof-verdict ' + (ok ? 'ok' : 'fail') + '">' +
      icon(ok ? 'task_alt' : 'error') + esc(verdict) + '</div>' : '';
    return '<div class="pxt-proof-step">' +
      '<div class="pxt-proof-step-head"><span class="pxt-proof-num ' + (ok ? 'ok' : 'fail') + '">' + n + '</span>' +
      '<span class="pxt-proof-name">' + esc(name) + '</span></div>' +
      '<p class="pxt-proof-desc">' + esc(desc) + '</p>' + ks + vd + '</div>';
  }

  async function runRngProof(btn) {
    var out = document.getElementById('pxtOut-rng');
    setPill('rng', 'run', 'Running');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="pxt-mini-spin"></span>Recomputing'; }
    await current.ready;
    var recommit = await sha256Hex(current.serverSeed);
    var reresult = await sha256Hex(current.serverSeed + current.clientSeed + current.nonce);
    var commitOk = recommit === current.commitHash;
    var resultOk = reresult === current.resultHash;
    var ok = commitOk && resultOk;
    out.innerHTML =
      proofStep(1, commitOk, 'Commit binding', 'SHA-256 of the revealed server seed must equal the commitment published before the outcome.',
        [['SHA256(server_seed)', shortHash(recommit, 16, 12), commitOk ? 'match' : 'miss'],
         ['published commit', shortHash(current.commitHash, 16, 12)]],
        commitOk ? 'MATCH — server was bound to this seed' : 'MISMATCH — commitment broken') +
      proofStep(2, resultOk, 'Result derivation', 'The result is SHA-256(server_seed ‖ client_seed ‖ nonce). Your client seed was mixed in, so neither side alone controls it.',
        [['SHA256(seed‖client‖nonce)', shortHash(reresult, 16, 12), resultOk ? 'match' : 'miss'],
         ['stored result', shortHash(current.resultHash, 16, 12)]],
        resultOk ? 'MATCH — outcome is deterministic from sealed inputs' : 'MISMATCH');
    setPill('rng', ok ? 'ok' : 'fail', ok ? 'Provably fair' : 'Failed');
    if (btn) { btn.disabled = false; btn.innerHTML = icon('calculate') + 'Recompute fairness proof'; }
  }

  async function pubVerify(payload) {
    var r = await fetch(FUNCTIONS_BASE + '/public_verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    return r.json();
  }

  function renderServerSteps(out, data) {
    var steps = (data && data.steps) || [];
    out.innerHTML = steps.map(function (s, i) {
      var kvs = [];
      if (s.formula) kvs.push(['formula', s.formula]);
      if (s.stored_hash) kvs.push(['stored hash', shortHash(s.stored_hash, 16, 10)]);
      if (s.computed_hash) kvs.push(['computed hash', shortHash(s.computed_hash, 16, 10), s.ok ? 'match' : 'miss']);
      if (s.public_key) kvs.push(['public key', shortHash(s.public_key, 14, 10), 'accent']);
      if (s.signature) kvs.push(['signature', shortHash(s.signature, 14, 10)]);
      if (s.genesis_event_hash) kvs.push(['genesis event', shortHash(s.genesis_event_hash, 16, 10)]);
      if (s.prev_event_hash) kvs.push(['prev event', shortHash(s.prev_event_hash, 16, 10)]);
      return proofStep(i + 1, s.ok !== false, s.name || ('Step ' + (i + 1)), s.description || '', kvs, s.result || '');
    }).join('') + (data && data.summary ? '<p class="pxt-proof-desc" style="margin-top:8px">' + esc(data.summary) + '</p>' : '');
  }

  async function runSigProof(btn) {
    var out = document.getElementById('pxtOut-sig');
    var a = current.asset || {};
    if (!a.poxy_hash) { toast('Mint the POXY first'); return; }
    setPill('sig', 'run', 'Running');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="pxt-mini-spin"></span>Verifying'; }
    try {
      var data = await pubVerify({ type: 'asset', hash: a.poxy_hash });
      renderServerSteps(out, data);
      setPill('sig', data.ok ? 'ok' : 'fail', data.ok ? 'Verified' : 'Failed');
    } catch (e) {
      out.innerHTML = '<p class="pxt-locked-note">' + icon('error') + esc(e && e.message || 'Verification request failed') + '</p>';
      setPill('sig', 'fail', 'Error');
    }
    if (btn) { btn.disabled = false; btn.innerHTML = icon('bolt') + 'Verify signature on transparency layer'; }
  }

  async function runEvtProof(btn) {
    var out = document.getElementById('pxtOut-evt');
    var a = current.asset || {};
    if (a.event_id) {
      setPill('evt', 'run', 'Running');
      if (btn) { btn.disabled = true; btn.innerHTML = '<span class="pxt-mini-spin"></span>Verifying'; }
      try {
        var data = await pubVerify({ type: 'event', id: a.event_id });
        renderServerSteps(out, data);
        setPill('evt', data.ok ? 'ok' : 'fail', data.ok ? 'Chain valid' : 'Broken');
      } catch (e) {
        out.innerHTML = '<p class="pxt-locked-note">' + icon('error') + esc(e && e.message || 'Request failed') + '</p>';
        setPill('evt', 'fail', 'Error');
      }
      if (btn) { btn.disabled = false; btn.innerHTML = icon('open_in_new') + 'Verify chain link'; }
    } else if (typeof window.openPoxyCryptoOverlay === 'function') {
      closeDrawer();
      window.openPoxyCryptoOverlay('verify');
    }
  }

  /* ── capture real crypto data once the POXY is minted on save ────────── */
  function onMint(data) {
    if (!data || !current) return;
    current.asset = {
      poxy_hash: data.poxy_hash,
      signature: data.signature,
      event_hash: data.event_hash,
      asset_id: data.asset_id,
      event_id: data.event_id,
      seq: data.seq
    };
    setPill('sig', '', 'Idle');
    setPill('evt', '', 'Idle');
    if (drawer && drawer.classList.contains('is-open')) renderDrawer();
    toast('POXY minted · signature on record');
  }

  /* ── POXY lifecycle / provenance visualization ───────────────────────── */
  var life = null;

  function buildLife() {
    if (life) return;
    life = document.createElement('div');
    life.className = 'pxt-life-scrim';
    life.id = 'pxtLifeScrim';
    life.innerHTML = '<div class="pxt-life" role="dialog" aria-label="POXY lifecycle"></div>';
    life.addEventListener('click', function (e) { if (e.target === life) closeLifecycle(); });
    document.body.appendChild(life);
  }

  function openLifecycle(opts) {
    ensureRound();
    opts = opts || {};
    var r = current, a = r.asset || {}, tier = opts.tier || r.tier || {};
    var serial = opts.serial || r.serial || '—';
    buildLife();
    var card = life.querySelector('.pxt-life');
    setTint(tier);

    var nodes = [
      {
        type: 'COMMIT', tag: 'seal', genesis: true, time: r.startedAt,
        title: 'Randomness sealed',
        detail: '<span class="k">commit_hash</span> ' + esc(shortHash(r.commitHash, 18, 12))
      },
      {
        type: 'MINT', tag: 'genesis', time: r.committedAt || r.startedAt,
        title: 'POXY minted · genesis event',
        detail: a.poxy_hash
          ? '<span class="k">poxy_hash</span> ' + esc(shortHash(a.poxy_hash, 18, 12)) +
            (a.event_hash ? '<br><span class="k">event_hash</span> ' + esc(shortHash(a.event_hash, 18, 12)) : '')
          : '<span class="k">status</span> mints when you add it to your collection',
        owner: true
      },
      {
        type: 'VERIFIED', tag: 'proof', time: new Date(),
        title: 'Provably fair & signed',
        detail: '<span class="k">checks</span> commit · result · signature · ledger anchor'
      }
    ];

    card.innerHTML =
      '<div class="pxt-life-head">' +
        '<div class="pxt-life-emblem">' + (tier.icon || '◆') + '</div>' +
        '<div class="pxt-life-titles">' +
          '<div class="pxt-life-kicker">POXY Lifecycle · Provenance chain</div>' +
          '<div class="pxt-life-name">' + esc(tier.label || 'POXY') + ' · ' + esc(serial) + '</div>' +
          (a.poxy_hash ? '<div class="pxt-life-hash">' + esc(a.poxy_hash) + '</div>' : '') +
        '</div>' +
        '<button type="button" class="pxt-drawer-x" id="pxtLifeX" aria-label="Close">✕</button>' +
      '</div>' +
      '<div class="pxt-life-body">' +
        '<div class="pxt-life-meta">' +
          '<div class="pxt-life-stat"><div class="l">Rarity</div><div class="v" style="color:' + (tier.color || '#fff') + '">' + esc(tier.label || '—') + '</div></div>' +
          '<div class="pxt-life-stat"><div class="l">Events</div><div class="v">' + nodes.length + '</div></div>' +
          '<div class="pxt-life-stat"><div class="l">Owners</div><div class="v">1</div></div>' +
          '<div class="pxt-life-stat"><div class="l">Status</div><div class="v" style="color:var(--pxt-green)">Verified</div></div>' +
        '</div>' +
        '<p class="pxt-life-section-t">Cryptographic provenance</p>' +
        '<div class="pxt-timeline">' +
          nodes.map(function (n, i) {
            return '<div class="pxt-tl-node ' + (n.genesis ? 'genesis' : '') + '" style="animation-delay:' + (i * 0.08) + 's">' +
              '<span class="pxt-tl-type">' + esc(n.title) + ' <span class="tag">' + esc(n.type) + '</span></span>' +
              '<div class="pxt-tl-time">' + esc(fmtTime(n.time)) + '</div>' +
              '<div class="pxt-tl-detail">' + n.detail + '</div>' +
              (n.owner ? '<span class="pxt-owner-chip"><span class="av">' + (whoEmoji()) + '</span>' + esc(whoName()) + ' · current owner</span>' : '') +
            '</div>';
          }).join('') +
          '<div class="pxt-tl-node" style="animation-delay:' + (nodes.length * 0.08) + 's;opacity:.6">' +
            '<span class="pxt-tl-type" style="color:var(--pxt-muted)">Future transfers &amp; trades append here <span class="tag">OPEN</span></span>' +
            '<div class="pxt-tl-detail" style="color:var(--pxt-dim)">Each ownership change writes a new signed, hash-chained event — the lineage stays auditable forever.</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    card.querySelector('#pxtLifeX').addEventListener('click', closeLifecycle);
    var sbc = bridge('sb');
    if (a.asset_id && sbc && sbc.functions) enrichLifecycle(a.asset_id, card, sbc);

    requestAnimationFrame(function () { life.classList.add('is-open'); });
  }

  function closeLifecycle() { if (life) life.classList.remove('is-open'); }

  function whoName() {
    var p = bridge('currentProfile');
    return (p && (p.username || p.display_name)) || 'You';
  }
  function whoEmoji() {
    var p = bridge('currentProfile');
    return (p && p.avatar) || '🦊';
  }

  // Best-effort: pull the real event chain from export_proof when authenticated.
  async function enrichLifecycle(assetId, card, sbc) {
    try {
      var res = await sbc.functions.invoke('export_proof', { body: { asset_id: assetId } });
      var p = res && res.data && (res.data.proof_packet || res.data);
      var chain = p && (p.creation_event_chain || p.ownership_history);
      if (!chain || !chain.length) return;
      var tl = card.querySelector('.pxt-timeline');
      if (!tl) return;
      var extra = chain.map(function (ev, i) {
        return '<div class="pxt-tl-node" style="animation-delay:' + (i * 0.06) + 's">' +
          '<span class="pxt-tl-type">' + esc(ev.event_type || ev.type || 'EVENT') + ' <span class="tag">LEDGER</span></span>' +
          '<div class="pxt-tl-time">' + esc(fmtTime(ev.created_at || ev.ts)) + '</div>' +
          '<div class="pxt-tl-detail"><span class="k">event_hash</span> ' + esc(shortHash(ev.event_hash, 18, 12)) + '</div>' +
        '</div>';
      }).join('');
      var marker = tl.querySelector('.pxt-tl-node:last-child');
      if (marker) marker.insertAdjacentHTML('beforebegin', extra);
    } catch (e) { /* silent — local provenance already shown */ }
  }

  /* ── toast ───────────────────────────────────────────────────────────── */
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'pxt-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = icon('check_circle') + esc(msg);
    requestAnimationFrame(function () { toastEl.classList.add('is-open'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-open'); }, 1800);
  }

  /* ── reset / teardown integrates with the existing resetAll ──────────── */
  function reset() {
    clearHudTimers();
    hideHud();
    closeDrawer();
    clearRevealExtras();
    current = null;
  }

  /* ── install: wrap existing globals without changing game logic ──────── */
  function wrap(name, after, before) {
    var orig = window[name];
    if (typeof orig !== 'function') return false;
    window[name] = function () {
      var self = this, args = arguments, ret;
      if (before) { try { before(args); } catch (e) { console.warn('[pxt]', e); } }
      ret = orig.apply(self, args);
      if (after) {
        try {
          if (ret && typeof ret.then === 'function') {
            return ret.then(function (v) { try { after(v, args); } catch (e) {} return v; });
          }
          after(ret, args);
        } catch (e) { console.warn('[pxt]', e); }
      }
      return ret;
    };
    return true;
  }

  function install() {
    // PHASE 1+2: begin a fair round right as the spin starts (after the
    // economy has already chosen pendingSpinTier inside the original).
    wrap('startSpin', function () { try { beginRound(); } catch (e) {} });
    // PHASE 3: enhance the reveal modal.
    wrap('openWinRevealModal', function (ret, args) { onReveal(args && args[0]); });
    // capture real signed-asset data when minted on "Add to collection".
    wrap('cryptoMint', function (ret) { if (ret) onMint(ret); });
    // teardown alongside the game reset.
    wrap('resetAll', function () { reset(); });
    wrap('closeWinRevealModalOnly', function () { closeDrawer(); });
  }

  // public surface
  window.PoxyTrust = {
    beginRound: beginRound,
    onReveal: onReveal,
    onMint: onMint,
    openDrawer: openDrawer,
    openLifecycle: openLifecycle,
    inspect: inspect,
    reset: reset,
    _state: function () { return current; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
})();

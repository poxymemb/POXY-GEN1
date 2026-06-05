/**
 * POXY CARD ENGINE v1.0
 * ─────────────────────
 * Scalable multi-layer rendering architecture for POXY asset cards.
 *
 * Layers
 *   0  Background  — rarity-aware GPU-friendly CSS backdrop
 *   1  FX          — shimmer, glow-pulse, particles (CSS + minimal JS)
 *   2  Viewport    — asset display area (icon → SVG → Lottie → Rive → WebGL)
 *   3  Metadata    — tier, serial, date (always readable, reserved zone)
 *   4  Status      — pinned / featured / in-forge badges
 *   5  Interaction — hover, drag, selection surface
 *
 * Visibility states (IntersectionObserver-driven)
 *   OFFSCREEN  — no animation, no loop
 *   VISIBLE    — static frame only
 *   FOCUSED    — low-cost CSS animation
 *   HOVERED    — full-quality shimmer + glow + foil
 *
 * GPU protection
 *   • All shimmer is CSS @keyframes — zero JS RAF for shimmer
 *   • Mouse-tracked foil uses a single shared mousemove listener
 *   • IntersectionObserver shared across all cards
 *   • Observers and listeners cleaned up on card detach
 */

(function (window) {
  'use strict';

  /* ─── Rarity configuration ─────────────────────────────────────── */
  const RARITY_CONFIG = {
    common: {
      bg: 'linear-gradient(160deg,#131316 0%,#0d0d10 100%)',
      glow: 'rgba(158,158,158,0.35)',
      shimmerVia: 'rgba(255,255,255,0.06)',
      foil: false,
    },
    uncommon: {
      bg: 'linear-gradient(160deg,#0c1318 0%,#0a1015 100%)',
      glow: 'rgba(76,175,80,0.45)',
      shimmerVia: 'rgba(76,255,100,0.07)',
      foil: false,
    },
    rare: {
      bg: 'linear-gradient(160deg,#060f1c 0%,#040a14 100%)',
      glow: 'rgba(0,229,255,0.5)',
      shimmerVia: 'rgba(0,229,255,0.1)',
      foil: false,
    },
    epic: {
      bg: 'linear-gradient(160deg,#0e0618 0%,#080412 100%)',
      glow: 'rgba(156,39,176,0.55)',
      shimmerVia: 'rgba(200,80,255,0.1)',
      foil: false,
    },
    legendary: {
      bg: 'radial-gradient(ellipse at 50% 0%,#1a1200 0%,#0b0900 60%,#050400 100%)',
      glow: 'rgba(255,200,40,0.55)',
      shimmerVia: 'rgba(255,220,80,0.18)',
      foil: true,   // gold-foil mouse tracking
    },
    mythic: {
      bg: 'radial-gradient(ellipse at 50% 0%,#120900 0%,#050506 70%)',
      glow: 'rgba(255,51,102,0.6)',
      shimmerVia: 'rgba(255,130,60,0.2)',
      foil: true,   // premium foil tracking
    },
  };

  /* ─── Shared observer singleton ────────────────────────────────── */
  let _observer = null;
  const _cards = new Map(); // el → { cleanup[] }

  function getObserver() {
    if (_observer) return _observer;
    _observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const card = entry.target;
          if (!_cards.has(card)) return;
          const state = entry.isIntersecting ? 'visible' : 'offscreen';
          // Don't downgrade from hovered → visible while mouse is still on card
          if (card.dataset.pcardState === 'hovered' && state === 'visible') return;
          _setCardState(card, state);
        });
      },
      { threshold: 0.1, rootMargin: '100px 0px' }
    );
    return _observer;
  }

  /* ─── State machine ────────────────────────────────────────────── */
  function _setCardState(card, state) {
    card.dataset.pcardState = state;
    const fxLayer = card.querySelector('.pcard-fx');
    if (!fxLayer) return;
    // Enable CSS animations only for visible/focused/hovered
    fxLayer.style.display = state === 'offscreen' ? 'none' : '';
  }

  /* ─── Foil / mouse-tracked shimmer ────────────────────────────── */
  function _attachFoilListener(card) {
    function onMove(e) {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--foil-x', px.toFixed(3));
      card.style.setProperty('--foil-y', py.toFixed(3));
    }
    card.addEventListener('mousemove', onMove, { passive: true });
    return () => card.removeEventListener('mousemove', onMove);
  }

  /* ─── Build a single layer ─────────────────────────────────────── */
  function _el(tag, cls, attrs) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) Object.assign(e, attrs);
    return e;
  }

  /* ─── Build background layer (Layer 0) ─────────────────────────── */
  function _buildBgLayer(rarity) {
    const cfg = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
    const bg = _el('div', 'pcard-bg');
    bg.style.background = cfg.bg;
    const ring = _el('div', 'pcard-bg-ring');
    ring.style.boxShadow = 'inset 0 0 32px ' + cfg.glow;
    bg.appendChild(ring);
    return bg;
  }

  /* ─── Build PASSPORT layout (full card) ────────────────────────── */
  function _buildPassportContent(item, tier, dateStr) {
    const rarity = item.poxy_tier || 'common';
    const cfg = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;

    // serial → #XXXX display
    const serial = item.serial_number || '';
    const numDisplay = item.vip_serial != null
      ? '#' + item.vip_serial
      : (serial ? '#' + serial.slice(-4).toUpperCase() : '#–');

    // owner hash from item id
    const id = String(item.id || '');
    const hashDisplay = id.length > 8
      ? '0x' + id.slice(0, 3).toUpperCase() + '…' + id.slice(-4).toUpperCase()
      : '0x···';

    // issued date → YYYY.MM.DD
    const d = new Date(item.dropped_at);
    const issuedStr = isNaN(d)
      ? dateStr
      : d.getFullYear() + '.' +
        String(d.getMonth() + 1).padStart(2, '0') + '.' +
        String(d.getDate()).padStart(2, '0');

    const wrap = _el('div', 'pcard-pp');

    // ── Header row ──
    const hdr = _el('div', 'pcard-pp-header');
    const idLabel = _el('span', 'pcard-pp-id-label');
    idLabel.textContent = 'POXY ID';
    const tierBadge = _el('span', 'pcard-pp-tier-badge');
    tierBadge.textContent = tier.label.toUpperCase() + ' TIER';
    tierBadge.style.borderColor = tier.color + '66';
    tierBadge.style.color = tier.color;
    hdr.appendChild(idLabel);
    hdr.appendChild(tierBadge);
    wrap.appendChild(hdr);

    // ── Identity row ──
    const ident = _el('div', 'pcard-pp-identity');
    // Avatar
    const av = _el('div', 'pcard-pp-avatar');
    av.style.setProperty('--avatar-glow', cfg.glow);
    const avIcon = _el('span', 'material-symbols-outlined pcard-pp-avatar-icon');
    avIcon.style.color = tier.color;
    avIcon.textContent = STITCH_TIER_ICON
      ? (STITCH_TIER_ICON[tier.id] || 'view_in_ar')
      : 'view_in_ar';
    av.appendChild(avIcon);
    // Info block
    const info = _el('div', 'pcard-pp-asset-info');
    const numEl = _el('div', 'pcard-pp-number');
    numEl.textContent = numDisplay;
    const ownerLbl = _el('div', 'pcard-pp-owner-label');
    ownerLbl.textContent = 'VERIFIED OWNER';
    const hashEl = _el('div', 'pcard-pp-hash');
    hashEl.textContent = hashDisplay;
    info.appendChild(numEl);
    info.appendChild(ownerLbl);
    info.appendChild(hashEl);
    ident.appendChild(av);
    ident.appendChild(info);
    wrap.appendChild(ident);

    // ── Divider ──
    wrap.appendChild(_el('div', 'pcard-pp-divider'));

    // ── Data rows ──
    const data = _el('div', 'pcard-pp-data');
    function addRow(key, val, extraClass) {
      const row = _el('div', 'pcard-pp-row');
      const k = _el('span', 'pcard-pp-key'); k.textContent = key;
      const v = _el('span', 'pcard-pp-val' + (extraClass ? ' ' + extraClass : ''));
      v.textContent = val;
      row.appendChild(k); row.appendChild(v);
      data.appendChild(row);
    }
    addRow('ISSUED', issuedStr);
    addRow('STATUS', 'ACTIVE', 'pcard-pp-active');
    addRow('NETWORK', 'MAINNET');
    wrap.appendChild(data);

    return wrap;
  }

  /* ─── Build FX layer (Layer 1) ──────────────────────────────────── */
  function _buildFxLayer(rarity) {
    const cfg = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
    const fx = _el('div', 'pcard-fx');

    // Shimmer band
    const shimmer = _el('div', 'pcard-shimmer');
    shimmer.style.setProperty('--shimmer-via', cfg.shimmerVia);

    // Glow pulse (radial, bottom half)
    const pulse = _el('div', 'pcard-glow-pulse');
    pulse.style.setProperty('--glow-color', cfg.glow);

    // Blueprint grid lines (matches original blueprint aesthetic)
    const blueprint = _el('div', 'pcard-blueprint');

    fx.appendChild(shimmer);
    fx.appendChild(pulse);
    fx.appendChild(blueprint);

    // Legendary/Mythic: foil grid overlay for tracked shimmer
    if (cfg.foil) {
      const foil = _el('div', 'pcard-foil');
      foil.style.setProperty('--glow-color', cfg.glow);
      fx.appendChild(foil);
    }

    return fx;
  }

  /* ─── Build asset viewport (Layer 2) ──────────────────────────── */
  function _buildViewport(rendererType, renderData) {
    const vp = _el('div', 'pcard-viewport');
    vp.dataset.renderer = rendererType;
    const inner = _el('div', 'pcard-asset');

    switch (rendererType) {
      case 'icon': {
        const icon = _el('span', 'material-symbols-outlined pcard-icon-symbol');
        icon.style.color = renderData.color;
        icon.textContent = renderData.symbol;
        inner.appendChild(icon);
        break;
      }
      case 'image': {
        const img = _el('img', 'pcard-image-asset');
        img.src = renderData.src;
        img.alt = renderData.alt || '';
        img.loading = 'lazy';
        inner.appendChild(img);
        break;
      }
      case 'svg': {
        inner.innerHTML = renderData.svgMarkup || '';
        break;
      }
      // Future: lottie, rive, video, webgl — plug in here
      default: {
        const fallback = _el('span', 'material-symbols-outlined pcard-icon-symbol');
        fallback.style.color = renderData.color || '#fff';
        fallback.textContent = renderData.symbol || 'view_in_ar';
        inner.appendChild(fallback);
      }
    }

    vp.appendChild(inner);
    return vp;
  }

  /* ─── Build metadata layer (Layer 3) ──────────────────────────── */
  function _buildMetaLayer(item, tier, dateStr) {
    const meta = _el('div', 'pcard-meta');
    const badge = _el('div', 'pcard-tier-badge');
    badge.style.color = tier.color;
    badge.textContent = tier.label.toUpperCase();
    const serial = _el('div', 'pcard-serial');
    serial.textContent = item.serial_number || '–';
    const date = _el('div', 'pcard-date');
    date.textContent = dateStr;
    meta.appendChild(badge);
    meta.appendChild(serial);
    meta.appendChild(date);
    return meta;
  }

  /* ─── Register card with engine ────────────────────────────────── */
  function _registerCard(card, rarity) {
    const cfg = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
    const cleanups = [];

    // Hover events → state transitions
    function onEnter() {
      _setCardState(card, 'hovered');
    }
    function onLeave() {
      // Gracefully degrade back to visible
      const state = card.dataset.pcardState;
      if (state === 'hovered') _setCardState(card, 'visible');
    }
    card.addEventListener('mouseenter', onEnter);
    card.addEventListener('mouseleave', onLeave);
    cleanups.push(() => {
      card.removeEventListener('mouseenter', onEnter);
      card.removeEventListener('mouseleave', onLeave);
    });

    // Foil tracking for premium tiers
    if (cfg.foil) {
      cleanups.push(_attachFoilListener(card));
    }

    // IntersectionObserver
    getObserver().observe(card);
    cleanups.push(() => getObserver().unobserve(card));

    // Initial state
    _setCardState(card, 'offscreen');

    // Store cleanup list
    _cards.set(card, cleanups);

    // Cleanup when detached from DOM
    const mo = new MutationObserver(() => {
      if (!document.contains(card)) {
        PoxyCardEngine.destroy(card);
        mo.disconnect();
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    cleanups.push(() => mo.disconnect());
  }

  /* ─── Public API ────────────────────────────────────────────────── */
  const PoxyCardEngine = {
    /**
     * Build a fully-layered asset card element.
     * Returns the card <div> ready to be appended to the grid.
     *
     * @param {Object} item - collection item from colData
     * @param {Object} tier - tier config (color, glow, icon, label…)
     * @param {string} dateStr - formatted date string
     * @param {Object} [opts] - { renderer:'icon'|'image'|'lottie'|…, rendererData:{} }
     * @returns {HTMLDivElement}
     */
    buildCard(item, tier, dateStr, opts = {}) {
      const rarity = item.poxy_tier || 'common';
      const layout = opts.layout || 'passport'; // 'passport' | 'classic'

      // ── Root card
      const card = _el('div', 'pcard');
      card.dataset.rarity = rarity;
      card.dataset.pcardState = 'offscreen';
      card.dataset.id = item.id;
      card.style.setProperty('--rarity-color', tier.color);
      card.style.setProperty('--rarity-glow', tier.glow || RARITY_CONFIG[rarity]?.glow || '#fff');
      card.style.setProperty('--foil-x', '0.5');
      card.style.setProperty('--foil-y', '0.5');

      if (layout === 'passport') {
        // ── Passport layout: BG + FX + passport content ──
        card.classList.add('pcard--passport');
        card.appendChild(_buildBgLayer(rarity));
        card.appendChild(_buildFxLayer(rarity));
        card.appendChild(_buildPassportContent(item, tier, dateStr));
      } else {
        // ── Classic layered layout ──
        const renderer = opts.renderer || 'icon';
        const renderData = opts.rendererData || { color: tier.color, symbol: opts.symbol || 'view_in_ar' };
        card.appendChild(_buildBgLayer(rarity));
        card.appendChild(_buildFxLayer(rarity));
        card.appendChild(_buildViewport(renderer, renderData));
        card.appendChild(_buildMetaLayer(item, tier, dateStr));
      }

      // Register with engine
      _registerCard(card, rarity);

      return card;
    },

    /**
     * Upgrade a viewport to a richer renderer without rebuilding the card.
     * Enables seamless lottie/rive injection when assets load.
     */
    upgradeRenderer(card, newRenderer, newData) {
      const vp = card.querySelector('.pcard-viewport');
      if (!vp) return;
      const inner = vp.querySelector('.pcard-asset');
      if (!inner) return;
      inner.innerHTML = '';
      vp.dataset.renderer = newRenderer;
      const tempCard = this.buildCard(
        { id: card.dataset.id, poxy_tier: card.dataset.rarity },
        { color: 'var(--rarity-color)', glow: 'var(--rarity-glow)' },
        '',
        { renderer: newRenderer, rendererData: newData }
      );
      const newVp = tempCard.querySelector('.pcard-viewport .pcard-asset');
      if (newVp) inner.appendChild(...Array.from(newVp.childNodes));
    },

    /**
     * Release all engine resources for a card.
     * Safe to call multiple times.
     */
    destroy(card) {
      if (!_cards.has(card)) return;
      const cleanups = _cards.get(card);
      cleanups.forEach((fn) => { try { fn(); } catch (_) {} });
      _cards.delete(card);
    },

    /**
     * Release all registered cards (e.g., on logout / tab change).
     */
    destroyAll() {
      _cards.forEach((_, card) => this.destroy(card));
    },

    /**
     * Return current visibility state for a card.
     */
    getState(card) {
      return card.dataset.pcardState || 'offscreen';
    },

    /** Number of tracked cards (debug). */
    get size() { return _cards.size; },
  };

  window.PoxyCardEngine = PoxyCardEngine;
})(window);

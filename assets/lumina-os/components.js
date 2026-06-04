/**
 * Lumina OS — shared UI primitives (vanilla DOM).
 */
(function (global) {
  const U = global.LuminaChatUtil;

  function el(tag, cls, attrs) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    return node;
  }

  function icon(name, extraCls) {
    const s = el('span', 'material-symbols-outlined ' + (extraCls || ''));
    s.textContent = name;
    return s;
  }

  function glassCard(children, opts) {
    opts = opts || {};
    let cls = 'lo-glass-card';
    if (opts.inset) cls += ' lo-glass-card--inset lo-silk-inset';
    if (opts.raised) cls += ' lo-silk-raised';
    if (opts.hover) cls += ' lo-hover-lift';
    const card = el('div', cls);
    if (typeof children === 'string') card.innerHTML = children;
    else if (children) {
      if (Array.isArray(children)) children.forEach((c) => c && card.appendChild(c));
      else card.appendChild(children);
    }
    return card;
  }

  function primaryButton(label, opts) {
    opts = opts || {};
    const btn = el(
      'button',
      (opts.ghost ? 'lo-silk-raised ' : '') + 'lo-btn lo-btn--primary' + (opts.small ? ' lo-btn--sm' : '')
    );
    btn.type = 'button';
    if (opts.id) btn.id = opts.id;
    if (opts.disabled) btn.disabled = true;
    if (opts.icon) btn.appendChild(icon(opts.icon));
    btn.appendChild(el('span', '', { text: label }));
    if (opts.onClick) btn.onclick = opts.onClick;
    return btn;
  }

  function secondaryButton(label, opts) {
    opts = opts || {};
    const btn = el('button', 'lo-silk-raised lo-btn lo-btn--secondary' + (opts.small ? ' lo-btn--sm' : ''));
    btn.type = 'button';
    if (opts.icon) {
      btn.appendChild(icon(opts.icon));
      btn.appendChild(el('span', '', { text: label }));
    } else {
      btn.textContent = label;
    }
    if (opts.onClick) btn.onclick = opts.onClick;
    return btn;
  }

  function avatar(content, opts) {
    opts = opts || {};
    const wrap = el('div', 'lo-avatar' + (opts.lg ? ' lo-avatar--lg' : '') + (opts.sm ? ' lo-avatar--sm' : ''));
    if (content && String(content).startsWith('http')) {
      wrap.innerHTML =
        '<img src="' +
        U.sanitizeText(U.avatarUrl(content)) +
        '" alt="">';
    } else {
      wrap.textContent = content || '👾';
    }
    if (opts.status) {
      const dot = el('span', 'lo-status-dot lo-status-dot--' + opts.status);
      wrap.appendChild(dot);
    }
    return wrap;
  }

  function handleLine(username, displayName) {
    const wrap = el('div', 'lo-handle-wrap');
    if (displayName) {
      wrap.appendChild(el('div', 'lo-display-name', { text: displayName }));
    }
    const handle = el('div', 'lo-handle', {
      html:
        '<span class="lo-handle-at">@</span>' +
        U.sanitizeText(U.handleFromUsername(username)),
    });
    wrap.appendChild(handle);
    return wrap;
  }

  function statusIndicator(status, label) {
    const row = el('div', 'lo-status-row');
    row.appendChild(el('span', 'lo-status-dot lo-status-dot--' + (status || 'offline')));
    row.appendChild(el('span', 'lo-status-label', { text: label || status || '' }));
    return row;
  }

  function animatedWrap(child, key) {
    const w = el('div', 'lo-animate-in');
    w.dataset.animateKey = key || '';
    if (child) w.appendChild(child);
    return w;
  }

  function winRateChart(pct, id) {
    const wrap = el('div', 'lo-win-chart');
    const bar = el('div', 'lo-win-chart-track');
    const fill = el('div', 'lo-win-chart-fill');
    fill.style.width = Math.min(100, Math.max(0, pct)) + '%';
    if (id) fill.id = id;
    bar.appendChild(fill);
    wrap.appendChild(bar);
    wrap.appendChild(el('span', 'lo-win-chart-label', { text: pct.toFixed(1) + '%' }));
    return wrap;
  }

  function silkIconAction(label, iconName, tone, onClick) {
    const btn = el('button', 'lo-silk-action lo-silk-action--' + (tone || 'muted'));
    btn.type = 'button';
    btn.appendChild(icon(iconName));
    btn.appendChild(el('span', 'lo-silk-action-label', { text: label }));
    if (onClick) btn.onclick = onClick;
    return btn;
  }

  function passportAvatar(content, status) {
    const wrap = el('div', 'lo-passport-avatar-wrap');
    const ring = el('div', 'lo-passport-avatar-ring lo-silk-raised');
    ring.appendChild(avatar(content, { lg: true, status: status || 'online' }));
    wrap.appendChild(ring);
    return wrap;
  }

  function silkSwitch(id, checked) {
    const label = el('label', 'lo-silk-switch');
    const input = el('input', 'sr-only');
    input.type = 'checkbox';
    if (id) input.id = id;
    if (checked) input.checked = true;
    label.appendChild(input);
    label.appendChild(el('div', 'lo-silk-slider lo-silk-inset'));
    return label;
  }

  function themePreviewOption(mode, label, active, onClick) {
    const btn = el('button', 'lo-theme-preview' + (active ? ' is-active' : ''));
    btn.type = 'button';
    const box = el('div', 'lo-theme-preview-box lo-silk-inset');
    if (mode === 'light') {
      box.innerHTML = '<div class="lo-theme-preview-bar"></div>';
    } else if (mode === 'dark') {
      box.classList.add('lo-theme-preview-box--dark');
      box.innerHTML =
        '<div class="lo-theme-preview-bar"></div><div class="lo-theme-preview-bar lo-theme-preview-bar--short"></div>';
    } else {
      box.classList.add('lo-theme-preview-box--system');
      box.innerHTML =
        '<div class="lo-theme-preview-split"><span></span><span></span></div>';
    }
    btn.appendChild(box);
    btn.appendChild(el('span', 'lo-theme-preview-label', { text: label }));
    if (onClick) btn.onclick = onClick;
    return btn;
  }

  function moduleTopBar(cfg) {
    cfg = cfg || {};
    const bar = el('header', 'lo-module-topbar');
    const searchSlot = el('div', 'lo-module-topbar-search');
    const pill = el('div', 'lo-silk-inset lo-module-search-pill');
    pill.appendChild(icon('search'));
    const inp = el('input', '', {
      type: 'search',
      placeholder: cfg.placeholder || 'Search…',
      autocomplete: 'off',
    });
    if (cfg.searchId) inp.id = cfg.searchId;
    if (cfg.searchValue) inp.value = cfg.searchValue;
    if (cfg.onSearch) {
      inp.addEventListener('input', (e) => cfg.onSearch(e.target.value));
    }
    pill.appendChild(inp);
    searchSlot.appendChild(pill);
    bar.appendChild(searchSlot);

    const actions = el('div', 'lo-module-topbar-actions');
    ['notifications', 'videogame_asset', 'mail'].forEach((ic) => {
      const b = el('button', 'lo-silk-raised lo-icon-btn');
      b.type = 'button';
      b.appendChild(icon(ic));
      if (ic === 'notifications' && cfg.onNotifications) b.onclick = cfg.onNotifications;
      actions.appendChild(b);
    });
    const chip = el('div', 'lo-silk-raised lo-profile-chip');
    const rt =
      global.LuminaOSApp && global.LuminaOSApp.getRuntime
        ? global.LuminaOSApp.getRuntime()
        : null;
    const av = rt && rt.profile && rt.profile.avatar_url;
    if (av) {
      chip.innerHTML =
        '<img src="' + U.sanitizeText(U.avatarUrl(av)) + '" alt="You">';
    } else {
      chip.textContent = '👾';
    }
    actions.appendChild(chip);
    bar.appendChild(actions);
    return bar;
  }

  function modalBase(title, bodyNode, actions) {
    const overlay = el('div', 'lo-modal-overlay');
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
    const card = glassCard(null, {});
    card.classList.add('lo-modal-card');
    card.appendChild(el('h3', 'lo-modal-title', { text: title }));
    const body = el('div', 'lo-modal-body');
    if (bodyNode) body.appendChild(bodyNode);
    card.appendChild(body);
    const foot = el('div', 'lo-modal-foot');
    (actions || []).forEach((a) => foot.appendChild(a));
    card.appendChild(foot);
    overlay.appendChild(card);
    document.getElementById('luminaOsRoot')?.appendChild(overlay);
    return overlay;
  }

  global.LuminaOSComponents = {
    el,
    icon,
    glassCard,
    primaryButton,
    secondaryButton,
    avatar,
    handleLine,
    statusIndicator,
    animatedWrap,
    winRateChart,
    modalBase,
    silkIconAction,
    passportAvatar,
    moduleTopBar,
    silkSwitch,
    themePreviewOption,
  };
})(window);

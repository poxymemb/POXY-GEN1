/**
 * POXY Sky — shared figure passport helpers (collection + market modals).
 */
(function (global) {
  'use strict';

  var MUTATION_BY_TIER = {
    common: 'Classic',
    uncommon: 'Verdant',
    rare: 'Frost',
    epic: 'Royal',
    legendary: 'Aurora',
    mythic: 'Ember',
    obsidian: 'Void',
    cursed: 'Hex',
    souvenir: 'Keepsake',
    stellar: 'Starlit',
    diamond: 'Prism',
    secret: 'Hidden',
  };

  var TIER_EDITION_CAP = {
    common: 250,
    uncommon: 200,
    rare: 150,
    epic: 100,
    legendary: 50,
    mythic: 25,
  };

  function figureTitle(item, tier) {
    var base = 'Heart';
    if (item && item.display_name) base = String(item.display_name).split(' · ')[0] || base;
    else if (item && item.character_name) base = item.character_name;
    var sub = (tier && tier.id && MUTATION_BY_TIER[tier.id]) || (tier && tier.label) || 'Figure';
    if (item && item.traits && typeof item.traits === 'object') {
      if (item.traits.mutation) sub = item.traits.mutation;
      else if (item.traits.variant) sub = item.traits.variant;
    }
    return base + ' · ' + sub;
  }

  function passportSerial(item) {
    if (!item) return '—';
    var sn = item.serial_number;
    if (sn) {
      var s = String(sn).trim();
      if (/^PX-/i.test(s)) return s.toUpperCase();
      return 'PX-' + s.replace(/^#/, '');
    }
    var id = String(item.id || '')
      .replace(/-/g, '')
      .slice(0, 8)
      .toUpperCase();
    return id ? 'PX-' + id : '—';
  }

  function passportEdition(item, tier) {
    if (!item) return '—';
    if (item.vip_serial != null) {
      var sn = String(item.vip_serial);
      return '#' + sn.replace(/^#/, '') + ' / ' + ((tier && tier.id && TIER_EDITION_CAP[tier.id]) || 250);
    }
    var cap = (tier && tier.id && TIER_EDITION_CAP[tier.id]) || 250;
    var n = null;
    if (item.traits && item.traits.edition != null) n = Number(item.traits.edition);
    if (n == null || isNaN(n)) {
      var sn = String(item.serial_number || '');
      var m = sn.match(/(\d+)/);
      if (m) n = ((parseInt(m[1], 10) - 1) % cap) + 1;
    }
    if (n == null || isNaN(n)) n = 1;
    return n + ' / ' + cap;
  }

  function passportSeason(item) {
    if (!item) return '01';
    if (item.traits && item.traits.season != null) return String(item.traits.season).padStart(2, '0');
    if (item.season_id) {
      var s = String(item.season_id).match(/(\d+)/);
      if (s) return s[1].padStart(2, '0');
    }
    return '01';
  }

  function normalizeFromMarket(listing) {
    var p = (listing && listing.user_poxy) || {};
    return {
      id: (listing && (listing.poxy_id || listing.id)) || p.id,
      serial_number: p.serial_number,
      poxy_tier: p.poxy_tier,
      vip_serial: p.vip_serial,
      traits: p.traits,
      character_name: p.character_name,
      display_name: p.display_name,
      season_id: p.season_id,
      asset_url: p.asset_url,
    };
  }

  global.PoxyPassportSky = {
    figureTitle: figureTitle,
    passportSerial: passportSerial,
    passportEdition: passportEdition,
    passportSeason: passportSeason,
    normalizeFromMarket: normalizeFromMarket,
    MUTATION_BY_TIER: MUTATION_BY_TIER,
    TIER_EDITION_CAP: TIER_EDITION_CAP,
  };
})(window);

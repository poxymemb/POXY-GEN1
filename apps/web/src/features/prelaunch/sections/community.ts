/* COMMUNITY — a Discord card (a middle-strength signal that builds the live
   community for the beta test), a social links row (Sumi icons; hrefs from
   config, empty hides the link), and the Founding Collectors wall (opted-in
   founder names rendered as plaques). PROMPT 00 section 8. */
import { el, svgFromString } from '../../../lib/dom';
import { Button, iconMarkup } from '../../../ui';
import { LINKS } from '../config';
import { foundingCollectors } from '../mock-state';

interface SocialLink {
  key: keyof typeof LINKS;
  label: string;
  icon: string;
}

const SOCIALS: SocialLink[] = [
  { key: 'x', label: 'X', icon: iconMarkup('external') },
  { key: 'instagram', label: 'Instagram', icon: iconMarkup('external') },
  { key: 'tiktok', label: 'TikTok', icon: iconMarkup('external') },
];

function svg(markup: string): HTMLElement {
  // Trusted static icon markup from our own set (svgFromString, not innerHTML,
  // to stay consistent with the kit and the XSS rule in .cursor/rules/10-web).
  return el('span', { class: 'px-community__social-icon', 'aria-hidden': 'true' }, [
    svgFromString(markup),
  ]);
}

function discordCard(): HTMLElement {
  const hasInvite = LINKS.discordInvite.length > 0;
  const join = Button({
    label: hasInvite ? 'Join the Discord' : 'Discord opening soon',
    variant: 'ghost',
    size: 'l',
    disabled: !hasInvite,
    onClick: hasInvite ? () => window.open(LINKS.discordInvite, '_blank', 'noopener') : undefined,
  });

  return el('article', { class: 'px-community__discord m-paper m-paper-raised px-lp__reveal' }, [
    el('h3', { class: 't-heading' }, ['The room fills before the doors open']),
    el('p', { class: 'px-community__note t-body' }, [
      'Founders and members gather in the Discord to theorise on unrevealed figures and shape the beta. A beta-access code waits inside.',
    ]),
    join.root,
  ]);
}

function socialRow(): HTMLElement | null {
  const present = SOCIALS.filter((s) => LINKS[s.key].length > 0);
  if (present.length === 0) return null;
  return el(
    'div',
    { class: 'px-community__socials px-lp__reveal' },
    present.map((s) =>
      el(
        'a',
        {
          class: 'px-community__social',
          href: LINKS[s.key],
          target: '_blank',
          rel: 'noopener',
          'aria-label': s.label,
        },
        [svg(s.icon), el('span', { class: 't-caption' }, [s.label])],
      ),
    ),
  );
}

function collectorsWall(): HTMLElement {
  const names = foundingCollectors();
  return el('div', { class: 'px-community__wall px-lp__reveal' }, [
    el('p', { class: 'px-lp__eyebrow t-caption' }, ['Founding Collectors']),
    el(
      'div',
      { class: 'px-community__plaques' },
      names.map((name) => el('span', { class: 'plaque px-community__plaque' }, [name])),
    ),
    el('p', { class: 'px-community__wall-note t-caption' }, [
      'Every Founder may add their name here. The wall grows with the run.',
    ]),
  ]);
}

export function communitySection(): HTMLElement {
  const socials = socialRow();
  return el(
    'section',
    { class: 'px-lp__section px-community', 'data-env': 'gallery', id: 'px-lp-community' },
    [
      el('div', { class: 'px-lp__col' }, [
        el('p', { class: 'px-lp__eyebrow t-caption px-lp__reveal' }, ['The community']),
        el('h2', { class: 'px-lp__section-title t-title px-lp__reveal' }, ['Gather before the opening']),
        discordCard(),
        socials,
        collectorsWall(),
      ]),
    ],
  );
}

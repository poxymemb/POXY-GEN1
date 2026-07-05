/* FOOTER — AETRYX LTD identity, minimal legal links (full versions land with
   the legal set in Step 1), and the responsible-play line. 18+ product. */
import { el } from '../../../lib/dom';
import { COMPANY } from '../config';

const LEGAL: Array<[string, string]> = [
  ['Terms of pre-order', '#px-lp-faq'],
  ['Privacy', '#px-lp-faq'],
  ['Refunds', '#px-lp-faq'],
];

export function footerSection(): HTMLElement {
  const companyLine = COMPANY.companyNumber
    ? `${COMPANY.legalName} \u00b7 company no. ${COMPANY.companyNumber} \u00b7 ${COMPANY.jurisdiction}`
    : `${COMPANY.legalName} \u00b7 ${COMPANY.jurisdiction}`;

  return el(
    'footer',
    { class: 'px-lp__section px-footer', 'data-env': 'gallery', id: 'px-lp-footer' },
    [
      el('div', { class: 'px-lp__col px-footer__col' }, [
        el('p', { class: 'px-footer__company t-caption' }, [companyLine]),
        el(
          'nav',
          { class: 'px-footer__links', 'aria-label': 'Legal' },
          LEGAL.map(([label, href]) =>
            el('a', { class: 'px-footer__link t-caption', href }, [label]),
          ),
        ),
        el('p', { class: 'px-footer__play t-caption' }, [
          '18+ only. This product includes random-item purchases. Play responsibly.',
        ]),
      ]),
    ],
  );
}

/* Pre-launch landing configuration — the single place Никита fills real
   values. No secrets here (Stripe/Supabase keys live in env, not in git).
   Every field is a placeholder with an honest default so the page renders
   finished before the real values land. */

/** The launch window shown as "Season 1 opens: {window}". Never a fake
    precise date — an honest window (HONESTY FRAME, PROMPT 00 Step 1). */
export const LAUNCH_WINDOW = 'Autumn 2026';

/** Founder Pass — our own run-size mechanic applied to the waiting itself.
    Refundable in full until 30 days after beta opens, one per account. */
export const FOUNDER = {
  pricePence: 499,
  currency: 'GBP' as const,
  /** Displayed price, kept in sync with pricePence for the £ caption law. */
  priceLabel: '£4.99',
  /** Limited run of 500 with mint numbers. */
  runSize: 500,
  /** What a Founder receives — confirm with Никита; each line is curator
      voice (fact, not hype). */
  contents: [
    'Your Founder mint number, kept forever on your Passport.',
    'Beta access on day one, before public opening.',
    '500 PX waiting in your wallet at launch.',
    'The Founder frame, made only for the first 500.',
    'Your name on the Founding Collectors wall.',
  ] as const,
} as const;

/** ASA-safe disclosure shown near the price (UK loot-box guidance). */
export const ASA_DISCLOSURE =
  'POXY WORLD will include random-item purchases (cases) with published odds.';

/** UK consumer rules stated plainly near the offer. */
export const REFUND_PROMISE =
  'Refundable in full until 30 days after beta opens. UK 14-day cooling-off applies. If you change your mind, nothing is kept.';

/** Community links — Никита fills the real hrefs. Empty string hides the
    entry (the page must not render a dead button). */
export const LINKS = {
  discordInvite: '',
  x: '',
  instagram: '',
  tiktok: '',
} as const;

/** Discord widget server id for the live member count (cached). Empty =
    show a quiet static invitation instead of a number. */
export const DISCORD_SERVER_ID = '';

/** Company footer identity (AETRYX LTD replaces NULLSPACE everywhere). */
export const COMPANY = {
  legalName: 'AETRYX LTD',
  /** Companies House number — Никита fills. */
  companyNumber: '',
  jurisdiction: 'United Kingdom',
} as const;

/** Kill switch mirror (server owns the real flag in Step 2). When false the
    page degrades to waitlist-only with honest copy, never a dead button. */
export const FOUNDER_SALES_ENABLED = true;

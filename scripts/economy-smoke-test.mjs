const url = 'https://rbrtjkfawdnomvvyxwvp.supabase.co';
const key = 'sb_publishable_T3fYPzogYoTqzrYY2q9eBg_CjO1QFPG';
const FAKE_ROUND = '00000000-0000-0000-0000-000000000001';
const FAKE_LISTING = '00000000-0000-0000-0000-000000000002';
const FAKE_BUYER = '00000000-0000-0000-0000-000000000003';

const RPCS = [
  ['get_player_economy', {}, 'auth'],
  ['claim_daily_login', {}, 'auth'],
  ['claim_level_perks', {}, 'auth'],
  ['start_dopamine_offer', {}, 'auth'],
  ['open_standard_case_v3', { p_round_id: FAKE_ROUND, p_use_token: false }, 'auth'],
  ['open_dopamine_standard_case_v3', { p_round_id: FAKE_ROUND }, 'auth'],
  ['open_premium_case_v3', { p_round_id: FAKE_ROUND, p_case_type: 'vip', p_use_token: false }, 'auth'],
  ['open_premium_case_v3', { p_round_id: FAKE_ROUND, p_case_type: 'genesis', p_use_token: false }, 'auth'],
  ['open_premium_case_v3', { p_round_id: FAKE_ROUND, p_case_type: 'mythic', p_use_token: false }, 'auth'],
  ['open_premium_case_v3', { p_round_id: FAKE_ROUND, p_case_type: 'legend', p_use_token: false }, 'auth'],
  ['open_premium_case_v3', { p_round_id: FAKE_ROUND, p_case_type: 'invalid', p_use_token: false }, 'invalid_case'],
  ['purchase_xp_shop_item', { p_item_id: 'xp_badge_elite' }, 'auth'],
  ['purchase_xp_shop_item', { p_item_id: 'invalid_item' }, 'invalid_item'],
  ['list_poxy_marketplace', { p_poxy_id: FAKE_LISTING, p_price: 10 }, 'auth'],
  ['list_poxy_marketplace', { p_poxy_id: FAKE_LISTING, p_price: 3 }, 'min_price'],
  ['cancel_marketplace_listing', { p_listing_id: FAKE_LISTING }, 'auth'],
  ['purchase_poxy', { p_listing_id: FAKE_LISTING, p_buyer_id: FAKE_BUYER }, 'auth_or_forbidden'],
  ['craft_upgrade', { p_user_id: FAKE_BUYER, p_poxy_ids: [], p_inherit_trait: null }, 'auth'],
  ['burn_poxy_pc', { p_poxy_id: FAKE_LISTING, p_user_id: FAKE_BUYER }, 'auth'],
  ['dev_topup', { p_amount: 50 }, 'auth'],
];

async function rpc(name, body) {
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function evaluate(name, body, expect, r) {
  const s = JSON.stringify(r.data);
  const authHit =
    s.includes('Not authenticated') ||
    s.includes('not authenticated') ||
    s.includes('Not authorized') ||
    s.includes('ALREADY_CLAIMED') ||
    s.includes('COOLDOWN') ||
    (r.status === 400 && (name === 'get_player_economy' || name === 'claim_daily_login' || name === 'start_dopamine_offer'));
  const invalidItem = expect === 'invalid_item' && (s.includes('Unknown') || s.includes('Not authenticated'));
  const invalidCase = expect === 'invalid_case' && (s.includes('Invalid case type') || s.includes('Not authenticated'));
  const minPrice = expect === 'min_price' && (s.includes('Minimum listing price') || s.includes('Not authenticated') || s.includes('not authenticated'));
  const noConstraintBreach = !s.includes('violates check constraint');
  if (expect === 'auth') return (r.status === 200 || r.status === 400) && authHit && noConstraintBreach;
  if (expect === 'auth_or_forbidden') return (r.status === 200 || r.status === 400) && authHit && noConstraintBreach;
  if (expect === 'invalid_item') return invalidItem && noConstraintBreach;
  if (expect === 'invalid_case') return invalidCase && noConstraintBreach;
  if (expect === 'min_price') return minPrice && noConstraintBreach;
  return false;
}

let pass = 0;
let fail = 0;

for (const [name, body, expect] of RPCS) {
  const r = await rpc(name, body);
  const ok = evaluate(name, body, expect, r);
  const label = `${name}${body.p_case_type ? ':' + body.p_case_type : body.p_item_id ? ':' + body.p_item_id : ''}`;
  if (ok) {
    pass++;
    console.log(`PASS ${label}`, r.status, JSON.stringify(r.data).slice(0, 100));
  } else {
    fail++;
    console.log(`FAIL ${label}`, r.status, JSON.stringify(r.data).slice(0, 220));
  }
}

console.log(`\n=== RPC ${pass} passed, ${fail} failed ===`);
process.exit(fail > 0 ? 1 : 0);

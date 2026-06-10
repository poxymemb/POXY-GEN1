const url = 'https://rbrtjkfawdnomvvyxwvp.supabase.co';
const key = 'sb_publishable_T3fYPzogYoTqzrYY2q9eBg_CjO1QFPG';

const RPCS = [
  ['get_player_economy', {}],
  ['open_premium_case_v3', { p_round_id: '00000000-0000-0000-0000-000000000001', p_case_type: 'vip', p_use_token: false }],
  ['open_standard_case_v3', { p_round_id: '00000000-0000-0000-0000-000000000001', p_use_token: false }],
  ['open_dopamine_standard_case_v3', { p_round_id: '00000000-0000-0000-0000-000000000001' }],
  ['purchase_xp_shop_item', { p_item_id: 'xp_badge_elite' }],
  ['purchase_xp_shop_item', { p_item_id: 'invalid_item' }],
  ['claim_level_perks', {}],
  ['claim_daily_login', {}],
  ['purchase_poxy', { p_listing_id: '00000000-0000-0000-0000-000000000001', p_buyer_id: '00000000-0000-0000-0000-000000000002' }],
  ['start_dopamine_offer', {}],
  ['open_premium_case_v3', { p_round_id: '00000000-0000-0000-0000-000000000001', p_case_type: 'invalid', p_use_token: false }],
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

let pass = 0;
let fail = 0;

for (const [name, body] of RPCS) {
  const r = await rpc(name, body);
  const s = JSON.stringify(r.data);
  const authOk = r.status === 200 || r.status === 400;
  const hasAuthGuard =
    s.includes('Not authenticated') ||
    s.includes('not authenticated') ||
    s.includes('Not authorized') ||
    s.includes('ALREADY_CLAIMED') ||
    (r.status === 400 && name === 'get_player_economy');
  const invalidItem = name === 'purchase_xp_shop_item' && body.p_item_id === 'invalid_item' && s.includes('Unknown');
  const invalidCase = name === 'open_premium_case_v3' && body.p_case_type === 'invalid' && s.includes('Not authenticated');
  const ok = authOk && (hasAuthGuard || invalidItem || invalidCase);
  if (ok) {
    pass++;
    console.log(`PASS ${name}`, r.status, s.slice(0, 120));
  } else {
    fail++;
    console.log(`FAIL ${name}`, r.status, s.slice(0, 200));
  }
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail > 0 ? 1 : 0);

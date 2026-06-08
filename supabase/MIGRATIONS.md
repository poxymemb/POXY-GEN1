# POXY — Supabase Migrations Manifest

Git is the **source of truth** for schema. Production project: `rbrtjkfawdnomvvyxwvp`.

## Fresh database (full apply order)

Run in **Supabase SQL Editor** or `supabase db push` (when linked):

| # | File | Maps to prod migration(s) |
|---|------|---------------------------|
| 1 | `schema.sql` | Base v1 |
| 2 | `migration_username_unique.sql` | Username RLS |
| 3 | `migration_poxy_world_2.sql` | `poxy_world_v1_expansion` |
| 4 | `migration_uuid_fix.sql` | UUID column fixes |
| 5 | `migration_club_p0.sql` | `club_p0_*` (consolidated) |
| 6 | `migration_club_v2.sql` | Passport / air-gap |
| 7 | `migration_club_privacy.sql` | Club privacy JSON |
| 8 | `migration_social_spa.sql` | `social_spa_dm_trade` |
| 9 | `migration_poxy_crypto_core.sql` | `poxy_crypto_core*` |
| 10 | `migration_public_verify.sql` | `public_verify_rpcs` |
| 11 | `migration_dna_traits.sql` | DNA traits (needs `poxy_assets`) |
| 12 | `migration_lore_system.sql` | Lore catalogue |
| 13 | `migration_lumina_features.sql` | `lumina_features_*` |
| 14 | `migration_security_economy_hardening.sql` | `security_economy_hardening` |
| 15 | `migration_poxy_gifts.sql` | `poxy_gifts_table` |
| 16 | `migration_account_control.sql` | `account_control_columns` |
| 17 | `migration_admin_rpcs.sql` | `admin_account_rpcs` |
| 18 | `migration_serial_uniqueness.sql` | `unique_serial_number_and_clean_poxy` |
| 19 | `migration_season_atlas.sql` | `season_atlas*` |
| 20 | `migration_share_links.sql` | `share_links_rpc` |
| 21 | `migration_phase1_trade_flash_store.sql` | `phase1_trade_flash_store` |
| 22 | `migration_admin_emails_table.sql` | `admin_emails_table` |
| 23 | `migration_phase2_crypto_bridge.sql` | `phase2_crypto_bridge` — backfill RPC, snapshot table, cron |
| 24 | `migration_phase3_provably_fair_gacha.sql` | `phase3_provably_fair` — rng_round_id, open_standard_case_v3, burn DESTROY, trade TRADE events |
| 25 | `migration_fix_rng_commit_search_path.sql` | `fix_rng_commit_search_path` — extensions.gen_random_bytes in rng_commit |
| 26 | `migration_burn_destroy_edge.sql` | `burn_destroy_edge` — crypto_destroy via edge; remove bulk burn SQL stub |
| 27 | `migration_fix_crypto_destroy_owner.sql` | `fix_crypto_destroy_owner_null` — keep owner on DESTROY (NOT NULL column) |
| 28 | `migration_fix_public_verify_event_asset.sql` | `fix_public_verify_event_asset` — DESTROY events resolve linked asset metadata |
| 29 | `migration_trade_transfer_edge.sql` | `trade_transfer_edge` — accept_trade_offer gameplay-only; TRADE via transfer_poxy edge |
| 30 | `migration_admin_support_lookup.sql` | `admin_support_lookup` — staff dossier RPC for support terminal |

## Admin allowlist (manual — never commit emails/UUIDs)

After migration 22, seed founders in **Supabase SQL Editor only**:

```sql
insert into public.admin_emails (email, role) values
  ('your-founder@email.com', 'admin'),
  ('your-dev@email.com', 'dev_topup')
on conflict (email) do nothing;
```

Access also works via `profiles.is_verified_employee` or `founder` badge.

## Prod-only ops (not in SQL files)

These were applied on prod but are **operational**, not schema:

- `fix_rpc_user_poxy_columns` — column alignment hotfix (folded into gift/case RPCs above)
- `replica_identity_full_and_clear_poxy` — realtime + data reset (do **not** re-run on prod)
- `fix_crypto_sha256_digest_schema` — already in `migration_poxy_crypto_core.sql` lineage

## Edge Functions

Deploy from `supabase/functions/`:

```
mint_poxy, transfer_poxy, destroy_poxy, verify_poxy, verify_event_chain, verify_merkle_tree,
rng_commit, rng_reveal, snapshot, export_proof, public_verify
```

Plus prod-only: `get_pubkey_helper` (not yet in repo — Phase 2).

Config: `supabase/config.toml`

## Verify repo = prod

After any migration change, run in SQL Editor:

```sql
-- Must return all rows (client-called RPCs)
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN (
    'open_standard_case_v2', 'send_gift', 'claim_gift', 'get_my_pending_gifts',
    'dev_topup', 'purchase_poxy', 'open_vip_case', 'craft_upgrade',
    'crypto_mint_poxy', 'private_is_admin',
    'admin_backfill_crypto_assets', 'compute_ledger_snapshot'
  )
ORDER BY 1;
```

## Smoke test

See `docs/SMOKE_TEST.md` — run after every backend phase.

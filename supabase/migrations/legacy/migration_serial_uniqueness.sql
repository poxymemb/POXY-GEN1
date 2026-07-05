-- POXY: global serial uniqueness (prod: 20260606191944 unique_serial_number_and_clean_poxy)
-- Synced from live Supabase project rbrtjkfawdnomvvyxwvp — 2026-06-08
-- Idempotent — safe if schema.sql constraint already exists.

create unique index if not exists user_poxy_serial_unique
  on public.user_poxy (serial_number);

create unique index if not exists user_poxy_vip_serial_unique
  on public.user_poxy (poxy_tier, vip_serial)
  where vip_serial is not null;

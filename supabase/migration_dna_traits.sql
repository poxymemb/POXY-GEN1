-- =============================================================================
-- migration_dna_traits.sql  —  ЭТАП 1: DNA TRAITS SYSTEM
-- -----------------------------------------------------------------------------
-- Additive only. Does NOT touch existing tables/columns/RPCs beyond ADD COLUMN.
--   * poxy_traits          : reference catalogue of season traits + scarcity
--   * poxy_assets.traits    : DNA snapshot on the crypto layer (per task spec)
--   * poxy_assets.dna_hash  : SHA-256 of the trait JSON (per task spec)
--   * user_poxy.traits      : DNA snapshot on the *gameplay* layer (the rows the
--                             Collection / Asset Viewer actually render)
--   * user_poxy.dna_hash    : SHA-256 of the trait JSON for gameplay items
--   * assign_traits_on_mint : weighted-random trait roll + dna_hash, idempotent
--
-- Season: GEN CHINA MAGIC (season_id = 'gen_china_magic')
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. TRAIT CATALOGUE
-- -----------------------------------------------------------------------------
create table if not exists public.poxy_traits (
  id               uuid primary key default gen_random_uuid(),
  season_id        text not null,
  trait_category   text not null,          -- Eye | Horn | Aura | Element | Scale | Tail
  trait_name       text not null,
  rarity_tier      text not null,          -- common | uncommon | rare | epic | legendary | mythic
  population_count integer not null,       -- scarcity weight (higher = more common)
  created_at       timestamptz not null default now(),
  constraint poxy_traits_unique unique (season_id, trait_category, trait_name)
);

create index if not exists poxy_traits_season_cat_idx
  on public.poxy_traits (season_id, trait_category);

-- -----------------------------------------------------------------------------
-- 2. DNA COLUMNS  (additive — safe on populated tables)
-- -----------------------------------------------------------------------------
-- Crypto layer (per task spec)
alter table public.poxy_assets add column if not exists traits   jsonb default '{}'::jsonb;
alter table public.poxy_assets add column if not exists dna_hash text;

-- Gameplay layer (the rows the Collection + Asset Viewer actually display)
alter table public.user_poxy   add column if not exists traits   jsonb default '{}'::jsonb;
alter table public.user_poxy   add column if not exists dna_hash text;

-- -----------------------------------------------------------------------------
-- 3. SEED — GEN CHINA MAGIC trait catalogue
-- -----------------------------------------------------------------------------
insert into public.poxy_traits (season_id, trait_category, trait_name, rarity_tier, population_count) values
  -- Eyes
  ('gen_china_magic','Eye','Solar Eyes','mythic',11),
  ('gen_china_magic','Eye','Jade Gaze','legendary',34),
  ('gen_china_magic','Eye','Storm Eyes','epic',89),
  ('gen_china_magic','Eye','Ember Sight','rare',210),
  ('gen_china_magic','Eye','Mist Eyes','common',520),
  -- Horns
  ('gen_china_magic','Horn','Imperial Crescent','mythic',3),
  ('gen_china_magic','Horn','Dragon Fang','mythic',18),
  ('gen_china_magic','Horn','Twin Spire','legendary',45),
  ('gen_china_magic','Horn','Jade Horn','rare',180),
  ('gen_china_magic','Horn','Plain Horn','common',540),
  -- Aura
  ('gen_china_magic','Aura','Solar Gold','mythic',11),
  ('gen_china_magic','Aura','Celestial Blue','legendary',28),
  ('gen_china_magic','Aura','Ancient Jade','epic',67),
  ('gen_china_magic','Aura','Phoenix Ember','rare',150),
  ('gen_china_magic','Aura','Cloud Mist','common',560),
  -- Element
  ('gen_china_magic','Element','Void','mythic',8),
  ('gen_china_magic','Element','Celestial Fire','legendary',22),
  ('gen_china_magic','Element','Storm','epic',55),
  ('gen_china_magic','Element','Earth','rare',200),
  ('gen_china_magic','Element','Water','uncommon',320),
  -- Scale
  ('gen_china_magic','Scale','Ancient Jade','mythic',19),
  ('gen_china_magic','Scale','Dragon Scale','epic',60),
  ('gen_china_magic','Scale','Cloud Silk','rare',180),
  ('gen_china_magic','Scale','Plain Scale','common',540),
  -- Tail
  ('gen_china_magic','Tail','Phoenix Tail','mythic',14),
  ('gen_china_magic','Tail','Coiled Serpent','legendary',41),
  ('gen_china_magic','Tail','Wind Ribbon','rare',120),
  ('gen_china_magic','Tail','Plain Tail','common',520)
on conflict (season_id, trait_category, trait_name) do update
  set rarity_tier      = excluded.rarity_tier,
      population_count = excluded.population_count;

-- -----------------------------------------------------------------------------
-- 4. RPC — assign_traits_on_mint
--    Weighted-random one trait per category (weight = population_count, so rarer
--    traits surface less often). Idempotent: returns the existing roll if the
--    poxy already has DNA. Caller must own the poxy. dna_hash = SHA-256(traits).
-- -----------------------------------------------------------------------------
create or replace function public.assign_traits_on_mint(
  p_poxy_id   uuid,
  p_season_id text default 'gen_china_magic'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner      uuid;
  v_existing   jsonb;
  v_existing_h text;
  v_categories text[] := array['Eye','Horn','Aura','Element','Scale','Tail'];
  v_cat        text;
  v_pick       record;
  v_traits     jsonb := '{}'::jsonb;
  v_hash       text;
begin
  select user_id, traits, dna_hash
    into v_owner, v_existing, v_existing_h
    from public.user_poxy
   where id = p_poxy_id;

  if v_owner is null then
    return jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;
  if v_owner <> auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'NOT_OWNER');
  end if;

  -- Idempotent: DNA is permanent once rolled.
  if v_existing is not null and v_existing <> '{}'::jsonb then
    return jsonb_build_object('ok', true, 'cached', true,
                             'traits', v_existing, 'dna_hash', v_existing_h);
  end if;

  foreach v_cat in array v_categories loop
    select trait_name, rarity_tier, population_count
      into v_pick
      from public.poxy_traits
     where season_id = p_season_id
       and trait_category = v_cat
     order by power(random(), 1.0 / greatest(population_count, 1)) desc
     limit 1;

    if v_pick.trait_name is not null then
      v_traits := v_traits || jsonb_build_object(
        v_cat, jsonb_build_object(
          'name', v_pick.trait_name,
          'tier', v_pick.rarity_tier,
          'pop',  v_pick.population_count
        )
      );
    end if;
  end loop;

  if v_traits = '{}'::jsonb then
    return jsonb_build_object('ok', false, 'error', 'NO_TRAITS_FOR_SEASON');
  end if;

  v_hash := encode(extensions.digest(convert_to(v_traits::text, 'UTF8'), 'sha256'), 'hex');

  update public.user_poxy
     set traits   = v_traits,
         dna_hash = v_hash
   where id = p_poxy_id;

  return jsonb_build_object('ok', true, 'cached', false,
                           'traits', v_traits, 'dna_hash', v_hash);
end;
$$;

grant execute on function public.assign_traits_on_mint(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. RLS — trait catalogue is public reference data (read-only to clients)
-- -----------------------------------------------------------------------------
alter table public.poxy_traits enable row level security;

drop policy if exists poxy_traits_select_all on public.poxy_traits;
create policy poxy_traits_select_all on public.poxy_traits
  for select to authenticated using (true);

grant select on public.poxy_traits to authenticated;

-- =============================================================================
-- END migration_dna_traits.sql
-- =============================================================================

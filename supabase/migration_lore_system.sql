-- =============================================================================
-- migration_lore_system.sql  —  ЭТАП 2: LORE SYSTEM
-- -----------------------------------------------------------------------------
-- Additive only. Does NOT touch any existing table/column/RPC.
--   * poxy_lore          : lore catalogue (short + full) keyed by season/type/rarity
--   * get_lore()         : public RPC — returns appropriate text by rarity level
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. LORE TABLE
-- -----------------------------------------------------------------------------
create table if not exists public.poxy_lore (
  id          uuid primary key default gen_random_uuid(),
  season_id   text not null,
  poxy_type   text not null,
  rarity      text not null,
  lore_short  text,
  lore_full   text,
  created_at  timestamptz not null default now(),
  constraint poxy_lore_unique unique (season_id, poxy_type, rarity)
);

alter table public.poxy_lore enable row level security;

drop policy if exists poxy_lore_select_all on public.poxy_lore;
create policy poxy_lore_select_all on public.poxy_lore
  for select to authenticated using (true);

grant select on public.poxy_lore to authenticated;

create index if not exists poxy_lore_lookup_idx
  on public.poxy_lore (season_id, rarity);

-- -----------------------------------------------------------------------------
-- 2. SEED — GEN CHINA MAGIC lore entries
-- -----------------------------------------------------------------------------
insert into public.poxy_lore (season_id, poxy_type, rarity, lore_short, lore_full) values
  (
    'gen_china_magic', 'Jade Hatchling', 'common',
    'A young dragon born beneath the emerald mountains.',
    'Its scales still carry the warmth of the jade caves where it slept for three hundred years.'
  ),
  (
    'gen_china_magic', 'Jade Sentinel', 'uncommon',
    'A guardian posted at the mountain passes.',
    'Trained by the Emperor''s own court to patrol the borders of the Jade Kingdom without rest.'
  ),
  (
    'gen_china_magic', 'Azure Dragon', 'rare',
    'Guardian of the eastern skies.',
    'Patrolled the borders of the Jade Kingdom for three centuries. Last seen circling the capital the night before the Lantern War began.'
  ),
  (
    'gen_china_magic', 'Storm Dragon', 'epic',
    'Called down from the thunderclouds.',
    'Summoned only in times of war. The Council of Five Mages bound it with seven seals — four of which have already broken.'
  ),
  (
    'gen_china_magic', 'Celestial Emperor Dragon', 'legendary',
    'Last ruler of the Jade Kingdom.',
    'Sealed during the Lantern War by the Council of Five Mages. Its crown still burns with the memory of a thousand lanterns. Some say it waits to be found by one worthy of the throne.'
  ),
  (
    'gen_china_magic', 'Dragon of Ten Thousand Lanterns', 'mythic',
    'Witnessed both the founding and the fall.',
    'The first and only dragon to see the Jade Kingdom rise and collapse. Its existence was considered myth even by the Emperor himself. To find it is to inherit everything that was lost.'
  )
on conflict (season_id, poxy_type, rarity) do update
  set lore_short = excluded.lore_short,
      lore_full  = excluded.lore_full;

-- -----------------------------------------------------------------------------
-- 3. RPC — get_lore
--    Public: returns the appropriate text for a given season / type / rarity.
--    common + uncommon  → lore_short
--    rare, epic, legendary, mythic → lore_full (falls back to lore_short)
--    Falls back to rarity-only lookup when no match on poxy_type (generic entry).
-- -----------------------------------------------------------------------------
create or replace function public.get_lore(
  p_season_id text,
  p_poxy_type text default null,
  p_rarity    text default 'common'
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row    public.poxy_lore;
  v_use_full boolean;
  v_text   text;
begin
  -- Try exact match on type first, then rarity-only fallback
  select * into v_row
    from public.poxy_lore
   where season_id = p_season_id
     and rarity    = lower(p_rarity)
     and (p_poxy_type is null or poxy_type = p_poxy_type)
   order by (poxy_type = p_poxy_type) desc   -- prefer exact type match
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;

  v_use_full := lower(p_rarity) in ('rare','epic','legendary','mythic');
  v_text := case when v_use_full then coalesce(v_row.lore_full, v_row.lore_short)
                 else coalesce(v_row.lore_short, v_row.lore_full)
            end;

  return jsonb_build_object(
    'ok',         true,
    'poxy_type',  v_row.poxy_type,
    'rarity',     v_row.rarity,
    'text',       v_text,
    'use_full',   v_use_full,
    'lore_short', v_row.lore_short,
    'lore_full',  v_row.lore_full
  );
end;
$$;

grant execute on function public.get_lore(text, text, text) to authenticated;

-- =============================================================================
-- END migration_lore_system.sql
-- =============================================================================

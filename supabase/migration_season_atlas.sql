create table if not exists public.season_collectibles (
  id           uuid primary key default gen_random_uuid(),
  season_id    text not null,
  poxy_type    text not null,
  rarity       text not null,
  display_name text not null,
  lore_short   text,
  sort_order   int default 0,
  constraint season_collectibles_unique unique (season_id, poxy_type)
);

alter table public.season_collectibles enable row level security;

drop policy if exists season_collectibles_select_all on public.season_collectibles;
create policy season_collectibles_select_all on public.season_collectibles
  for select using (true);

grant select on public.season_collectibles to anon, authenticated;

insert into public.season_collectibles (season_id, poxy_type, rarity, display_name, lore_short, sort_order) values
  ('gen_china_magic','Jade Hatchling','common','Jade Hatchling','A young dragon born beneath the emerald mountains.',1),
  ('gen_china_magic','Jade Sentinel','uncommon','Jade Sentinel','A guardian posted at the mountain passes.',2),
  ('gen_china_magic','Azure Dragon','rare','Azure Dragon','Guardian of the eastern skies.',3),
  ('gen_china_magic','Storm Dragon','epic','Storm Dragon','Called down from the thunderclouds.',4),
  ('gen_china_magic','Celestial Emperor Dragon','legendary','Celestial Emperor Dragon','Last ruler of the Jade Kingdom.',5),
  ('gen_china_magic','Dragon of Ten Thousand Lanterns','mythic','Dragon of Ten Thousand Lanterns','Witnessed both the founding and the fall.',6)
on conflict (season_id, poxy_type) do update
  set rarity = excluded.rarity,
      display_name = excluded.display_name,
      lore_short = excluded.lore_short,
      sort_order = excluded.sort_order;

create or replace function public.get_atlas_progress(
  p_user_id   uuid default null,
  p_season_id text default 'gen_china_magic'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(t) order by t.sort_order), '[]'::jsonb)
    into v_result
  from (
    select sc.poxy_type,
           sc.rarity,
           sc.display_name,
           sc.lore_short,
           sc.sort_order,
           case when p_user_id is null then false
                else exists (
                  select 1 from public.user_poxy up
                  where up.user_id = p_user_id
                    and up.character_name = sc.poxy_type
                )
           end as has_collected
    from public.season_collectibles sc
    where sc.season_id = p_season_id
  ) t;

  return jsonb_build_object('ok', true, 'items', v_result);
end;
$$;

grant execute on function public.get_atlas_progress(uuid, text) to anon, authenticated;

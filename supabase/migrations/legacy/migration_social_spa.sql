-- POXY WORLD — SPA social features: global tier stats, DMs, trade offers

-- Global tier unbox counts (all-time, platform-wide)
create or replace function public.get_global_tier_counts()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    jsonb_object_agg(poxy_tier, cnt),
    '{}'::jsonb
  )
  from (
    select poxy_tier, count(*)::int as cnt
    from public.user_poxy
    where poxy_tier in (
      'common','uncommon','rare','epic','legendary','mythic',
      'obsidian','cursed','souvenir','stellar','diamond','secret'
    )
    group by poxy_tier
  ) s;
$$;

revoke all on function public.get_global_tier_counts() from public;
grant execute on function public.get_global_tier_counts() to anon, authenticated;

-- Direct messages
create table if not exists public.poxy_dm (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references auth.users (id) on delete cascade,
  to_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists poxy_dm_thread_idx
  on public.poxy_dm (least(from_id, to_id), greatest(from_id, to_id), created_at desc);

alter table public.poxy_dm enable row level security;

drop policy if exists poxy_dm_select_participant on public.poxy_dm;
create policy poxy_dm_select_participant on public.poxy_dm
  for select to authenticated
  using (auth.uid() = from_id or auth.uid() = to_id);

drop policy if exists poxy_dm_insert_sender on public.poxy_dm;
create policy poxy_dm_insert_sender on public.poxy_dm
  for insert to authenticated
  with check (auth.uid() = from_id and from_id <> to_id);

-- Peer-to-peer trade offers
create table if not exists public.poxy_trade_offers (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references auth.users (id) on delete cascade,
  to_id uuid not null references auth.users (id) on delete cascade,
  offered_poxy_ids uuid[] not null default '{}',
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','cancelled')),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists poxy_trade_offers_to_pending_idx
  on public.poxy_trade_offers (to_id, status, created_at desc);

alter table public.poxy_trade_offers enable row level security;

drop policy if exists poxy_trade_select_participant on public.poxy_trade_offers;
create policy poxy_trade_select_participant on public.poxy_trade_offers
  for select to authenticated
  using (auth.uid() = from_id or auth.uid() = to_id);

drop policy if exists poxy_trade_insert_own on public.poxy_trade_offers;
create policy poxy_trade_insert_own on public.poxy_trade_offers
  for insert to authenticated
  with check (auth.uid() = from_id and from_id <> to_id);

drop policy if exists poxy_trade_update_participant on public.poxy_trade_offers;
create policy poxy_trade_update_participant on public.poxy_trade_offers
  for update to authenticated
  using (auth.uid() = from_id or auth.uid() = to_id);

create or replace function public.create_trade_offer(
  p_to_id uuid,
  p_poxy_ids uuid[],
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cnt int;
  v_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if p_to_id is null or p_to_id = v_uid then
    return jsonb_build_object('ok', false, 'error', 'Invalid recipient');
  end if;
  if p_poxy_ids is null or array_length(p_poxy_ids, 1) is null then
    return jsonb_build_object('ok', false, 'error', 'Select at least one POXY');
  end if;
  if array_length(p_poxy_ids, 1) > 12 then
    return jsonb_build_object('ok', false, 'error', 'Maximum 12 items per offer');
  end if;

  select count(*) into v_cnt
  from public.user_poxy
  where user_id = v_uid and id = any(p_poxy_ids);

  if v_cnt <> array_length(p_poxy_ids, 1) then
    return jsonb_build_object('ok', false, 'error', 'Invalid inventory selection');
  end if;

  select count(*) into v_cnt
  from public.marketplace m
  where m.seller_id = v_uid and m.status = 'active' and m.poxy_id = any(p_poxy_ids);

  if v_cnt > 0 then
    return jsonb_build_object('ok', false, 'error', 'Cannot trade listed items');
  end if;

  insert into public.poxy_trade_offers (from_id, to_id, offered_poxy_ids, message)
  values (v_uid, p_to_id, p_poxy_ids, nullif(trim(p_message), ''))
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

revoke all on function public.create_trade_offer(uuid, uuid[], text) from public;
grant execute on function public.create_trade_offer(uuid, uuid[], text) to authenticated;

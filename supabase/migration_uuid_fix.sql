-- =============================================================================
-- POXY WORLD 2.0 — UUID CONVERSION + OVERLOAD CLEANUP + BASELINE COLUMNS
--
-- Run this AFTER `migration_poxy_world_2.sql` if you see one of:
--   - "invalid input syntax for type uuid: '725'"
--   - "Could not choose the best candidate function between
--      public.purchase_poxy(p_listing_id => bigint, p_buyer_id => uuid),
--      public.purchase_poxy(p_listing_id => uuid, p_buyer_id => uuid)"
--   - "column \"updated_at\" of relation \"marketplace\" does not exist"
--
-- It does six things:
--   0. Restores every column expected by the canonical schema (in case the
--      DB was created from an older schema that lacked updated_at, etc).
--   1. Drops every legacy bigint/int overload of purchase_poxy / dust_poxy /
--      dust_poxy_bulk / friend RPCs so PostgREST can resolve the uuid-typed RPCs.
--   2. Converts user_poxy.id and marketplace.id (and their FKs) to uuid
--      whenever they are still bigint/integer. Existing rows get fresh UUIDs.
--   3. Re-applies the v2 RPCs that depend on uuid columns so their plans
--      bind to the converted types.
--   4. Re-asserts user_poxy / marketplace RLS policies with fully-qualified
--      column references (so they don't break on future migrations).
--   5. Converts friend_requests.id (and friendships.id) to uuid whenever they
--      are still bigint/integer, then re-binds the friend RPCs.
--   6. Relaxes marketplace.poxy_id FK from "on delete restrict" → "on delete
--      cascade" so burn / craft can delete the parent user_poxy row even when
--      historical (sold / cancelled) marketplace rows still reference it.
--
-- Idempotent — safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. BASELINE COLUMNS — restore anything missing from the canonical schema.
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists username        text,
  add column if not exists avatar_url      text default '🎭',
  add column if not exists balance         numeric(12, 2) not null default 0,
  add column if not exists dust            integer        not null default 0,
  add column if not exists created_at      timestamptz    not null default now(),
  add column if not exists updated_at      timestamptz    not null default now();

alter table public.user_poxy
  add column if not exists serial_number   text,
  add column if not exists dropped_at      timestamptz    not null default now(),
  add column if not exists pinned_at       timestamptz    default null;

create index if not exists user_poxy_pinned_idx
  on public.user_poxy (user_id, pinned_at desc nulls last);

alter table public.marketplace
  add column if not exists price           numeric(12, 2) not null default 1,
  add column if not exists status          text           not null default 'active',
  add column if not exists created_at      timestamptz    not null default now(),
  add column if not exists updated_at      timestamptz    not null default now();

-- updated_at trigger (no-op if it already exists)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists marketplace_updated_at on public.marketplace;
create trigger marketplace_updated_at
  before update on public.marketplace
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 1. DROP every old overload that uses bigint / integer ids
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) as args
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'purchase_poxy', 'dust_poxy', 'dust_poxy_bulk',
         'burn_poxy_pc', 'burn_poxy_bulk_pc',
         'open_standard_case', 'open_vip_case', 'craft_upgrade',
         'accept_friend_request', 'send_friend_request', 'remove_friend',
         'decline_friend_request'
       )
  loop
    -- Drop any overload that takes bigint or integer in its signature.
    if r.args ilike '%bigint%' or r.args ~* '\minteger\M' or r.args ~* '\mint\M' or r.args ilike '%int4%' or r.args ilike '%int8%' then
      execute format('drop function if exists %I.%I(%s) cascade',
                     r.nspname, r.proname, r.args);
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Convert user_poxy.id, marketplace.id, marketplace.poxy_id from int → uuid
--    Order matters: marketplace.id MUST be converted first (it's referenced by
--    unqualified `id` in the legacy user_poxy_select_active_listing policy).
-- -----------------------------------------------------------------------------
do $$
declare
  v_user_poxy_id_type text;
  v_market_poxy_id_type text;
  v_market_id_type text;
begin
  select data_type into v_user_poxy_id_type
    from information_schema.columns
   where table_schema = 'public' and table_name = 'user_poxy' and column_name = 'id';

  select data_type into v_market_poxy_id_type
    from information_schema.columns
   where table_schema = 'public' and table_name = 'marketplace' and column_name = 'poxy_id';

  select data_type into v_market_id_type
    from information_schema.columns
   where table_schema = 'public' and table_name = 'marketplace' and column_name = 'id';

  -- ── PRE-DROP every policy on user_poxy / marketplace.
  -- The legacy `user_poxy_select_active_listing` policy lives on user_poxy
  -- but silently binds `id` to `marketplace.id` (innermost scope), so it
  -- blocks any DROP COLUMN on either table. They are recreated unconditionally
  -- at the bottom of this file.
  drop policy if exists user_poxy_select_own              on public.user_poxy;
  drop policy if exists user_poxy_select_recent_public    on public.user_poxy;
  drop policy if exists user_poxy_select_for_friend_tiers on public.user_poxy;
  drop policy if exists user_poxy_select_active_listing   on public.user_poxy;
  drop policy if exists user_poxy_insert_own              on public.user_poxy;
  drop policy if exists user_poxy_delete_own              on public.user_poxy;
  drop policy if exists marketplace_select_active         on public.marketplace;
  drop policy if exists marketplace_insert_own            on public.marketplace;
  drop policy if exists marketplace_update_own            on public.marketplace;

  -- MARKETPLACE.id  (do FIRST so the recreated RLS policy does not see a
  -- bigint column on the inner-scope `marketplace.id` after user_poxy is uuid)
  if v_market_id_type in ('bigint', 'integer', 'smallint') then
    raise notice 'Converting marketplace.id from % to uuid', v_market_id_type;
    alter table public.marketplace drop constraint if exists marketplace_pkey cascade;
    alter table public.marketplace add column if not exists id_new uuid not null default gen_random_uuid();
    alter table public.marketplace drop column id;
    alter table public.marketplace rename column id_new to id;
    alter table public.marketplace add primary key (id);
  end if;

  -- USER_POXY.id  (also pulls marketplace.poxy_id with it via mapping table)
  if v_user_poxy_id_type in ('bigint', 'integer', 'smallint') then
    raise notice 'Converting user_poxy.id from % to uuid', v_user_poxy_id_type;

    -- Policies were already dropped at the top of this DO block.
    -- Drop FK constraints that reference user_poxy.id so we can change its type.
    -- profiles.favorite_poxy_id may reference user_poxy.id.
    alter table public.profiles drop constraint if exists profiles_favorite_poxy_id_fkey;
    alter table public.marketplace drop constraint if exists marketplace_poxy_id_fkey;

    -- Build a mapping from old integer id → new uuid id.
    create temporary table _poxy_id_map (
      old_id bigint primary key,
      new_id uuid not null default gen_random_uuid()
    ) on commit drop;

    insert into _poxy_id_map (old_id)
      select id::bigint from public.user_poxy;

    -- 2a. Add new uuid column on user_poxy and fill it.
    alter table public.user_poxy add column if not exists id_new uuid;
    update public.user_poxy up
       set id_new = m.new_id
      from _poxy_id_map m
     where up.id::bigint = m.old_id;

    -- 2b. Update marketplace.poxy_id (still integer at this point).
    alter table public.marketplace add column if not exists poxy_id_new uuid;
    update public.marketplace mk
       set poxy_id_new = m.new_id
      from _poxy_id_map m
     where mk.poxy_id::bigint = m.old_id;

    -- 2c. Update profiles.favorite_poxy_id if it points to integer values.
    if exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'profiles'
         and column_name = 'favorite_poxy_id'
    ) then
      alter table public.profiles add column if not exists favorite_poxy_id_new uuid;
      begin
        update public.profiles p
           set favorite_poxy_id_new = m.new_id
          from _poxy_id_map m
         where p.favorite_poxy_id is not null
           and p.favorite_poxy_id::text ~ '^[0-9]+$'
           and p.favorite_poxy_id::text::bigint = m.old_id;
      exception when others then
        -- favorite_poxy_id was already uuid; ignore.
        null;
      end;
    end if;

    -- 2d. Swap columns on user_poxy.
    alter table public.user_poxy drop constraint if exists user_poxy_pkey cascade;
    alter table public.user_poxy drop column id;
    alter table public.user_poxy rename column id_new to id;
    alter table public.user_poxy alter column id set not null;
    alter table public.user_poxy alter column id set default gen_random_uuid();
    alter table public.user_poxy add primary key (id);

    -- 2e. Swap columns on marketplace.
    alter table public.marketplace drop column poxy_id;
    alter table public.marketplace rename column poxy_id_new to poxy_id;
    alter table public.marketplace alter column poxy_id set not null;
    alter table public.marketplace
      add constraint marketplace_poxy_id_fkey
      foreign key (poxy_id) references public.user_poxy(id) on delete cascade;

    -- 2f. Swap profile FK if it existed.
    if exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'profiles'
         and column_name = 'favorite_poxy_id_new'
    ) then
      alter table public.profiles drop column favorite_poxy_id;
      alter table public.profiles rename column favorite_poxy_id_new to favorite_poxy_id;
      alter table public.profiles
        add constraint profiles_favorite_poxy_id_fkey
        foreign key (favorite_poxy_id) references public.user_poxy(id) on delete set null;
    end if;

    -- 2g. RECREATE every RLS policy we dropped in 2-prep.
    create policy user_poxy_select_own on public.user_poxy
      for select to authenticated using (user_id = auth.uid());

    create policy user_poxy_select_recent_public on public.user_poxy
      for select to authenticated
      using (dropped_at > now() - interval '7 days');

    create policy user_poxy_select_for_friend_tiers on public.user_poxy
      for select to authenticated
      using (poxy_tier in ('legendary', 'mythic'));

    create policy user_poxy_select_active_listing on public.user_poxy
      for select to authenticated
      using (
        exists (
          select 1 from public.marketplace m
          where m.poxy_id = public.user_poxy.id and m.status = 'active'
        )
      );

    create policy user_poxy_insert_own on public.user_poxy
      for insert to authenticated
      with check (user_id = auth.uid());

    create policy user_poxy_delete_own on public.user_poxy
      for delete to authenticated
      using (user_id = auth.uid());

    create policy marketplace_select_active on public.marketplace
      for select to authenticated
      using (status in ('active', 'sold', 'cancelled'));

    create policy marketplace_insert_own on public.marketplace
      for insert to authenticated
      with check (
        seller_id = auth.uid()
        and exists (
          select 1 from public.user_poxy up
          where up.id = public.marketplace.poxy_id and up.user_id = auth.uid()
        )
      );

    create policy marketplace_update_own on public.marketplace
      for update to authenticated
      using (seller_id = auth.uid())
      with check (seller_id = auth.uid());
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 3. Recreate the v2 RPCs so their query plans bind to the new uuid columns
--    (CREATE OR REPLACE forces re-planning).
-- -----------------------------------------------------------------------------

create or replace function public.purchase_poxy(p_listing_id uuid, p_buyer_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_listing public.marketplace%rowtype;
  v_price numeric;
  v_buyer_balance numeric;
begin
  if auth.uid() is distinct from p_buyer_id then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  select * into v_listing from public.marketplace where id = p_listing_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Listing not found'); end if;
  if v_listing.status <> 'active' then return jsonb_build_object('ok', false, 'error', 'Listing not available'); end if;
  if v_listing.seller_id = p_buyer_id then return jsonb_build_object('ok', false, 'error', 'Cannot buy your own listing'); end if;
  v_price := v_listing.price;
  select balance into v_buyer_balance from public.profiles where id = p_buyer_id for update;
  if v_buyer_balance < v_price then
    return jsonb_build_object('ok', false, 'error', 'Insufficient Poxy Coins');
  end if;
  if not exists (select 1 from public.user_poxy where id = v_listing.poxy_id) then
    return jsonb_build_object('ok', false, 'error', 'POXY missing');
  end if;
  update public.profiles set balance = balance - v_price where id = p_buyer_id;
  update public.profiles set balance = balance + v_price where id = v_listing.seller_id;
  update public.user_poxy set user_id = p_buyer_id where id = v_listing.poxy_id;
  update public.marketplace set status = 'sold', updated_at = now() where id = p_listing_id;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.purchase_poxy(uuid, uuid) to authenticated;

create or replace function public.burn_poxy_pc(p_poxy_id uuid, p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_tier text;
  v_listed boolean;
  v_payout numeric;
  v_new_balance numeric;
begin
  if auth.uid() is distinct from p_user_id then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  select user_id, poxy_tier into v_owner, v_tier
    from public.user_poxy where id = p_poxy_id for update;

  if v_owner is null then
    return jsonb_build_object('ok', false, 'error', 'POXY not found');
  end if;
  if v_owner <> p_user_id then
    return jsonb_build_object('ok', false, 'error', 'Not your POXY');
  end if;

  select exists (
    select 1 from public.marketplace where poxy_id = p_poxy_id and status = 'active'
  ) into v_listed;
  if v_listed then
    return jsonb_build_object('ok', false, 'error', 'Cannot burn a listed POXY');
  end if;

  v_payout := case v_tier
    when 'common'    then 0.10  when 'uncommon'  then 0.25
    when 'rare'      then 0.50  when 'epic'      then 1.20
    when 'legendary' then 8.00  when 'mythic'    then 40.00
    when 'obsidian'  then 0.50  when 'cursed'    then 1.00
    when 'souvenir'  then 2.00  when 'stellar'   then 4.50
    when 'diamond'   then 15.00 when 'secret'    then 100.00
    else 0.05 end;

  delete from public.user_poxy where id = p_poxy_id;
  update public.profiles set balance = balance + v_payout
   where id = p_user_id returning balance into v_new_balance;
  insert into public.burn_log (user_id, poxy_tier) values (p_user_id, v_tier);

  return jsonb_build_object('ok', true, 'payout', v_payout, 'tier', v_tier, 'new_balance', v_new_balance);
end;
$$;

grant execute on function public.burn_poxy_pc(uuid, uuid) to authenticated;

create or replace function public.burn_poxy_bulk_pc(p_poxy_ids uuid[], p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_total numeric := 0;
  v_count int := 0;
  v_rec record;
  v_new_balance numeric;
begin
  if auth.uid() is distinct from p_user_id then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  if p_poxy_ids is null or array_length(p_poxy_ids, 1) is null then
    return jsonb_build_object('ok', false, 'error', 'No items selected');
  end if;

  for v_rec in
    select id, poxy_tier from public.user_poxy
    where id = any(p_poxy_ids) and user_id = p_user_id
      and not exists (
        select 1 from public.marketplace m
        where m.poxy_id = public.user_poxy.id and m.status = 'active'
      )
  loop
    v_total := v_total + (case v_rec.poxy_tier
      when 'common' then 0.10  when 'uncommon' then 0.25
      when 'rare' then 0.50    when 'epic' then 1.20
      when 'legendary' then 8.00 when 'mythic' then 40.00
      when 'obsidian' then 0.50 when 'cursed' then 1.00
      when 'souvenir' then 2.00 when 'stellar' then 4.50
      when 'diamond' then 15.00 when 'secret' then 100.00
      else 0.05 end);
    insert into public.burn_log (user_id, poxy_tier) values (p_user_id, v_rec.poxy_tier);
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    return jsonb_build_object('ok', false, 'error', 'Nothing to burn');
  end if;

  delete from public.user_poxy
  where id = any(p_poxy_ids) and user_id = p_user_id
    and not exists (
      select 1 from public.marketplace m
      where m.poxy_id = public.user_poxy.id and m.status = 'active'
    );

  update public.profiles set balance = balance + v_total
   where id = p_user_id returning balance into v_new_balance;

  return jsonb_build_object('ok', true, 'count', v_count, 'payout', v_total, 'new_balance', v_new_balance);
end;
$$;

grant execute on function public.burn_poxy_bulk_pc(uuid[], uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. UNCONDITIONAL re-assert of every RLS policy on user_poxy / marketplace.
--    Safe to run regardless of whether the conversion block did anything —
--    this guarantees policies exist after a partially-failed previous run.
-- -----------------------------------------------------------------------------
alter table public.user_poxy enable row level security;
alter table public.marketplace enable row level security;

drop policy if exists user_poxy_select_own              on public.user_poxy;
drop policy if exists user_poxy_select_recent_public    on public.user_poxy;
drop policy if exists user_poxy_select_for_friend_tiers on public.user_poxy;
drop policy if exists user_poxy_select_active_listing   on public.user_poxy;
drop policy if exists user_poxy_insert_own              on public.user_poxy;
drop policy if exists user_poxy_delete_own              on public.user_poxy;
drop policy if exists marketplace_select_active         on public.marketplace;
drop policy if exists marketplace_insert_own            on public.marketplace;
drop policy if exists marketplace_update_own            on public.marketplace;

create policy user_poxy_select_own on public.user_poxy
  for select to authenticated using (user_id = auth.uid());

create policy user_poxy_select_recent_public on public.user_poxy
  for select to authenticated
  using (dropped_at > now() - interval '7 days');

create policy user_poxy_select_for_friend_tiers on public.user_poxy
  for select to authenticated
  using (poxy_tier in ('legendary', 'mythic'));

create policy user_poxy_select_active_listing on public.user_poxy
  for select to authenticated
  using (
    exists (
      select 1 from public.marketplace m
      where m.poxy_id = public.user_poxy.id and m.status = 'active'
    )
  );

create policy user_poxy_insert_own on public.user_poxy
  for insert to authenticated
  with check (user_id = auth.uid());

create policy user_poxy_delete_own on public.user_poxy
  for delete to authenticated
  using (user_id = auth.uid());

create policy marketplace_select_active on public.marketplace
  for select to authenticated
  using (status in ('active', 'sold', 'cancelled'));

create policy marketplace_insert_own on public.marketplace
  for insert to authenticated
  with check (
    seller_id = auth.uid()
    and exists (
      select 1 from public.user_poxy up
      where up.id = public.marketplace.poxy_id and up.user_id = auth.uid()
    )
  );

create policy marketplace_update_own on public.marketplace
  for update to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 5. Convert friend_requests.id and friendships.id to uuid if still bigint/int
--    The accept_friend_request RPC takes uuid; if friend_requests.id is bigint
--    every accept/decline call fails with "invalid input syntax for type uuid".
-- -----------------------------------------------------------------------------
do $$
declare
  v_fr_id_type text;
  v_fs_id_type text;
begin
  -- ── friend_requests.id
  select data_type into v_fr_id_type
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'friend_requests'
     and column_name = 'id';

  if v_fr_id_type in ('bigint', 'integer', 'smallint') then
    raise notice 'Converting friend_requests.id from % to uuid', v_fr_id_type;

    drop policy if exists friend_requests_select_self    on public.friend_requests;
    drop policy if exists friend_requests_insert_self    on public.friend_requests;
    drop policy if exists friend_requests_update_to_user on public.friend_requests;
    drop policy if exists friend_requests_delete_either  on public.friend_requests;

    alter table public.friend_requests drop constraint if exists friend_requests_pkey cascade;
    alter table public.friend_requests
      add column if not exists id_new uuid not null default gen_random_uuid();
    alter table public.friend_requests drop column id;
    alter table public.friend_requests rename column id_new to id;
    alter table public.friend_requests add primary key (id);
  end if;

  -- ── friendships.id (only if table exists; created by migration_poxy_world_2.sql)
  if exists (
    select 1 from information_schema.tables
     where table_schema = 'public' and table_name = 'friendships'
  ) then
    select data_type into v_fs_id_type
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'friendships'
       and column_name = 'id';

    if v_fs_id_type in ('bigint', 'integer', 'smallint') then
      raise notice 'Converting friendships.id from % to uuid', v_fs_id_type;

      drop policy if exists friendships_select_self on public.friendships;
      drop policy if exists friendships_delete_self on public.friendships;

      alter table public.friendships drop constraint if exists friendships_pkey cascade;
      alter table public.friendships
        add column if not exists id_new uuid not null default gen_random_uuid();
      alter table public.friendships drop column id;
      alter table public.friendships rename column id_new to id;
      alter table public.friendships add primary key (id);
    end if;
  end if;
end $$;

-- Unconditional re-assert of friend_requests + friendships RLS so we never
-- leave the table without policies after a conversion.
alter table public.friend_requests enable row level security;

drop policy if exists friend_requests_select_self    on public.friend_requests;
drop policy if exists friend_requests_insert_self    on public.friend_requests;
drop policy if exists friend_requests_update_to_user on public.friend_requests;
drop policy if exists friend_requests_delete_either  on public.friend_requests;

create policy friend_requests_select_self on public.friend_requests
  for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());

create policy friend_requests_insert_self on public.friend_requests
  for insert to authenticated
  with check (from_id = auth.uid() and from_id <> to_id);

create policy friend_requests_update_to_user on public.friend_requests
  for update to authenticated
  using (to_id = auth.uid())
  with check (to_id = auth.uid());

create policy friend_requests_delete_either on public.friend_requests
  for delete to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());

do $$
begin
  if exists (
    select 1 from information_schema.tables
     where table_schema = 'public' and table_name = 'friendships'
  ) then
    execute 'alter table public.friendships enable row level security';
    execute 'drop policy if exists friendships_select_self on public.friendships';
    execute 'drop policy if exists friendships_delete_self on public.friendships';
    execute 'create policy friendships_select_self on public.friendships for select to authenticated using (user_a_id = auth.uid() or user_b_id = auth.uid() or public.is_founder())';
    execute 'create policy friendships_delete_self on public.friendships for delete to authenticated using (user_a_id = auth.uid() or user_b_id = auth.uid())';
  end if;
end $$;

-- Re-bind accept_friend_request / remove_friend / send_friend_request to uuid
-- (CREATE OR REPLACE forces re-planning against the now-uuid friend_requests.id)
create or replace function public.accept_friend_request(p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_req public.friend_requests%rowtype;
  v_a uuid;
  v_b uuid;
begin
  select * into v_req from public.friend_requests where id = p_request_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Request not found'); end if;
  if auth.uid() <> v_req.to_id then return jsonb_build_object('ok', false, 'error', 'Not authorized'); end if;
  if v_req.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'Request not pending'); end if;

  v_a := least(v_req.from_id, v_req.to_id);
  v_b := greatest(v_req.from_id, v_req.to_id);

  insert into public.friendships (user_a_id, user_b_id) values (v_a, v_b)
    on conflict (user_a_id, user_b_id) do nothing;

  update public.friend_requests set status = 'accepted' where id = p_request_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.accept_friend_request(uuid) to authenticated;

create or replace function public.send_friend_request(p_to_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'Not authorized'); end if;
  if p_to_id is null or p_to_id = auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'Invalid target');
  end if;

  -- Already friends?
  if exists (
    select 1 from public.friendships
     where (user_a_id = least(auth.uid(), p_to_id) and user_b_id = greatest(auth.uid(), p_to_id))
  ) then
    return jsonb_build_object('ok', false, 'error', 'Already friends');
  end if;

  insert into public.friend_requests (from_id, to_id, status)
  values (auth.uid(), p_to_id, 'pending')
  on conflict (from_id, to_id) do update set status = 'pending';

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.send_friend_request(uuid) to authenticated;

create or replace function public.remove_friend(p_other_user_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_a uuid;
  v_b uuid;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'Not authorized'); end if;
  if p_other_user_id is null or p_other_user_id = auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'Invalid target');
  end if;

  v_a := least(auth.uid(), p_other_user_id);
  v_b := greatest(auth.uid(), p_other_user_id);

  delete from public.friendships
   where user_a_id = v_a and user_b_id = v_b;

  delete from public.friend_requests
   where (from_id = auth.uid() and to_id = p_other_user_id)
      or (from_id = p_other_user_id and to_id = auth.uid());

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.remove_friend(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Relax marketplace.poxy_id FK so burn / craft can delete the parent POXY
--    The legacy FK is `on delete restrict`, which means a historical marketplace
--    row (status='sold' or 'cancelled') keeps the user_poxy row alive forever.
--    craft_upgrade / burn_poxy_pc / burn_poxy_bulk_pc all delete user_poxy
--    rows after asserting no *active* listings exist — but inactive (sold,
--    cancelled) rows still trigger:
--      "update or delete on table user_poxy violates foreign key constraint
--       marketplace_poxy_id_fkey on table marketplace"
--    Switching the FK to `on delete cascade` is the correct semantic: a sold
--    or cancelled listing pointing at a non-existent POXY has no asset to
--    refer back to, so the historical row is cleaned up automatically.
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  -- Drop EVERY foreign-key constraint on marketplace.poxy_id, regardless of
  -- the constraint name (schema.sql created it as "restrict", the app's
  -- previous patches re-added it; old DBs may have it under a different name).
  for r in
    select tc.constraint_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on kcu.constraint_name = tc.constraint_name
       and kcu.table_schema    = tc.table_schema
       and kcu.table_name      = tc.table_name
     where tc.table_schema = 'public'
       and tc.table_name   = 'marketplace'
       and tc.constraint_type = 'FOREIGN KEY'
       and kcu.column_name = 'poxy_id'
  loop
    raise notice 'Dropping FK %.% on marketplace.poxy_id', 'public', r.constraint_name;
    execute format('alter table public.marketplace drop constraint %I', r.constraint_name);
  end loop;
end $$;

alter table public.marketplace
  add constraint marketplace_poxy_id_fkey
  foreign key (poxy_id) references public.user_poxy(id) on delete cascade;

-- Verify cascade is now in place. If this raises, the conversion didn't
-- take effect and the next craft / burn will still fail.
do $$
declare
  v_action text;
begin
  select rc.delete_rule into v_action
    from information_schema.referential_constraints rc
    join information_schema.table_constraints      tc
      on tc.constraint_name = rc.constraint_name
     and tc.table_schema    = rc.constraint_schema
   where tc.table_schema    = 'public'
     and tc.table_name      = 'marketplace'
     and tc.constraint_name = 'marketplace_poxy_id_fkey';

  if v_action is null then
    raise exception 'marketplace_poxy_id_fkey was not created';
  end if;
  if v_action <> 'CASCADE' then
    raise exception 'marketplace_poxy_id_fkey is %, expected CASCADE', v_action;
  end if;
  raise notice 'marketplace_poxy_id_fkey delete rule = % ✓', v_action;
end $$;

-- =============================================================================
-- END migration_uuid_fix.sql
-- =============================================================================

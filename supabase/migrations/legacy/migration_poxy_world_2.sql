-- =============================================================================
-- POXY WORLD 2.0 — Production migration
-- Run AFTER `schema.sql` and `migration_username_unique.sql`.
-- Idempotent: safe to re-run.
-- Founder override email: nikitash0504@gmail.com
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- helper: is_founder() — email-based founder override (security definer)
-- -----------------------------------------------------------------------------
create or replace function public.is_founder()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid()
      and lower(email) = 'nikitash0504@gmail.com'
  );
$$;

grant execute on function public.is_founder() to authenticated;

-- -----------------------------------------------------------------------------
-- 1. PROFILES extensions
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists favorite_poxy_id uuid references public.user_poxy(id) on delete set null,
  add column if not exists name_gradient text,
  add column if not exists profile_theme text,
  add column if not exists badges text[] not null default '{}',
  add column if not exists is_verified_employee boolean not null default false,
  add column if not exists is_club_member boolean not null default false,
  add column if not exists email text,
  add column if not exists xp_total integer not null default 0,
  add column if not exists last_quest_reset timestamptz;

-- Backfill email from auth.users on signup trigger (next section).
create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists profiles_club_member_idx on public.profiles (is_club_member) where is_club_member = true;

-- -----------------------------------------------------------------------------
-- 2. AUTO-PROFILE TRIGGER — also sync email + auto-flag founder
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, avatar_url, balance, dust, email, is_verified_employee, badges)
  values (
    new.id,
    '🎭',
    0,
    0,
    new.email,
    case when lower(new.email) = 'nikitash0504@gmail.com' then true else false end,
    case when lower(new.email) = 'nikitash0504@gmail.com' then array['founder','developer'] else array[]::text[] end
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- One-shot backfill: copy existing emails into profiles + flag founder
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and (p.email is null or p.email <> u.email);

update public.profiles
set is_verified_employee = true,
    badges = (case when 'founder' = any(badges) then badges else array_append(badges, 'founder') end)
where lower(coalesce(email, '')) = 'nikitash0504@gmail.com';

-- -----------------------------------------------------------------------------
-- 3. RPC: get_email_by_username  (used by dual-login flow)
-- -----------------------------------------------------------------------------
create or replace function public.get_email_by_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if p_username is null or char_length(p_username) < 3 then
    return null;
  end if;

  select coalesce(p.email, u.email)
    into v_email
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.username = p_username
  limit 1;

  return v_email;
end;
$$;

grant execute on function public.get_email_by_username(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. USER_POXY extensions — VIP exclusivity, serial mint counter, source case
-- -----------------------------------------------------------------------------
alter table public.user_poxy
  add column if not exists is_vip boolean not null default false,
  add column if not exists vip_serial bigint,
  add column if not exists case_origin text not null default 'standard'
    check (case_origin in ('standard', 'vip', 'legacy', 'craft'));

-- Allow new VIP tiers in poxy_tier. Drop old check, recreate.
alter table public.user_poxy drop constraint if exists user_poxy_poxy_tier_check;
alter table public.user_poxy
  add constraint user_poxy_poxy_tier_check check (
    poxy_tier in (
      'common','uncommon','rare','epic','legendary','mythic',
      'obsidian','cursed','souvenir','stellar','diamond','secret'
    )
  );

create unique index if not exists user_poxy_vip_serial_unique
  on public.user_poxy (poxy_tier, vip_serial)
  where vip_serial is not null;

-- VIP serial sequence per tier
create table if not exists public.vip_serial_counter (
  poxy_tier text primary key,
  next_serial bigint not null default 1
);

insert into public.vip_serial_counter (poxy_tier, next_serial)
values ('obsidian',1),('cursed',1),('souvenir',1),('stellar',1),('diamond',1),('secret',1)
on conflict (poxy_tier) do nothing;

-- -----------------------------------------------------------------------------
-- 5. FRIENDSHIPS  (canonical pair table — bidirectional safe)
--    user_a_id < user_b_id always; cleanup is one-row regardless of direction.
-- -----------------------------------------------------------------------------
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.profiles(id) on delete cascade,
  user_b_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friendships_no_self check (user_a_id <> user_b_id),
  constraint friendships_canonical_order check (user_a_id < user_b_id),
  constraint friendships_pair_unique unique (user_a_id, user_b_id)
);

create index if not exists friendships_user_a_idx on public.friendships (user_a_id);
create index if not exists friendships_user_b_idx on public.friendships (user_b_id);

-- Helper: are two users friends?
create or replace function public.are_friends(p_a uuid, p_b uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.friendships
    where (user_a_id = least(p_a,p_b) and user_b_id = greatest(p_a,p_b))
  );
$$;

grant execute on function public.are_friends(uuid, uuid) to authenticated;

-- RPC: accept_friend_request  (deletes the request, creates canonical friendship)
create or replace function public.accept_friend_request(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.friend_requests%rowtype;
  v_a uuid;
  v_b uuid;
begin
  select * into v_req from public.friend_requests where id = p_request_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Request not found');
  end if;

  if auth.uid() <> v_req.to_id then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  if v_req.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'Request not pending');
  end if;

  v_a := least(v_req.from_id, v_req.to_id);
  v_b := greatest(v_req.from_id, v_req.to_id);

  insert into public.friendships (user_a_id, user_b_id)
  values (v_a, v_b)
  on conflict (user_a_id, user_b_id) do nothing;

  delete from public.friend_requests where id = p_request_id;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.accept_friend_request(uuid) to authenticated;

-- RPC: remove_friend  (cleans canonical friendship; bidirectional safe)
create or replace function public.remove_friend(p_other_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a uuid;
  v_b uuid;
  v_count int;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  if p_other_user_id is null or p_other_user_id = auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'Invalid target');
  end if;

  v_a := least(auth.uid(), p_other_user_id);
  v_b := greatest(auth.uid(), p_other_user_id);

  delete from public.friendships
   where user_a_id = v_a and user_b_id = v_b;
  get diagnostics v_count = row_count;

  -- Also wipe any leftover requests in either direction.
  delete from public.friend_requests
   where (from_id = auth.uid() and to_id = p_other_user_id)
      or (from_id = p_other_user_id and to_id = auth.uid());

  return jsonb_build_object('ok', true, 'removed', v_count);
end;
$$;

grant execute on function public.remove_friend(uuid) to authenticated;

-- RPC: send_friend_request  (no self, no duplicate, no when already friends)
create or replace function public.send_friend_request(p_to_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a uuid; v_b uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  if p_to_id = auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'Cannot friend yourself');
  end if;

  v_a := least(auth.uid(), p_to_id);
  v_b := greatest(auth.uid(), p_to_id);

  if exists (select 1 from public.friendships where user_a_id = v_a and user_b_id = v_b) then
    return jsonb_build_object('ok', false, 'error', 'Already friends');
  end if;

  if exists (
    select 1 from public.friend_requests
    where ((from_id = auth.uid() and to_id = p_to_id)
        or (from_id = p_to_id and to_id = auth.uid()))
      and status = 'pending'
  ) then
    return jsonb_build_object('ok', false, 'error', 'Request already pending');
  end if;

  insert into public.friend_requests (from_id, to_id, status)
  values (auth.uid(), p_to_id, 'pending')
  on conflict (from_id, to_id) do update set status = 'pending';

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.send_friend_request(uuid) to authenticated;

-- Backfill friendships from any existing accepted friend_requests
insert into public.friendships (user_a_id, user_b_id)
select least(from_id, to_id), greatest(from_id, to_id)
from public.friend_requests
where status = 'accepted'
on conflict (user_a_id, user_b_id) do nothing;

-- -----------------------------------------------------------------------------
-- 6. POXY_CHAT  (global realtime social chat — distinct from club_feed)
-- -----------------------------------------------------------------------------
create table if not exists public.poxy_chat (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 280),
  created_at timestamptz not null default now()
);

create index if not exists poxy_chat_created_idx on public.poxy_chat (created_at desc);

-- -----------------------------------------------------------------------------
-- 7. NEWS POSTS + COMMENTS
-- -----------------------------------------------------------------------------
create table if not exists public.news_posts (
  id bigint generated by default as identity primary key,
  title text not null check (char_length(title) between 1 and 200),
  content text not null check (char_length(content) between 1 and 5000),
  image_url text,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_username text,
  likes uuid[] not null default '{}',
  dislikes uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists news_posts_created_idx on public.news_posts (created_at desc);

create table if not exists public.news_comments (
  id bigint generated by default as identity primary key,
  post_id bigint not null references public.news_posts(id) on delete cascade,
  parent_id bigint references public.news_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  username text,
  content text not null check (char_length(content) between 1 and 1000),
  likes uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists news_comments_post_idx on public.news_comments (post_id, created_at);
create index if not exists news_comments_parent_idx on public.news_comments (parent_id) where parent_id is not null;

-- -----------------------------------------------------------------------------
-- 8. THE GREAT BURN — global counter table
-- -----------------------------------------------------------------------------
create table if not exists public.burn_log (
  id bigint generated by default as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  poxy_tier text not null,
  burned_at timestamptz not null default now()
);

create index if not exists burn_log_burned_at_idx on public.burn_log (burned_at desc);
create index if not exists burn_log_user_idx on public.burn_log (user_id);

-- -----------------------------------------------------------------------------
-- 9. CRAFTING — 5 commons → 1 uncommon (atomic RPC)
-- -----------------------------------------------------------------------------
create or replace function public.craft_upgrade(
  p_user_id uuid,
  p_poxy_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_all_common int;
  v_listed int;
  v_new_id uuid;
  v_serial text;
begin
  if auth.uid() is distinct from p_user_id then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  if p_poxy_ids is null or array_length(p_poxy_ids, 1) <> 5 then
    return jsonb_build_object('ok', false, 'error', 'Need exactly 5 POXY');
  end if;

  select count(*) into v_count
  from public.user_poxy
  where id = any(p_poxy_ids) and user_id = p_user_id;

  if v_count <> 5 then
    return jsonb_build_object('ok', false, 'error', 'Items not yours');
  end if;

  select count(*) into v_all_common
  from public.user_poxy
  where id = any(p_poxy_ids) and user_id = p_user_id and poxy_tier = 'common';

  if v_all_common <> 5 then
    return jsonb_build_object('ok', false, 'error', 'All 5 must be Common');
  end if;

  select count(*) into v_listed
  from public.marketplace
  where poxy_id = any(p_poxy_ids) and status = 'active';
  if v_listed > 0 then
    return jsonb_build_object('ok', false, 'error', 'One or more items are listed');
  end if;

  delete from public.user_poxy where id = any(p_poxy_ids) and user_id = p_user_id;

  v_serial := 'CR-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  insert into public.user_poxy (user_id, poxy_tier, serial_number, case_origin)
  values (p_user_id, 'uncommon', v_serial, 'craft')
  returning id into v_new_id;

  return jsonb_build_object('ok', true, 'new_id', v_new_id, 'serial', v_serial);
end;
$$;

grant execute on function public.craft_upgrade(uuid, uuid[]) to authenticated;

-- -----------------------------------------------------------------------------
-- 10. DAILY QUESTS
-- -----------------------------------------------------------------------------
create table if not exists public.daily_quests (
  id bigint generated by default as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  quest_key text not null,
  progress integer not null default 0,
  goal integer not null,
  reward_pc numeric(12,2) not null,
  claimed boolean not null default false,
  reset_at timestamptz not null default (date_trunc('day', now()) + interval '1 day'),
  created_at timestamptz not null default now(),
  constraint daily_quests_user_key_day_unique unique (user_id, quest_key, reset_at)
);

create index if not exists daily_quests_user_reset_idx on public.daily_quests (user_id, reset_at desc);

-- RPC: ensure_daily_quests — idempotent; returns active set for today
create or replace function public.ensure_daily_quests(p_user_id uuid)
returns setof public.daily_quests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reset timestamptz := date_trunc('day', now() at time zone 'utc') + interval '1 day';
begin
  if auth.uid() is distinct from p_user_id then
    return;
  end if;

  insert into public.daily_quests (user_id, quest_key, progress, goal, reward_pc, reset_at)
  values
    (p_user_id, 'open_3_cases',     0, 3,  0.50, v_reset),
    (p_user_id, 'burn_5_commons',   0, 5,  0.30, v_reset),
    (p_user_id, 'list_1_market',    0, 1,  0.20, v_reset),
    (p_user_id, 'send_chat',        0, 1,  0.10, v_reset)
  on conflict (user_id, quest_key, reset_at) do nothing;

  return query
  select * from public.daily_quests
  where user_id = p_user_id and reset_at = v_reset
  order by id;
end;
$$;

grant execute on function public.ensure_daily_quests(uuid) to authenticated;

-- RPC: increment_quest_progress
create or replace function public.increment_quest_progress(
  p_user_id uuid,
  p_quest_key text,
  p_delta integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reset timestamptz := date_trunc('day', now() at time zone 'utc') + interval '1 day';
  v_q public.daily_quests%rowtype;
begin
  if auth.uid() is distinct from p_user_id then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  update public.daily_quests
  set progress = least(goal, progress + greatest(0, p_delta))
  where user_id = p_user_id and quest_key = p_quest_key and reset_at = v_reset
  returning * into v_q;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Quest not active');
  end if;

  return jsonb_build_object('ok', true, 'progress', v_q.progress, 'goal', v_q.goal, 'completed', v_q.progress >= v_q.goal);
end;
$$;

grant execute on function public.increment_quest_progress(uuid, text, integer) to authenticated;

-- RPC: claim_quest_reward
create or replace function public.claim_quest_reward(
  p_user_id uuid,
  p_quest_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q public.daily_quests%rowtype;
  v_new_balance numeric;
begin
  if auth.uid() is distinct from p_user_id then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  select * into v_q from public.daily_quests where id = p_quest_id and user_id = p_user_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Quest not found');
  end if;
  if v_q.progress < v_q.goal then
    return jsonb_build_object('ok', false, 'error', 'Quest not complete');
  end if;
  if v_q.claimed then
    return jsonb_build_object('ok', false, 'error', 'Already claimed');
  end if;

  update public.daily_quests set claimed = true where id = p_quest_id;

  update public.profiles
  set balance = balance + v_q.reward_pc
  where id = p_user_id
  returning balance into v_new_balance;

  return jsonb_build_object('ok', true, 'reward', v_q.reward_pc, 'new_balance', v_new_balance);
end;
$$;

grant execute on function public.claim_quest_reward(uuid, bigint) to authenticated;

-- -----------------------------------------------------------------------------
-- 11. FLASH SALES (VIP timed drops)
-- -----------------------------------------------------------------------------
create table if not exists public.flash_sales (
  id bigint generated by default as identity primary key,
  title text not null,
  description text,
  price_pc numeric(12,2) not null check (price_pc > 0),
  poxy_tier text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  vip_only boolean not null default true,
  stock integer not null default 1 check (stock >= 0),
  created_at timestamptz not null default now()
);

-- NOTE: cannot use a partial index with `now()` because partial-index
-- predicates require IMMUTABLE functions. A plain B-tree on ends_at is
-- enough — `where ends_at > now()` queries will still use it.
create index if not exists flash_sales_ends_at_idx on public.flash_sales (ends_at);

-- -----------------------------------------------------------------------------
-- 12. VIP CASE OPEN  — atomic, mints serial, debits balance, inserts inventory
-- -----------------------------------------------------------------------------
create or replace function public.open_vip_case(
  p_user_id uuid,
  p_tier text,
  p_serial text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price numeric := 5.00;
  v_balance numeric;
  v_vip_serial bigint;
  v_new_id uuid;
  v_is_member boolean;
begin
  if auth.uid() is distinct from p_user_id then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;

  if p_tier not in ('obsidian','cursed','souvenir','stellar','diamond','secret') then
    return jsonb_build_object('ok', false, 'error', 'Invalid VIP tier');
  end if;

  select is_club_member into v_is_member from public.profiles where id = p_user_id;
  if not coalesce(v_is_member, false) then
    return jsonb_build_object('ok', false, 'error', 'VIP membership required');
  end if;

  select balance into v_balance from public.profiles where id = p_user_id for update;
  if v_balance is null or v_balance < v_price then
    return jsonb_build_object('ok', false, 'error', 'Insufficient Poxy Coins');
  end if;

  update public.profiles set balance = balance - v_price where id = p_user_id;

  update public.vip_serial_counter
  set next_serial = next_serial + 1
  where poxy_tier = p_tier
  returning next_serial - 1 into v_vip_serial;

  if v_vip_serial is null then
    insert into public.vip_serial_counter (poxy_tier, next_serial) values (p_tier, 2)
    on conflict (poxy_tier) do update set next_serial = public.vip_serial_counter.next_serial + 1
    returning next_serial - 1 into v_vip_serial;
  end if;

  insert into public.user_poxy (user_id, poxy_tier, serial_number, is_vip, vip_serial, case_origin)
  values (p_user_id, p_tier, coalesce(p_serial, 'VIP-' || lpad(v_vip_serial::text, 6, '0')), true, v_vip_serial, 'vip')
  returning id into v_new_id;

  return jsonb_build_object(
    'ok', true,
    'new_id', v_new_id,
    'vip_serial', v_vip_serial,
    'new_balance', v_balance - v_price
  );
end;
$$;

grant execute on function public.open_vip_case(uuid, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 13. ROW LEVEL SECURITY for new tables
-- -----------------------------------------------------------------------------
alter table public.friendships enable row level security;
alter table public.poxy_chat enable row level security;
alter table public.news_posts enable row level security;
alter table public.news_comments enable row level security;
alter table public.burn_log enable row level security;
alter table public.daily_quests enable row level security;
alter table public.flash_sales enable row level security;
alter table public.vip_serial_counter enable row level security;

-- friendships: visible to either side, founder, no insert/update/delete from app
drop policy if exists friendships_select_self on public.friendships;
create policy friendships_select_self on public.friendships
  for select to authenticated
  using (user_a_id = auth.uid() or user_b_id = auth.uid() or public.is_founder());

drop policy if exists friendships_delete_self on public.friendships;
create policy friendships_delete_self on public.friendships
  for delete to authenticated
  using (user_a_id = auth.uid() or user_b_id = auth.uid() or public.is_founder());

-- poxy_chat: read all, write own, founder may delete any
drop policy if exists poxy_chat_select_all on public.poxy_chat;
create policy poxy_chat_select_all on public.poxy_chat
  for select to authenticated using (true);

drop policy if exists poxy_chat_insert_own on public.poxy_chat;
create policy poxy_chat_insert_own on public.poxy_chat
  for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists poxy_chat_delete_own_or_founder on public.poxy_chat;
create policy poxy_chat_delete_own_or_founder on public.poxy_chat
  for delete to authenticated
  using (author_id = auth.uid() or public.is_founder());

-- news_posts: anyone can read, only verified employees + founder can post; founder can delete any
drop policy if exists news_posts_select_all on public.news_posts;
create policy news_posts_select_all on public.news_posts
  for select to authenticated using (true);

drop policy if exists news_posts_insert_employee on public.news_posts;
create policy news_posts_insert_employee on public.news_posts
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      public.is_founder()
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_verified_employee = true)
    )
  );

drop policy if exists news_posts_update_owner_or_founder on public.news_posts;
create policy news_posts_update_owner_or_founder on public.news_posts
  for update to authenticated
  using (author_id = auth.uid() or public.is_founder())
  with check (author_id = auth.uid() or public.is_founder());

drop policy if exists news_posts_delete_owner_or_founder on public.news_posts;
create policy news_posts_delete_owner_or_founder on public.news_posts
  for delete to authenticated
  using (author_id = auth.uid() or public.is_founder());

-- news_comments: read all, write own, owner+founder may delete; like via update
drop policy if exists news_comments_select_all on public.news_comments;
create policy news_comments_select_all on public.news_comments
  for select to authenticated using (true);

drop policy if exists news_comments_insert_own on public.news_comments;
create policy news_comments_insert_own on public.news_comments
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists news_comments_update_any on public.news_comments;
create policy news_comments_update_any on public.news_comments
  for update to authenticated
  using (true)
  with check (true);

drop policy if exists news_comments_delete_owner_or_founder on public.news_comments;
create policy news_comments_delete_owner_or_founder on public.news_comments
  for delete to authenticated
  using (user_id = auth.uid() or public.is_founder());

-- burn_log: read own, insert own
drop policy if exists burn_log_select_own on public.burn_log;
create policy burn_log_select_own on public.burn_log
  for select to authenticated
  using (user_id = auth.uid() or public.is_founder());

drop policy if exists burn_log_select_aggregate on public.burn_log;
create policy burn_log_select_aggregate on public.burn_log
  for select to authenticated using (true);

drop policy if exists burn_log_insert_own on public.burn_log;
create policy burn_log_insert_own on public.burn_log
  for insert to authenticated
  with check (user_id = auth.uid());

-- daily_quests: read own, RPC writes only
drop policy if exists daily_quests_select_own on public.daily_quests;
create policy daily_quests_select_own on public.daily_quests
  for select to authenticated
  using (user_id = auth.uid() or public.is_founder());

-- flash_sales: read all, founder writes
drop policy if exists flash_sales_select_all on public.flash_sales;
create policy flash_sales_select_all on public.flash_sales
  for select to authenticated using (true);

drop policy if exists flash_sales_insert_founder on public.flash_sales;
create policy flash_sales_insert_founder on public.flash_sales
  for insert to authenticated
  with check (public.is_founder());

drop policy if exists flash_sales_update_founder on public.flash_sales;
create policy flash_sales_update_founder on public.flash_sales
  for update to authenticated
  using (public.is_founder())
  with check (public.is_founder());

drop policy if exists flash_sales_delete_founder on public.flash_sales;
create policy flash_sales_delete_founder on public.flash_sales
  for delete to authenticated
  using (public.is_founder());

-- vip_serial_counter: read for everyone, RPC writes only
drop policy if exists vip_serial_counter_select_all on public.vip_serial_counter;
create policy vip_serial_counter_select_all on public.vip_serial_counter
  for select to authenticated using (true);

-- -----------------------------------------------------------------------------
-- 14. EXTEND existing club_feed RLS so founder can delete any post
-- -----------------------------------------------------------------------------
drop policy if exists club_feed_delete_own_or_founder on public.club_feed;
create policy club_feed_delete_own_or_founder on public.club_feed
  for delete to authenticated
  using (author_id = auth.uid() or public.is_founder());

-- -----------------------------------------------------------------------------
-- 15. REALTIME publication — make sure new tables emit changes
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'poxy_chat'
  ) then
    execute 'alter publication supabase_realtime add table public.poxy_chat';
  end if;
exception when others then null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'news_posts'
  ) then
    execute 'alter publication supabase_realtime add table public.news_posts';
  end if;
exception when others then null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'news_comments'
  ) then
    execute 'alter publication supabase_realtime add table public.news_comments';
  end if;
exception when others then null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'friendships'
  ) then
    execute 'alter publication supabase_realtime add table public.friendships';
  end if;
exception when others then null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_poxy'
  ) then
    execute 'alter publication supabase_realtime add table public.user_poxy';
  end if;
exception when others then null;
end $$;

-- -----------------------------------------------------------------------------
-- 16. GRANTS for the rest of the new tables
-- -----------------------------------------------------------------------------
grant select, insert, update, delete on public.friendships to authenticated;
grant select, insert, delete on public.poxy_chat to authenticated;
grant select, insert, update, delete on public.news_posts to authenticated;
grant select, insert, update, delete on public.news_comments to authenticated;
grant select, insert on public.burn_log to authenticated;
grant select on public.daily_quests to authenticated;
grant select, insert, update, delete on public.flash_sales to authenticated;
grant select on public.vip_serial_counter to authenticated;

-- -----------------------------------------------------------------------------
-- 17. BURN_POXY_PC — Phase 2 deterministic PC payouts per tier
-- -----------------------------------------------------------------------------
create or replace function public.burn_poxy_pc(
  p_poxy_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
  from public.user_poxy
  where id = p_poxy_id
  for update;

  if v_owner is null then
    return jsonb_build_object('ok', false, 'error', 'POXY not found');
  end if;
  if v_owner <> p_user_id then
    return jsonb_build_object('ok', false, 'error', 'Not your POXY');
  end if;

  select exists (
    select 1 from public.marketplace
    where poxy_id = p_poxy_id and status = 'active'
  ) into v_listed;
  if v_listed then
    return jsonb_build_object('ok', false, 'error', 'Cannot burn a listed POXY');
  end if;

  v_payout := case v_tier
    when 'common'    then 0.10
    when 'uncommon'  then 0.25
    when 'rare'      then 0.50
    when 'epic'      then 1.20
    when 'legendary' then 8.00
    when 'mythic'    then 40.00
    when 'obsidian'  then 0.50
    when 'cursed'    then 1.00
    when 'souvenir'  then 2.00
    when 'stellar'   then 4.50
    when 'diamond'   then 15.00
    when 'secret'    then 100.00
    else 0.05
  end;

  delete from public.user_poxy where id = p_poxy_id;

  update public.profiles
  set balance = balance + v_payout
  where id = p_user_id
  returning balance into v_new_balance;

  insert into public.burn_log (user_id, poxy_tier) values (p_user_id, v_tier);

  return jsonb_build_object('ok', true, 'payout', v_payout, 'tier', v_tier, 'new_balance', v_new_balance);
end;
$$;

grant execute on function public.burn_poxy_pc(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 18. BURN_POXY_BULK_PC — bulk PC payouts
-- -----------------------------------------------------------------------------
create or replace function public.burn_poxy_bulk_pc(
  p_poxy_ids uuid[],
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
    where id = any(p_poxy_ids)
      and user_id = p_user_id
      and not exists (
        select 1 from public.marketplace m
        where m.poxy_id = public.user_poxy.id and m.status = 'active'
      )
  loop
    v_total := v_total + (case v_rec.poxy_tier
      when 'common'    then 0.10
      when 'uncommon'  then 0.25
      when 'rare'      then 0.50
      when 'epic'      then 1.20
      when 'legendary' then 8.00
      when 'mythic'    then 40.00
      when 'obsidian'  then 0.50
      when 'cursed'    then 1.00
      when 'souvenir'  then 2.00
      when 'stellar'   then 4.50
      when 'diamond'   then 15.00
      when 'secret'    then 100.00
      else 0.05 end);
    insert into public.burn_log (user_id, poxy_tier) values (p_user_id, v_rec.poxy_tier);
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    return jsonb_build_object('ok', false, 'error', 'Nothing to burn');
  end if;

  delete from public.user_poxy
  where id = any(p_poxy_ids)
    and user_id = p_user_id
    and not exists (
      select 1 from public.marketplace m
      where m.poxy_id = public.user_poxy.id and m.status = 'active'
    );

  update public.profiles
  set balance = balance + v_total
  where id = p_user_id
  returning balance into v_new_balance;

  return jsonb_build_object('ok', true, 'count', v_count, 'payout', v_total, 'new_balance', v_new_balance);
end;
$$;

grant execute on function public.burn_poxy_bulk_pc(uuid[], uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 19. STANDARD CASE OPEN  — Phase 2 deterministic engine, server-side
-- -----------------------------------------------------------------------------
create or replace function public.open_standard_case(
  p_user_id uuid,
  p_tier text,
  p_serial text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price numeric := 1.00;
  v_balance numeric;
  v_new_id uuid;
begin
  if auth.uid() is distinct from p_user_id then
    return jsonb_build_object('ok', false, 'error', 'Not authorized');
  end if;
  if p_tier not in ('common','uncommon','rare','epic','legendary','mythic') then
    return jsonb_build_object('ok', false, 'error', 'Invalid tier');
  end if;

  select balance into v_balance from public.profiles where id = p_user_id for update;
  if v_balance is null or v_balance < v_price then
    return jsonb_build_object('ok', false, 'error', 'Insufficient Poxy Coins');
  end if;

  update public.profiles set balance = balance - v_price where id = p_user_id;

  insert into public.user_poxy (user_id, poxy_tier, serial_number, case_origin)
  values (p_user_id, p_tier, p_serial, 'standard')
  returning id into v_new_id;

  return jsonb_build_object('ok', true, 'new_id', v_new_id, 'new_balance', v_balance - v_price);
end;
$$;

grant execute on function public.open_standard_case(uuid, text, text) to authenticated;

-- =============================================================================
-- END migration_poxy_world_2.sql
-- =============================================================================

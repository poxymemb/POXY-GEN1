-- POXY: gift system + dev topup (prod: 20260606172530 poxy_gifts_table)
-- Synced from live Supabase project rbrtjkfawdnomvvyxwvp — 2026-06-08

-- -----------------------------------------------------------------------------
-- Gifts table
-- -----------------------------------------------------------------------------
create table if not exists public.poxy_gifts (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references public.profiles(id) on delete cascade,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  poxy_tier     text not null,
  serial_number text,
  message       text,
  status        text not null default 'pending',
  created_at    timestamptz not null default now(),
  claimed_at    timestamptz,
  expires_at    timestamptz default (now() + interval '30 days')
);

alter table public.poxy_gifts enable row level security;

drop policy if exists poxy_gifts_select_sender on public.poxy_gifts;
create policy poxy_gifts_select_sender on public.poxy_gifts
  for select using (sender_id = auth.uid());

drop policy if exists poxy_gifts_select_recipient on public.poxy_gifts;
create policy poxy_gifts_select_recipient on public.poxy_gifts
  for select using (recipient_id = auth.uid());

drop policy if exists poxy_gifts_insert on public.poxy_gifts;
create policy poxy_gifts_insert on public.poxy_gifts
  for insert with check (sender_id = auth.uid() and status = 'pending');

drop policy if exists poxy_gifts_claim on public.poxy_gifts;
create policy poxy_gifts_claim on public.poxy_gifts
  for update
  using (recipient_id = auth.uid() and status = 'pending')
  with check (status = 'claimed');

-- -----------------------------------------------------------------------------
-- send_gift — removes asset from sender, creates pending gift row
-- -----------------------------------------------------------------------------
create or replace function public.send_gift(
  p_recipient_id uuid,
  p_poxy_id uuid,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_uid  uuid := auth.uid();
  v_poxy record;
  v_gid  uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if v_uid = p_recipient_id then
    return jsonb_build_object('ok', false, 'error', 'Cannot gift to yourself');
  end if;

  select * into v_poxy from public.user_poxy
  where id = p_poxy_id and user_id = v_uid;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Asset not found or not yours');
  end if;

  delete from public.user_poxy where id = p_poxy_id and user_id = v_uid;

  insert into public.poxy_gifts (sender_id, recipient_id, poxy_tier, serial_number, message)
  values (v_uid, p_recipient_id, v_poxy.poxy_tier, v_poxy.serial_number, p_message)
  returning id into v_gid;

  return jsonb_build_object(
    'ok', true,
    'gift_id', v_gid,
    'tier', v_poxy.poxy_tier,
    'serial', v_poxy.serial_number
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- get_my_pending_gifts
-- -----------------------------------------------------------------------------
create or replace function public.get_my_pending_gifts()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_uid uuid := auth.uid();
  v_res jsonb;
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', g.id,
      'poxy_tier', g.poxy_tier,
      'serial_number', g.serial_number,
      'message', g.message,
      'created_at', g.created_at,
      'sender_username', p.username
    ) order by g.created_at desc
  )
  into v_res
  from public.poxy_gifts g
  join public.profiles p on p.id = g.sender_id
  where g.recipient_id = v_uid and g.status = 'pending';

  return coalesce(v_res, '[]'::jsonb);
end;
$$;

-- -----------------------------------------------------------------------------
-- claim_gift — mints user_poxy row for recipient
-- -----------------------------------------------------------------------------
create or replace function public.claim_gift(p_gift_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_uid     uuid := auth.uid();
  v_gift    record;
  v_poxy_id uuid;
  v_serial  text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  select * into v_gift from public.poxy_gifts
  where id = p_gift_id and recipient_id = v_uid and status = 'pending'
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Gift not found or already claimed');
  end if;

  v_serial := coalesce(v_gift.serial_number, 'PX-GIFT') || '-G';

  insert into public.user_poxy (user_id, poxy_tier, serial_number, case_origin)
  values (v_uid, v_gift.poxy_tier, v_serial, 'gift')
  returning id into v_poxy_id;

  update public.poxy_gifts
  set status = 'claimed', claimed_at = now()
  where id = p_gift_id;

  return jsonb_build_object(
    'ok', true,
    'poxy_id', v_poxy_id,
    'tier', v_gift.poxy_tier,
    'serial', v_serial
  );
end;
$$;

-- dev_topup: see migration_admin_emails_table.sql

grant execute on function public.send_gift(uuid, uuid, text) to authenticated;
grant execute on function public.get_my_pending_gifts() to authenticated;
grant execute on function public.claim_gift(uuid) to authenticated;

create or replace function public.get_shared_poxy(
  p_serial text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select row_to_json(t)
    into v_result
  from (
    select
      up.serial_number,
      up.poxy_tier,
      up.traits,
      up.dna_hash,
      up.dropped_at,
      up.is_vip,
      pa.signature,
      pa.mint_timestamp,
      pro.username  as owner_username,
      pro.avatar_url as owner_avatar
    from public.user_poxy up
    left join public.poxy_assets pa on pa.user_poxy_id = up.id
    join public.profiles pro on pro.id = up.user_id
    where up.serial_number = p_serial
    limit 1
  ) t;

  if v_result is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object('ok', true, 'item', v_result);
end;
$$;

grant execute on function public.get_shared_poxy(text) to anon, authenticated;

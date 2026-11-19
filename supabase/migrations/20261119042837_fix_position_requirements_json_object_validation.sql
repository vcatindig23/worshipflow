create or replace function public.save_setlist_position_requirements(
  p_setlist_id uuid,
  p_requirements jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_item record;
  v_required_text text;
  v_required_count integer;
  v_requirement_count integer;
  v_saved_count integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if p_requirements is null
    or pg_catalog.jsonb_typeof(p_requirements) <> 'object' then
    raise exception 'INVALID_POSITION_REQUIREMENTS' using errcode = '22023';
  end if;

  select count(*)::integer
  into v_requirement_count
  from pg_catalog.jsonb_each(p_requirements);

  if v_requirement_count > 17 then
    raise exception 'INVALID_POSITION_REQUIREMENTS' using errcode = '22023';
  end if;

  select s.organization_id
  into v_organization_id
  from public.setlists s
  where s.id = p_setlist_id
  for update;

  if v_organization_id is null then
    raise exception 'SETLIST_NOT_FOUND';
  end if;

  if not (select private.has_org_role(
    v_organization_id,
    array['admin', 'worship_leader', 'song_editor']::text[]
  )) then
    raise exception 'EDITOR_REQUIRED' using errcode = '42501';
  end if;

  delete from public.setlist_position_requirements
  where setlist_id = p_setlist_id
    and organization_id = v_organization_id;

  for v_item in
    select key, value
    from pg_catalog.jsonb_each(p_requirements)
  loop
    if v_item.key not in (
      'worship_leader', 'singer', 'lead_guitarist', 'rhythm_guitarist',
      'acoustic_guitarist', 'electric_guitarist', 'bassist', 'keyboardist',
      'pianist', 'drummer', 'percussionist', 'violinist', 'cellist',
      'sound_engineer', 'audio_visual', 'choir_member', 'other'
    ) then
      raise exception 'INVALID_POSITION_REQUIREMENTS' using errcode = '22023';
    end if;

    if pg_catalog.jsonb_typeof(v_item.value) <> 'number' then
      raise exception 'INVALID_POSITION_REQUIREMENTS' using errcode = '22023';
    end if;

    v_required_text := v_item.value #>> '{}';
    if v_required_text !~ '^(0|[1-9][0-9]?)$' then
      raise exception 'INVALID_POSITION_REQUIREMENTS' using errcode = '22023';
    end if;

    v_required_count := v_required_text::integer;
    if v_required_count > 20 then
      raise exception 'POSITION_REQUIREMENT_TOO_LARGE' using errcode = '22023';
    end if;

    if v_required_count > 0 then
      insert into public.setlist_position_requirements (
        organization_id, setlist_id, team_position, required_count
      )
      values (
        v_organization_id, p_setlist_id, v_item.key, v_required_count
      );
      v_saved_count := v_saved_count + 1;
    end if;
  end loop;

  return v_saved_count;
end;
$$;

revoke execute on function public.save_setlist_position_requirements(uuid, jsonb)
from public, anon, authenticated;
grant execute on function public.save_setlist_position_requirements(uuid, jsonb)
to authenticated;
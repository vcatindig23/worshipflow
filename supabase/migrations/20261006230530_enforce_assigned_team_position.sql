create or replace function public.add_setlist_team_assignment(
  p_setlist_id uuid,
  p_user_id uuid,
  p_team_position text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_assignment_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  select organization_id
  into v_organization_id
  from public.setlists
  where id = p_setlist_id;

  if v_organization_id is null then
    raise exception 'SETLIST_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.organization_members
    where organization_id = v_organization_id
      and user_id = (select auth.uid())
      and role in ('admin', 'worship_leader', 'song_editor')
  ) then
    raise exception 'EDITOR_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.organization_members
    where organization_id = v_organization_id
      and user_id = p_user_id
  ) then
    raise exception 'TEAM_MEMBER_NOT_IN_ORGANIZATION';
  end if;

  if not exists (
    select 1
    from public.organization_members
    where organization_id = v_organization_id
      and user_id = p_user_id
      and team_positions @> array[p_team_position]::text[]
  ) then
    raise exception 'TEAM_POSITION_NOT_ASSIGNED_TO_MEMBER';
  end if;

  insert into public.setlist_team_assignments (
    setlist_id,
    user_id,
    team_position,
    assigned_by
  )
  values (
    p_setlist_id,
    p_user_id,
    p_team_position,
    (select auth.uid())
  )
  returning id into v_assignment_id;

  return v_assignment_id;
end;
$$;

revoke execute on function public.add_setlist_team_assignment(
  uuid,
  uuid,
  text
)
from public, anon, authenticated;

grant execute on function public.add_setlist_team_assignment(
  uuid,
  uuid,
  text
)
to authenticated;
alter table public.organization_members
add column if not exists team_positions text[] not null default '{}';

alter table public.organization_members
drop constraint if exists organization_members_team_positions_check;

alter table public.organization_members
add constraint organization_members_team_positions_check
check (
  cardinality(team_positions) <= 10
  and team_positions <@ array[
    'worship_leader',
    'singer',
    'lead_guitarist',
    'rhythm_guitarist',
    'acoustic_guitarist',
    'electric_guitarist',
    'bassist',
    'keyboardist',
    'pianist',
    'drummer',
    'percussionist',
    'violinist',
    'cellist',
    'sound_engineer',
    'audio_visual',
    'choir_member',
    'other'
  ]::text[]
);

create or replace function public.update_organization_member_team_positions(
  p_organization_id uuid,
  p_user_id uuid,
  p_team_positions text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if p_team_positions is null
    or cardinality(p_team_positions) > 10
    or not (p_team_positions <@ array[
      'worship_leader',
      'singer',
      'lead_guitarist',
      'rhythm_guitarist',
      'acoustic_guitarist',
      'electric_guitarist',
      'bassist',
      'keyboardist',
      'pianist',
      'drummer',
      'percussionist',
      'violinist',
      'cellist',
      'sound_engineer',
      'audio_visual',
      'choir_member',
      'other'
    ]::text[])
  then
    raise exception 'INVALID_TEAM_POSITIONS';
  end if;

  if not exists (
    select 1
    from public.organization_members
    where organization_id = p_organization_id
      and user_id = (select auth.uid())
      and role = 'admin'
  ) then
    raise exception 'ADMINISTRATOR_REQUIRED';
  end if;

  update public.organization_members
  set team_positions = array(
    select distinct position
    from unnest(p_team_positions) as position
    order by position
  )
  where organization_id = p_organization_id
    and user_id = p_user_id;

  if not found then
    raise exception 'MEMBER_NOT_FOUND';
  end if;
end;
$$;

revoke execute on function public.update_organization_member_team_positions(
  uuid,
  uuid,
  text[]
)
from public, anon, authenticated;

grant execute on function public.update_organization_member_team_positions(
  uuid,
  uuid,
  text[]
)
to authenticated;

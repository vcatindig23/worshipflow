create table if not exists public.setlist_team_assignments (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_position text not null,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint setlist_team_assignments_position_check check (
    team_position in (
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
    )
  ),
  unique (setlist_id, user_id, team_position)
);

create index if not exists setlist_team_assignments_setlist_idx
on public.setlist_team_assignments(setlist_id);

create index if not exists setlist_team_assignments_user_idx
on public.setlist_team_assignments(user_id);

alter table public.setlist_team_assignments enable row level security;

revoke all on public.setlist_team_assignments
from anon, authenticated;

grant select on public.setlist_team_assignments
to authenticated;

drop policy if exists "Members can view setlist team assignments"
on public.setlist_team_assignments;

create policy "Members can view setlist team assignments"
on public.setlist_team_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.setlists s
    where s.id = setlist_team_assignments.setlist_id
      and (select private.is_org_member(s.organization_id))
  )
);

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
      and p_team_position = any(team_positions)
  ) then
    raise exception 'TEAM_MEMBER_POSITION_REQUIRED';
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

create or replace function public.remove_setlist_team_assignment(
  p_assignment_id uuid,
  p_setlist_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
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

  delete from public.setlist_team_assignments
  where id = p_assignment_id
    and setlist_id = p_setlist_id;

  if not found then
    raise exception 'ASSIGNMENT_NOT_FOUND';
  end if;
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

revoke execute on function public.remove_setlist_team_assignment(
  uuid,
  uuid
)
from public, anon, authenticated;

grant execute on function public.remove_setlist_team_assignment(
  uuid,
  uuid
)
to authenticated;

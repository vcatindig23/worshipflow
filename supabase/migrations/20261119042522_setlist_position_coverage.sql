create table if not exists public.setlist_position_requirements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  team_position text not null,
  required_count smallint not null,
  created_at timestamptz not null default now(),
  constraint setlist_position_requirements_position_check check (
    team_position in (
      'worship_leader', 'singer', 'lead_guitarist', 'rhythm_guitarist',
      'acoustic_guitarist', 'electric_guitarist', 'bassist', 'keyboardist',
      'pianist', 'drummer', 'percussionist', 'violinist', 'cellist',
      'sound_engineer', 'audio_visual', 'choir_member', 'other'
    )
  ),
  constraint setlist_position_requirements_count_check
    check (required_count between 1 and 20),
  constraint setlist_position_requirements_unique_position
    unique (setlist_id, team_position)
);

create index if not exists setlist_position_requirements_org_setlist_idx
  on public.setlist_position_requirements (organization_id, setlist_id);

comment on table public.setlist_position_requirements is
  'Per-service staffing requirements by worship-team position. A missing row means the position is not required for that service.';

alter table public.setlist_position_requirements enable row level security;

revoke all on public.setlist_position_requirements from anon, authenticated;
grant select, insert, delete on public.setlist_position_requirements to authenticated;

drop policy if exists "Members can view service position requirements"
  on public.setlist_position_requirements;
create policy "Members can view service position requirements"
on public.setlist_position_requirements
for select
to authenticated
using (
  (select private.is_org_member(organization_id))
  and exists (
    select 1
    from public.setlists s
    where s.id = setlist_position_requirements.setlist_id
      and s.organization_id = setlist_position_requirements.organization_id
  )
);

drop policy if exists "Service editors can create position requirements"
  on public.setlist_position_requirements;
create policy "Service editors can create position requirements"
on public.setlist_position_requirements
for insert
to authenticated
with check (
  (select private.has_org_role(
    organization_id,
    array['admin', 'worship_leader', 'song_editor']::text[]
  ))
  and exists (
    select 1
    from public.setlists s
    where s.id = setlist_position_requirements.setlist_id
      and s.organization_id = setlist_position_requirements.organization_id
  )
);

drop policy if exists "Service editors can remove position requirements"
  on public.setlist_position_requirements;
create policy "Service editors can remove position requirements"
on public.setlist_position_requirements
for delete
to authenticated
using (
  (select private.has_org_role(
    organization_id,
    array['admin', 'worship_leader', 'song_editor']::text[]
  ))
  and exists (
    select 1
    from public.setlists s
    where s.id = setlist_position_requirements.setlist_id
      and s.organization_id = setlist_position_requirements.organization_id
  )
);

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
  v_saved_count integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if p_requirements is null
    or pg_catalog.jsonb_typeof(p_requirements) <> 'object'
    or pg_catalog.jsonb_object_length(p_requirements) > 17 then
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

-- Preserve staffing requirements when a leader duplicates an existing service plan.
create or replace function public.duplicate_setlist(p_setlist_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source public.setlists%rowtype;
  v_new_setlist_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  select s.*
  into v_source
  from public.setlists s
  join public.organization_members m
    on m.organization_id = s.organization_id
   and m.user_id = (select auth.uid())
  where s.id = p_setlist_id
    and m.role in ('admin', 'worship_leader')
  for share of s;

  if not found then
    raise exception 'SETLIST_NOT_FOUND_OR_PERMISSION_DENIED';
  end if;

  insert into public.setlists (
    organization_id, name, description, service_date, service_time, end_time,
    status, service_type, location, theme, service_notes, announcements,
    created_by, updated_by
  )
  values (
    v_source.organization_id,
    left(v_source.name || ' — Copy', 200),
    v_source.description,
    null,
    null,
    null,
    'draft',
    v_source.service_type,
    v_source.location,
    v_source.theme,
    v_source.service_notes,
    v_source.announcements,
    (select auth.uid()),
    (select auth.uid())
  )
  returning id into v_new_setlist_id;

  insert into public.setlist_songs (
    setlist_id, song_id, position, section, key_override, capo_override,
    tempo_override, notes
  )
  select
    v_new_setlist_id, ss.song_id, ss.position, ss.section, ss.key_override,
    ss.capo_override, ss.tempo_override, ss.notes
  from public.setlist_songs ss
  where ss.setlist_id = p_setlist_id
  order by ss.position;

  insert into public.setlist_timeline_items (
    organization_id, setlist_id, position, item_type, title, duration_minutes,
    notes, song_id, created_by
  )
  select
    v_source.organization_id, v_new_setlist_id, ti.position, ti.item_type,
    ti.title, ti.duration_minutes, ti.notes, ti.song_id, (select auth.uid())
  from public.setlist_timeline_items ti
  where ti.setlist_id = p_setlist_id
    and ti.organization_id = v_source.organization_id
  order by ti.position;

  insert into public.setlist_team_assignments (
    setlist_id, user_id, team_position, assigned_by, confirmation_status,
    responded_at, response_note
  )
  select
    v_new_setlist_id, a.user_id, a.team_position, (select auth.uid()),
    'pending', null, null
  from public.setlist_team_assignments a
  join public.organization_members m
    on m.organization_id = v_source.organization_id
   and m.user_id = a.user_id
  where a.setlist_id = p_setlist_id;

  insert into public.setlist_position_requirements (
    organization_id, setlist_id, team_position, required_count
  )
  select
    v_source.organization_id, v_new_setlist_id, r.team_position, r.required_count
  from public.setlist_position_requirements r
  where r.setlist_id = p_setlist_id
    and r.organization_id = v_source.organization_id;

  insert into public.setlist_resources (
    organization_id, setlist_id, storage_path, display_name, created_by
  )
  select
    v_source.organization_id, v_new_setlist_id, r.storage_path,
    r.display_name, (select auth.uid())
  from public.setlist_resources r
  where r.setlist_id = p_setlist_id
    and r.organization_id = v_source.organization_id;

  insert into public.setlist_preparation_tasks (
    organization_id, setlist_id, title, details, is_completed, position, created_by
  )
  select
    v_source.organization_id, v_new_setlist_id, t.title, t.details,
    false, t.position, (select auth.uid())
  from public.setlist_preparation_tasks t
  where t.setlist_id = p_setlist_id
    and t.organization_id = v_source.organization_id
  order by t.position, t.created_at;

  return v_new_setlist_id;
end;
$$;

revoke execute on function public.duplicate_setlist(uuid)
from public, anon, authenticated;
grant execute on function public.duplicate_setlist(uuid) to authenticated;

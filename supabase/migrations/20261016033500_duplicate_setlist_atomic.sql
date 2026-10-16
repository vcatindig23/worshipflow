-- Keep replayed installations consistent with the assignment-response columns
-- used by WorshipFlow's scheduling workflow.
alter table public.setlist_team_assignments
  add column if not exists confirmation_status text not null default 'pending',
  add column if not exists responded_at timestamptz,
  add column if not exists response_note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'setlist_team_assignments_confirmation_status_check'
      and conrelid = 'public.setlist_team_assignments'::regclass
  ) then
    alter table public.setlist_team_assignments
      add constraint setlist_team_assignments_confirmation_status_check
      check (confirmation_status in ('pending', 'confirmed', 'declined'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'setlist_team_assignments_response_note_length_check'
      and conrelid = 'public.setlist_team_assignments'::regclass
  ) then
    alter table public.setlist_team_assignments
      add constraint setlist_team_assignments_response_note_length_check
      check (response_note is null or char_length(response_note) <= 500);
  end if;
end $$;

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

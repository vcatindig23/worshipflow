create table public.organization_activity (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  entity_name text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint organization_activity_actor_name_length check (
    char_length(actor_name) between 1 and 120
  ),
  constraint organization_activity_action_check check (
    action in (
      'song.created',
      'song.updated',
      'song.archived',
      'song.restored',
      'song.deleted',
      'service.created',
      'service.updated',
      'service.published',
      'service.archived',
      'service.restored',
      'service.deleted',
      'service.song_added',
      'service.song_removed',
      'team.assigned',
      'team.unassigned',
      'member.joined',
      'member.role_changed',
      'member.positions_changed',
      'member.removed'
    )
  ),
  constraint organization_activity_entity_type_check check (
    entity_type in ('song', 'service', 'member')
  ),
  constraint organization_activity_details_size check (
    pg_column_size(details) <= 2048
  )
);

create index organization_activity_org_created_idx
  on public.organization_activity (organization_id, created_at desc);

alter table public.organization_activity enable row level security;

revoke all on public.organization_activity from anon, authenticated;
grant select on public.organization_activity to authenticated;

create policy "Organization members can view activity"
on public.organization_activity
for select
to authenticated
using ((select private.is_org_member(organization_id)));

create or replace function private.log_organization_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_previous jsonb;
  v_organization_id uuid;
  v_entity_id uuid;
  v_entity_name text;
  v_entity_type text := tg_argv[0];
  v_action text;
  v_details jsonb := '{}'::jsonb;
  v_actor_id uuid := (select auth.uid());
  v_actor_name text;
  v_member_name text;
  v_song_name text;
  v_setlist_id uuid;
begin
  if v_actor_id is null then
    return null;
  end if;

  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;

  if tg_op = 'UPDATE' then
    v_previous := to_jsonb(old);
  end if;

  select coalesce(nullif(trim(p.display_name), ''), 'Worship Member')
  into v_actor_name
  from public.profiles as p
  where p.id = v_actor_id;

  v_actor_name := coalesce(v_actor_name, 'Worship Member');

  if v_entity_type = 'song' then
    v_organization_id := (v_row ->> 'organization_id')::uuid;
    v_entity_id := (v_row ->> 'id')::uuid;
    v_entity_name := v_row ->> 'title';

    if tg_op = 'INSERT' then
      v_action := 'song.created';
    elsif tg_op = 'DELETE' then
      v_action := 'song.deleted';
    elsif v_previous ->> 'status' is distinct from v_row ->> 'status'
      and v_row ->> 'status' = 'archived' then
      v_action := 'song.archived';
    elsif v_previous ->> 'status' = 'archived'
      and v_row ->> 'status' = 'active' then
      v_action := 'song.restored';
    else
      v_action := 'song.updated';
    end if;
  elsif v_entity_type = 'service' then
    v_organization_id := (v_row ->> 'organization_id')::uuid;
    v_entity_id := (v_row ->> 'id')::uuid;
    v_entity_name := v_row ->> 'name';

    if tg_op = 'INSERT' then
      v_action := 'service.created';
    elsif tg_op = 'DELETE' then
      v_action := 'service.deleted';
    elsif v_previous ->> 'status' is distinct from v_row ->> 'status'
      and v_row ->> 'status' = 'archived' then
      v_action := 'service.archived';
    elsif v_previous ->> 'status' = 'archived'
      and v_row ->> 'status' <> 'archived' then
      v_action := 'service.restored';
    elsif v_previous ->> 'status' is distinct from v_row ->> 'status'
      and v_row ->> 'status' = 'published' then
      v_action := 'service.published';
    else
      v_action := 'service.updated';
    end if;
  elsif v_entity_type = 'member' then
    v_organization_id := (v_row ->> 'organization_id')::uuid;
    v_entity_id := (v_row ->> 'user_id')::uuid;
    v_entity_name := 'Team member';

    select coalesce(nullif(trim(p.display_name), ''), 'Team member')
    into v_member_name
    from public.profiles as p
    where p.id = v_entity_id;
    v_member_name := coalesce(v_member_name, 'Team member');
    v_entity_name := v_member_name;

    if tg_op = 'INSERT' then
      v_action := 'member.joined';
      v_details := jsonb_build_object('role', v_row ->> 'role');
    elsif tg_op = 'DELETE' then
      v_action := 'member.removed';
      v_details := jsonb_build_object('member_name', v_member_name);
    elsif v_previous ->> 'role' is distinct from v_row ->> 'role' then
      v_action := 'member.role_changed';
      v_details := jsonb_build_object(
        'member_name', v_member_name,
        'role', v_row ->> 'role'
      );
    elsif v_previous -> 'team_positions' is distinct from v_row -> 'team_positions' then
      v_action := 'member.positions_changed';
      v_details := jsonb_build_object(
        'member_name', v_member_name,
        'team_positions', v_row -> 'team_positions'
      );
    else
      return null;
    end if;
  elsif v_entity_type = 'team_assignment' then
    v_setlist_id := (v_row ->> 'setlist_id')::uuid;
    v_entity_id := v_setlist_id;
    v_entity_type := 'service';

    select s.organization_id, s.name
    into v_organization_id, v_entity_name
    from public.setlists as s
    where s.id = v_setlist_id;

    select coalesce(nullif(trim(p.display_name), ''), 'Team member')
    into v_member_name
    from public.profiles as p
    where p.id = (v_row ->> 'user_id')::uuid;
    v_member_name := coalesce(v_member_name, 'Team member');

    if tg_op = 'INSERT' then
      v_action := 'team.assigned';
    else
      v_action := 'team.unassigned';
    end if;

    v_details := jsonb_build_object(
      'member_name', v_member_name,
      'position', v_row ->> 'team_position'
    );
  elsif v_entity_type = 'service_song' then
    v_setlist_id := (v_row ->> 'setlist_id')::uuid;
    v_entity_id := v_setlist_id;
    v_entity_type := 'service';

    select s.organization_id, s.name
    into v_organization_id, v_entity_name
    from public.setlists as s
    where s.id = v_setlist_id;

    select s.title
    into v_song_name
    from public.songs as s
    where s.id = (v_row ->> 'song_id')::uuid;

    if tg_op = 'INSERT' then
      v_action := 'service.song_added';
    else
      v_action := 'service.song_removed';
    end if;

    v_details := jsonb_build_object(
      'song_name', coalesce(v_song_name, 'a song')
    );
  else
    raise exception 'Unsupported activity entity type: %', v_entity_type;
  end if;

  if v_organization_id is null or v_entity_name is null then
    return null;
  end if;

  insert into public.organization_activity (
    organization_id,
    actor_id,
    actor_name,
    action,
    entity_type,
    entity_id,
    entity_name,
    details
  )
  values (
    v_organization_id,
    v_actor_id,
    v_actor_name,
    v_action,
    v_entity_type,
    v_entity_id,
    v_entity_name,
    v_details
  );

  return null;
end;
$$;

revoke all on function private.log_organization_activity()
from public, anon, authenticated;

create trigger songs_activity_log
after insert or update or delete on public.songs
for each row execute function private.log_organization_activity('song');

create trigger setlists_activity_log
after insert or update or delete on public.setlists
for each row execute function private.log_organization_activity('service');

create trigger setlist_team_assignments_activity_log
after insert or delete on public.setlist_team_assignments
for each row execute function private.log_organization_activity('team_assignment');

create trigger setlist_songs_activity_log
after insert or delete on public.setlist_songs
for each row execute function private.log_organization_activity('service_song');

create trigger organization_members_activity_log
after insert or update or delete on public.organization_members
for each row execute function private.log_organization_activity('member');
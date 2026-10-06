create table if not exists public.setlists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  service_date date,
  status text not null default 'draft',
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint setlists_name_check check (
    char_length(trim(name)) between 1 and 200
  ),
  constraint setlists_status_check check (
    status in (
      'draft',
      'published',
      'archived'
    )
  )
);

create table if not exists public.setlist_songs (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete restrict,
  position integer not null,
  section text not null default 'Worship',
  key_override text,
  capo_override integer,
  tempo_override integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint setlist_songs_position_check check (
    position > 0
  ),
  constraint setlist_songs_section_check check (
    char_length(trim(section)) between 1 and 80
  ),
  constraint setlist_songs_capo_check check (
    capo_override is null
    or capo_override between 0 and 12
  ),
  constraint setlist_songs_tempo_check check (
    tempo_override is null
    or tempo_override between 20 and 300
  ),
  unique (
    setlist_id,
    position
  )
);

create index if not exists setlists_organization_id_idx
  on public.setlists(organization_id);

create index if not exists setlists_service_date_idx
  on public.setlists(service_date);

create index if not exists setlists_status_idx
  on public.setlists(status);

create index if not exists setlist_songs_setlist_id_idx
  on public.setlist_songs(setlist_id);

create index if not exists setlist_songs_song_id_idx
  on public.setlist_songs(song_id);

create index if not exists setlist_songs_setlist_position_idx
  on public.setlist_songs(
    setlist_id,
    position
  );

drop trigger if exists set_setlists_updated_at
on public.setlists;

create trigger set_setlists_updated_at
before update on public.setlists
for each row
execute function public.set_updated_at();

drop trigger if exists set_setlist_songs_updated_at
on public.setlist_songs;

create trigger set_setlist_songs_updated_at
before update on public.setlist_songs
for each row
execute function public.set_updated_at();

create or replace function private.setlist_organization_id(
  p_setlist_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id
  from public.setlists
  where id = p_setlist_id
  limit 1
$$;

revoke execute on function private.setlist_organization_id(uuid)
from public, anon, authenticated;

create or replace function public.add_song_to_setlist(
  p_setlist_id uuid,
  p_song_id uuid,
  p_section text default 'Worship',
  p_key_override text default null,
  p_capo_override integer default null,
  p_tempo_override integer default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_next_position integer;
  v_setlist_song_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  select organization_id
  into v_organization_id
  from public.setlists
  where id = p_setlist_id
  for update;

  if v_organization_id is null then
    raise exception 'SETLIST_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.organization_members
    where organization_id = v_organization_id
      and user_id = (select auth.uid())
  ) then
    raise exception 'MEMBERSHIP_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.organization_members
    where organization_id = v_organization_id
      and user_id = (select auth.uid())
      and role in (
        'admin',
        'worship_leader',
        'song_editor'
      )
  ) then
    raise exception 'EDITOR_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.songs
    where id = p_song_id
      and organization_id = v_organization_id
      and status = 'active'
  ) then
    raise exception 'SONG_NOT_AVAILABLE';
  end if;

  if exists (
    select 1
    from public.setlist_songs
    where setlist_id = p_setlist_id
      and song_id = p_song_id
  ) then
    raise exception 'SONG_ALREADY_IN_SETLIST';
  end if;

  select coalesce(max(position), 0) + 1
  into v_next_position
  from public.setlist_songs
  where setlist_id = p_setlist_id;

  insert into public.setlist_songs (
    setlist_id,
    song_id,
    position,
    section,
    key_override,
    capo_override,
    tempo_override,
    notes
  )
  values (
    p_setlist_id,
    p_song_id,
    v_next_position,
    case
      when trim(coalesce(p_section, '')) = ''
        then 'Worship'
      else trim(p_section)
    end,
    nullif(trim(coalesce(p_key_override, '')), ''),
    p_capo_override,
    p_tempo_override,
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id
  into v_setlist_song_id;

  return v_setlist_song_id;
end;
$$;

create or replace function public.update_setlist_song(
  p_setlist_song_id uuid,
  p_section text,
  p_key_override text,
  p_capo_override integer,
  p_tempo_override integer,
  p_notes text
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

  select s.organization_id
  into v_organization_id
  from public.setlist_songs ss
  join public.setlists s
    on s.id = ss.setlist_id
  where ss.id = p_setlist_song_id
  for update;

  if v_organization_id is null then
    raise exception 'SETLIST_SONG_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.organization_members
    where organization_id = v_organization_id
      and user_id = (select auth.uid())
      and role in (
        'admin',
        'worship_leader',
        'song_editor'
      )
  ) then
    raise exception 'EDITOR_REQUIRED';
  end if;

  update public.setlist_songs
  set
    section = case
      when trim(coalesce(p_section, '')) = ''
        then 'Worship'
      else trim(p_section)
    end,
    key_override = nullif(
      trim(coalesce(p_key_override, '')),
      ''
    ),
    capo_override = p_capo_override,
    tempo_override = p_tempo_override,
    notes = nullif(
      trim(coalesce(p_notes, '')),
      ''
    )
  where id = p_setlist_song_id;
end;
$$;

create or replace function public.remove_song_from_setlist(
  p_setlist_song_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_setlist_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  select
    s.organization_id,
    ss.setlist_id
  into
    v_organization_id,
    v_setlist_id
  from public.setlist_songs ss
  join public.setlists s
    on s.id = ss.setlist_id
  where ss.id = p_setlist_song_id
  for update;

  if v_organization_id is null then
    raise exception 'SETLIST_SONG_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.organization_members
    where organization_id = v_organization_id
      and user_id = (select auth.uid())
      and role in (
        'admin',
        'worship_leader',
        'song_editor'
      )
  ) then
    raise exception 'EDITOR_REQUIRED';
  end if;

  delete from public.setlist_songs
  where id = p_setlist_song_id;

  with numbered as (
    select
      id,
      row_number() over (
        order by position, created_at
      )::integer as new_position
    from public.setlist_songs
    where setlist_id = v_setlist_id
  )
  update public.setlist_songs ss
  set position = numbered.new_position
  from numbered
  where ss.id = numbered.id;
end;
$$;

create or replace function public.move_setlist_song(
  p_setlist_song_id uuid,
  p_direction text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_setlist_id uuid;
  v_current_position integer;
  v_target_id uuid;
  v_target_position integer;
  v_temp_position integer;
begin
  if auth.uid() is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  select
    s.organization_id,
    ss.setlist_id,
    ss.position
  into
    v_organization_id,
    v_setlist_id,
    v_current_position
  from public.setlist_songs ss
  join public.setlists s
    on s.id = ss.setlist_id
  where ss.id = p_setlist_song_id
  for update;

  if v_organization_id is null then
    raise exception 'SETLIST_SONG_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.organization_members
    where organization_id = v_organization_id
      and user_id = (select auth.uid())
      and role in (
        'admin',
        'worship_leader',
        'song_editor'
      )
  ) then
    raise exception 'EDITOR_REQUIRED';
  end if;

  if p_direction = 'up' then
    select id, position
    into v_target_id, v_target_position
    from public.setlist_songs
    where setlist_id = v_setlist_id
      and position < v_current_position
    order by position desc
    limit 1;
  elsif p_direction = 'down' then
    select id, position
    into v_target_id, v_target_position
    from public.setlist_songs
    where setlist_id = v_setlist_id
      and position > v_current_position
    order by position asc
    limit 1;
  else
    raise exception 'INVALID_DIRECTION';
  end if;

  if v_target_id is null then
    return;
  end if;

  v_temp_position := -abs(v_current_position);

  update public.setlist_songs
  set position = v_temp_position
  where id = p_setlist_song_id;

  update public.setlist_songs
  set position = v_current_position
  where id = v_target_id;

  update public.setlist_songs
  set position = v_target_position
  where id = p_setlist_song_id;
end;
$$;

revoke execute on function public.add_song_to_setlist(
  uuid,
  uuid,
  text,
  text,
  integer,
  integer,
  text
)
from public, anon, authenticated;

revoke execute on function public.update_setlist_song(
  uuid,
  text,
  text,
  integer,
  integer,
  text
)
from public, anon, authenticated;

revoke execute on function public.remove_song_from_setlist(uuid)
from public, anon, authenticated;

revoke execute on function public.move_setlist_song(uuid, text)
from public, anon, authenticated;

grant execute on function public.add_song_to_setlist(
  uuid,
  uuid,
  text,
  text,
  integer,
  integer,
  text
)
to authenticated;

grant execute on function public.update_setlist_song(
  uuid,
  text,
  text,
  integer,
  integer,
  text
)
to authenticated;

grant execute on function public.remove_song_from_setlist(uuid)
to authenticated;

grant execute on function public.move_setlist_song(uuid, text)
to authenticated;

alter table public.setlists enable row level security;
alter table public.setlist_songs enable row level security;

revoke all on table public.setlists
from anon, authenticated;

revoke all on table public.setlist_songs
from anon, authenticated;

grant select, insert, update, delete
on table public.setlists
to authenticated;

grant select, insert, update, delete
on table public.setlist_songs
to authenticated;

drop policy if exists "Members can view setlists"
on public.setlists;

create policy "Members can view setlists"
on public.setlists
for select
to authenticated
using (
  (select private.is_org_member(organization_id))
);

drop policy if exists "Authorized members can create setlists"
on public.setlists;

create policy "Authorized members can create setlists"
on public.setlists
for insert
to authenticated
with check (
  (select private.has_org_role(
    organization_id,
    array[
      'admin',
      'worship_leader',
      'song_editor'
    ]::text[]
  ))
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);

drop policy if exists "Authorized members can update setlists"
on public.setlists;

create policy "Authorized members can update setlists"
on public.setlists
for update
to authenticated
using (
  (select private.has_org_role(
    organization_id,
    array[
      'admin',
      'worship_leader',
      'song_editor'
    ]::text[]
  ))
)
with check (
  (select private.has_org_role(
    organization_id,
    array[
      'admin',
      'worship_leader',
      'song_editor'
    ]::text[]
  ))
);

drop policy if exists "Leaders can delete setlists"
on public.setlists;

create policy "Leaders can delete setlists"
on public.setlists
for delete
to authenticated
using (
  (select private.has_org_role(
    organization_id,
    array[
      'admin',
      'worship_leader'
    ]::text[]
  ))
);

drop policy if exists "Members can view setlist songs"
on public.setlist_songs;

create policy "Members can view setlist songs"
on public.setlist_songs
for select
to authenticated
using (
  exists (
    select 1
    from public.setlists s
    where s.id = setlist_songs.setlist_id
      and (select private.is_org_member(s.organization_id))
  )
);

drop policy if exists "Authorized members can add setlist songs"
on public.setlist_songs;

create policy "Authorized members can add setlist songs"
on public.setlist_songs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.setlists s
    where s.id = setlist_songs.setlist_id
      and (select private.has_org_role(
        s.organization_id,
        array[
          'admin',
          'worship_leader',
          'song_editor'
        ]::text[]
      ))
      and exists (
        select 1
        from public.songs song
        where song.id = setlist_songs.song_id
          and song.organization_id = s.organization_id
      )
  )
);

drop policy if exists "Authorized members can update setlist songs"
on public.setlist_songs;

create policy "Authorized members can update setlist songs"
on public.setlist_songs
for update
to authenticated
using (
  exists (
    select 1
    from public.setlists s
    where s.id = setlist_songs.setlist_id
      and (select private.has_org_role(
        s.organization_id,
        array[
          'admin',
          'worship_leader',
          'song_editor'
        ]::text[]
      ))
  )
)
with check (
  exists (
    select 1
    from public.setlists s
    where s.id = setlist_songs.setlist_id
      and (select private.has_org_role(
        s.organization_id,
        array[
          'admin',
          'worship_leader',
          'song_editor'
        ]::text[]
      ))
  )
);

drop policy if exists "Authorized members can delete setlist songs"
on public.setlist_songs;

create policy "Authorized members can delete setlist songs"
on public.setlist_songs
for delete
to authenticated
using (
  exists (
    select 1
    from public.setlists s
    where s.id = setlist_songs.setlist_id
      and (select private.has_org_role(
        s.organization_id,
        array[
          'admin',
          'worship_leader',
          'song_editor'
        ]::text[]
      ))
  )
);

create or replace function private.validate_setlist_song_organization()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_setlist_organization_id uuid;
  v_song_organization_id uuid;
begin
  select organization_id
  into v_setlist_organization_id
  from public.setlists
  where id = new.setlist_id;

  select organization_id
  into v_song_organization_id
  from public.songs
  where id = new.song_id;

  if v_setlist_organization_id is null then
    raise exception 'SETLIST_NOT_FOUND';
  end if;

  if v_song_organization_id is null then
    raise exception 'SONG_NOT_FOUND';
  end if;

  if v_setlist_organization_id <> v_song_organization_id then
    raise exception 'SONG_ORGANIZATION_MISMATCH';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_setlist_song_organization
on public.setlist_songs;

create trigger validate_setlist_song_organization
before insert or update
on public.setlist_songs
for each row
execute function private.validate_setlist_song_organization();
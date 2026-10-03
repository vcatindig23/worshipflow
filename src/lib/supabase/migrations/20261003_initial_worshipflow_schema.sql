create schema if not exists private;

revoke all on schema private from public;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Worship Member',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(trim(display_name)) between 1 and 120),
  constraint profiles_avatar_url_length check (avatar_url is null or char_length(avatar_url) <= 500)
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_length check (char_length(trim(name)) between 2 and 120),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint organizations_slug_length check (char_length(slug) between 2 and 80)
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  constraint organization_members_role_check check (
    role in (
      'admin',
      'worship_leader',
      'song_editor',
      'team_member',
      'viewer'
    )
  )
);

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  artist text,
  album text,
  original_key text,
  current_key text,
  tempo smallint,
  time_signature text not null default '4/4',
  capo smallint not null default 0,
  chordpro_source text not null default '',
  notes text,
  status text not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint songs_title_length check (char_length(trim(title)) between 1 and 200),
  constraint songs_artist_length check (artist is null or char_length(artist) <= 200),
  constraint songs_album_length check (album is null or char_length(album) <= 200),
  constraint songs_original_key_length check (
    original_key is null or char_length(trim(original_key)) between 1 and 20
  ),
  constraint songs_current_key_length check (
    current_key is null or char_length(trim(current_key)) between 1 and 20
  ),
  constraint songs_tempo_range check (
    tempo is null or tempo between 20 and 300
  ),
  constraint songs_time_signature_format check (
    time_signature ~ '^[0-9]{1,2}/[0-9]{1,2}$'
  ),
  constraint songs_capo_range check (
    capo between 0 and 12
  ),
  constraint songs_chordpro_length check (
    char_length(chordpro_source) <= 500000
  ),
  constraint songs_status_check check (
    status in ('active', 'archived')
  )
);

create table public.song_versions (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  version_number integer not null,
  title text not null,
  artist text,
  album text,
  original_key text,
  current_key text,
  tempo smallint,
  time_signature text not null default '4/4',
  capo smallint not null default 0,
  chordpro_source text not null default '',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (song_id, version_number),
  constraint song_versions_version_number_check check (version_number > 0),
  constraint song_versions_title_length check (char_length(trim(title)) between 1 and 200),
  constraint song_versions_tempo_range check (
    tempo is null or tempo between 20 and 300
  ),
  constraint song_versions_time_signature_format check (
    time_signature ~ '^[0-9]{1,2}/[0-9]{1,2}$'
  ),
  constraint song_versions_capo_range check (
    capo between 0 and 12
  ),
  constraint song_versions_chordpro_length check (
    char_length(chordpro_source) <= 500000
  )
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tags_name_length check (char_length(trim(name)) between 1 and 50)
);

create unique index tags_organization_name_unique
on public.tags (organization_id, lower(trim(name)));

create table public.song_tags (
  song_id uuid not null references public.songs(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (song_id, tag_id)
);

create index organization_members_user_id_idx
on public.organization_members(user_id);

create index songs_organization_id_idx
on public.songs(organization_id);

create index songs_organization_id_title_idx
on public.songs(organization_id, lower(title));

create index songs_organization_id_artist_idx
on public.songs(organization_id, lower(artist));

create index song_versions_song_id_created_at_idx
on public.song_versions(song_id, created_at desc);

create index tags_organization_id_idx
on public.tags(organization_id);

create index song_tags_tag_id_idx
on public.song_tags(tag_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger organizations_set_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

create trigger songs_set_updated_at
before update on public.songs
for each row
execute function public.set_updated_at();

create trigger tags_set_updated_at
before update on public.tags
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    display_name
  )
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Worship Member'
    )
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function private.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = p_organization_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.has_org_role(
  p_organization_id uuid,
  p_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = p_organization_id
      and user_id = (select auth.uid())
      and role = any(p_roles)
  );
$$;

create or replace function private.can_view_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id = (select auth.uid())
    or exists (
      select 1
      from public.organization_members current_member
      join public.organization_members target_member
        on target_member.organization_id = current_member.organization_id
      where current_member.user_id = (select auth.uid())
        and target_member.user_id = p_user_id
    );
$$;

create or replace function private.song_organization_id(p_song_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id
  from public.songs
  where id = p_song_id;
$$;

create or replace function private.validate_song_version_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_song_organization_id uuid;
begin
  select organization_id
  into v_song_organization_id
  from public.songs
  where id = new.song_id;

  if v_song_organization_id is null then
    raise exception 'Song does not exist';
  end if;

  if v_song_organization_id <> new.organization_id then
    raise exception 'Song version organization does not match song organization';
  end if;

  return new;
end;
$$;

create trigger song_versions_validate_organization
before insert or update on public.song_versions
for each row
execute function private.validate_song_version_organization();

create or replace function private.validate_song_tag_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_song_organization_id uuid;
  v_tag_organization_id uuid;
begin
  select organization_id
  into v_song_organization_id
  from public.songs
  where id = new.song_id;

  select organization_id
  into v_tag_organization_id
  from public.tags
  where id = new.tag_id;

  if v_song_organization_id is null then
    raise exception 'Song does not exist';
  end if;

  if v_tag_organization_id is null then
    raise exception 'Tag does not exist';
  end if;

  if v_song_organization_id <> v_tag_organization_id then
    raise exception 'Song and tag must belong to the same organization';
  end if;

  return new;
end;
$$;

create trigger song_tags_validate_organization
before insert or update on public.song_tags
for each row
execute function private.validate_song_tag_organization();

create or replace function private.prevent_organization_change()
returns trigger
language plpgsql
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'Organization ownership cannot be changed';
  end if;

  return new;
end;
$$;

create trigger songs_prevent_organization_change
before update on public.songs
for each row
execute function private.prevent_organization_change();

create trigger tags_prevent_organization_change
before update on public.tags
for each row
execute function private.prevent_organization_change();

create trigger song_versions_prevent_organization_change
before update on public.song_versions
for each row
execute function private.prevent_organization_change();

create or replace function public.create_organization(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_name text;
  v_base_slug text;
  v_slug text;
  v_organization_id uuid;
begin
  v_user_id := (select auth.uid());

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_name := trim(p_name);

  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'Organization name must be between 2 and 120 characters';
  end if;

  v_base_slug := trim(
    both '-'
    from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g')
  );

  if char_length(v_base_slug) < 2 then
    raise exception 'Organization name must contain usable letters or numbers';
  end if;

  v_slug := v_base_slug;

  loop
    begin
      insert into public.organizations (
        name,
        slug,
        created_by
      )
      values (
        v_name,
        v_slug,
        v_user_id
      )
      returning id into v_organization_id;

      exit;
    exception
      when unique_violation then
        v_slug := v_base_slug || '-' ||
          substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    end;
  end loop;

  insert into public.organization_members (
    organization_id,
    user_id,
    role
  )
  values (
    v_organization_id,
    v_user_id,
    'admin'
  );

  return v_organization_id;
end;
$$;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

revoke execute on function public.create_organization(text) from public;
revoke execute on function public.create_organization(text) from anon;
grant execute on function public.create_organization(text) to authenticated;

revoke all on all tables in schema private from public;

grant usage on schema private to authenticated;

grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;

grant select on public.organizations to authenticated;
grant update on public.organizations to authenticated;

grant select on public.organization_members to authenticated;

grant select, insert, update, delete on public.songs to authenticated;

grant select, insert on public.song_versions to authenticated;

grant select, insert, update, delete on public.tags to authenticated;

grant select, insert, delete on public.song_tags to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.songs enable row level security;
alter table public.song_versions enable row level security;
alter table public.tags enable row level security;
alter table public.song_tags enable row level security;

create policy "Members can view their profiles"
on public.profiles
for select
to authenticated
using ((select private.can_view_profile(id)));

create policy "Users can update their own profiles"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Members can view organizations"
on public.organizations
for select
to authenticated
using ((select private.is_org_member(id)));

create policy "Administrators can update organizations"
on public.organizations
for update
to authenticated
using ((select private.has_org_role(id, array['admin']::text[])))
with check ((select private.has_org_role(id, array['admin']::text[])));

create policy "Members can view organization membership"
on public.organization_members
for select
to authenticated
using ((select private.is_org_member(organization_id)));

create policy "Members can view songs"
on public.songs
for select
to authenticated
using ((select private.is_org_member(organization_id)));

create policy "Authorized members can create songs"
on public.songs
for insert
to authenticated
with check (
  (select private.has_org_role(
    organization_id,
    array['admin', 'worship_leader', 'song_editor']::text[]
  ))
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);

create policy "Authorized members can update songs"
on public.songs
for update
to authenticated
using (
  (select private.has_org_role(
    organization_id,
    array['admin', 'worship_leader', 'song_editor']::text[]
  ))
)
with check (
  (select private.has_org_role(
    organization_id,
    array['admin', 'worship_leader', 'song_editor']::text[]
  ))
);

create policy "Authorized members can delete songs"
on public.songs
for delete
to authenticated
using (
  (select private.has_org_role(
    organization_id,
    array['admin', 'worship_leader', 'song_editor']::text[]
  ))
);

create policy "Members can view song versions"
on public.song_versions
for select
to authenticated
using ((select private.is_org_member(organization_id)));

create policy "Authorized members can create song versions"
on public.song_versions
for insert
to authenticated
with check (
  (select private.has_org_role(
    organization_id,
    array['admin', 'worship_leader', 'song_editor']::text[]
  ))
  and created_by = (select auth.uid())
);

create policy "Members can view tags"
on public.tags
for select
to authenticated
using ((select private.is_org_member(organization_id)));

create policy "Authorized members can create tags"
on public.tags
for insert
to authenticated
with check (
  (select private.has_org_role(
    organization_id,
    array['admin', 'worship_leader', 'song_editor']::text[]
  ))
  and created_by = (select auth.uid())
);

create policy "Authorized members can update tags"
on public.tags
for update
to authenticated
using (
  (select private.has_org_role(
    organization_id,
    array['admin', 'worship_leader', 'song_editor']::text[]
  ))
)
with check (
  (select private.has_org_role(
    organization_id,
    array['admin', 'worship_leader', 'song_editor']::text[]
  ))
);

create policy "Authorized members can delete tags"
on public.tags
for delete
to authenticated
using (
  (select private.has_org_role(
    organization_id,
    array['admin', 'worship_leader', 'song_editor']::text[]
  ))
);

create policy "Members can view song tags"
on public.song_tags
for select
to authenticated
using (
  (select private.is_org_member(
    private.song_organization_id(song_id)
  ))
);

create policy "Authorized members can add song tags"
on public.song_tags
for insert
to authenticated
with check (
  (select private.has_org_role(
    private.song_organization_id(song_id),
    array['admin', 'worship_leader', 'song_editor']::text[]
  ))
);

create policy "Authorized members can remove song tags"
on public.song_tags
for delete
to authenticated
using (
  (select private.has_org_role(
    private.song_organization_id(song_id),
    array['admin', 'worship_leader', 'song_editor']::text[]
  ))
);git status
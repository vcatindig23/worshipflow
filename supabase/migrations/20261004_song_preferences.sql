create table public.song_user_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  is_favorite boolean not null default false,
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

create index song_user_preferences_song_id_idx
on public.song_user_preferences(song_id);

create index song_user_preferences_user_recent_idx
on public.song_user_preferences(user_id, last_opened_at desc);

create trigger song_user_preferences_set_updated_at
before update on public.song_user_preferences
for each row
execute function public.set_updated_at();

alter table public.song_user_preferences
enable row level security;

grant select, insert, update, delete
on public.song_user_preferences
to authenticated;

create policy "Users can view their song preferences"
on public.song_user_preferences
for select
to authenticated
using (
  user_id = (select auth.uid())
  and (
    select private.is_org_member(
      private.song_organization_id(song_id)
    )
  )
);

create policy "Users can create their song preferences"
on public.song_user_preferences
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (
    select private.is_org_member(
      private.song_organization_id(song_id)
    )
  )
);

create policy "Users can update their song preferences"
on public.song_user_preferences
for update
to authenticated
using (
  user_id = (select auth.uid())
  and (
    select private.is_org_member(
      private.song_organization_id(song_id)
    )
  )
)
with check (
  user_id = (select auth.uid())
  and (
    select private.is_org_member(
      private.song_organization_id(song_id)
    )
  )
);

create policy "Users can delete their song preferences"
on public.song_user_preferences
for delete
to authenticated
using (
  user_id = (select auth.uid())
  and (
    select private.is_org_member(
      private.song_organization_id(song_id)
    )
  )
);

create or replace function public.toggle_song_favorite(
  p_song_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_organization_id uuid;
  v_is_favorite boolean;
begin
  v_user_id := (select auth.uid());

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select organization_id
  into v_organization_id
  from public.songs
  where id = p_song_id
    and status in ('active', 'archived');

  if v_organization_id is null then
    raise exception 'Song not found';
  end if;

  if not exists (
    select 1
    from public.organization_members
    where organization_id = v_organization_id
      and user_id = v_user_id
  ) then
    raise exception 'Not authorized';
  end if;

  select is_favorite
  into v_is_favorite
  from public.song_user_preferences
  where user_id = v_user_id
    and song_id = p_song_id;

  v_is_favorite := not coalesce(v_is_favorite, false);

  insert into public.song_user_preferences (
    user_id,
    song_id,
    is_favorite,
    updated_at
  )
  values (
    v_user_id,
    p_song_id,
    v_is_favorite,
    now()
  )
  on conflict (user_id, song_id)
  do update
  set
    is_favorite = excluded.is_favorite,
    updated_at = now();

  return v_is_favorite;
end;
$$;

create or replace function public.record_song_open(
  p_song_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_organization_id uuid;
begin
  v_user_id := (select auth.uid());

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select organization_id
  into v_organization_id
  from public.songs
  where id = p_song_id
    and status in ('active', 'archived');

  if v_organization_id is null then
    raise exception 'Song not found';
  end if;

  if not exists (
    select 1
    from public.organization_members
    where organization_id = v_organization_id
      and user_id = v_user_id
  ) then
    raise exception 'Not authorized';
  end if;

  insert into public.song_user_preferences (
    user_id,
    song_id,
    last_opened_at,
    updated_at
  )
  values (
    v_user_id,
    p_song_id,
    now(),
    now()
  )
  on conflict (user_id, song_id)
  do update
  set
    last_opened_at = now(),
    updated_at = now();
end;
$$;

revoke execute on function public.toggle_song_favorite(uuid)
from public;

revoke execute on function public.toggle_song_favorite(uuid)
from anon;

grant execute on function public.toggle_song_favorite(uuid)
to authenticated;

revoke execute on function public.record_song_open(uuid)
from public;

revoke execute on function public.record_song_open(uuid)
from anon;

grant execute on function public.record_song_open(uuid)
to authenticated;

drop policy if exists "Authorized members can delete songs"
on public.songs;

create policy "Administrators can delete songs"
on public.songs
for delete
to authenticated
using (
  (
    select private.has_org_role(
      organization_id,
      array['admin']::text[]
    )
  )
);
-- Fix song reordering and enforce service timeline relationships in the database.
-- This migration preserves current service plans, timeline items, and song assignments.

create or replace function public.move_setlist_song(
  p_setlist_song_id uuid,
  p_direction text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
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
      and role in ('admin', 'worship_leader', 'song_editor')
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

  -- Use a valid, unused position so the positive-position CHECK constraint
  -- and per-setlist position uniqueness are both preserved during the swap.
  select coalesce(max(position), 0) + 1
  into v_temp_position
  from public.setlist_songs
  where setlist_id = v_setlist_id;

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
$function$;

revoke execute on function public.move_setlist_song(uuid, text)
from public, anon, authenticated;

grant execute on function public.move_setlist_song(uuid, text)
to authenticated;

-- All current data was checked for duplicate (setlist_id, song_id) pairs.
create unique index if not exists setlist_songs_setlist_song_unique_idx
  on public.setlist_songs (setlist_id, song_id);

create unique index if not exists setlists_id_organization_id_unique_idx
  on public.setlists (id, organization_id);

do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'setlist_timeline_items_setlist_org_fkey'
      and conrelid = 'public.setlist_timeline_items'::regclass
  ) then
    alter table public.setlist_timeline_items
      add constraint setlist_timeline_items_setlist_org_fkey
      foreign key (setlist_id, organization_id)
      references public.setlists (id, organization_id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'setlist_timeline_items_song_setlist_fkey'
      and conrelid = 'public.setlist_timeline_items'::regclass
  ) then
    alter table public.setlist_timeline_items
      add constraint setlist_timeline_items_song_setlist_fkey
      foreign key (setlist_id, song_id)
      references public.setlist_songs (setlist_id, song_id)
      on delete set null (song_id);
  end if;
end;
$migration$;

-- Setlist songs are changed through role-checked SECURITY DEFINER RPCs only.
-- Keep direct reads for server-rendered setlist pages, but disallow direct DML.
revoke insert, update, delete on table public.setlist_songs from authenticated;
grant select on table public.setlist_songs to authenticated;

drop policy if exists "Editors can create service timeline items"
  on public.setlist_timeline_items;

create policy "Editors can create service timeline items"
on public.setlist_timeline_items
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id = setlist_timeline_items.organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('admin', 'worship_leader', 'song_editor')
  )
  and exists (
    select 1
    from public.setlists s
    where s.id = setlist_timeline_items.setlist_id
      and s.organization_id = setlist_timeline_items.organization_id
  )
  and (
    song_id is null
    or exists (
      select 1
      from public.setlist_songs ss
      where ss.setlist_id = setlist_timeline_items.setlist_id
        and ss.song_id = setlist_timeline_items.song_id
    )
  )
);

drop policy if exists "Editors can update service timeline items"
  on public.setlist_timeline_items;

create policy "Editors can update service timeline items"
on public.setlist_timeline_items
for update
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = setlist_timeline_items.organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('admin', 'worship_leader', 'song_editor')
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = setlist_timeline_items.organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('admin', 'worship_leader', 'song_editor')
  )
  and exists (
    select 1
    from public.setlists s
    where s.id = setlist_timeline_items.setlist_id
      and s.organization_id = setlist_timeline_items.organization_id
  )
  and (
    song_id is null
    or exists (
      select 1
      from public.setlist_songs ss
      where ss.setlist_id = setlist_timeline_items.setlist_id
        and ss.song_id = setlist_timeline_items.song_id
    )
  )
);

notify pgrst, 'reload schema';

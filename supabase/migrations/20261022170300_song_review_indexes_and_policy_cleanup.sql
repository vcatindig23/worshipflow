-- Cover foreign-key lookups, remove overlapping permissive policies, and use RLS for song-open tracking.
create index if not exists song_review_comments_organization_id_idx
  on public.song_review_comments (organization_id);
create index if not exists song_review_comments_song_id_idx
  on public.song_review_comments (song_id);
create index if not exists song_review_comments_user_id_idx
  on public.song_review_comments (user_id);
create index if not exists song_review_threads_requested_by_idx
  on public.song_review_threads (requested_by);
create index if not exists song_review_threads_reviewed_by_idx
  on public.song_review_threads (reviewed_by);
create index if not exists song_review_threads_updated_by_idx
  on public.song_review_threads (updated_by);
create index if not exists notifications_song_id_idx
  on public.notifications (song_id);

drop policy if exists "Workspace members can start draft or requested review threads"
  on public.song_review_threads;
drop policy if exists "Song editors can start reviewed song threads"
  on public.song_review_threads;

create policy "Authorized members can start song review threads"
on public.song_review_threads for insert to authenticated
with check (
  requested_by = (select auth.uid())
  and exists (
    select 1 from public.songs as song
    where song.id = song_review_threads.song_id
      and song.organization_id = song_review_threads.organization_id
  )
  and (
    (
      status in ('draft', 'in_review')
      and (select private.is_org_member(organization_id))
    )
    or
    (
      (select private.has_org_role(
        organization_id,
        array['admin', 'worship_leader', 'song_editor']::text[]
      ))
    )
  )
);

drop policy if exists "Members can request review for draft songs"
  on public.song_review_threads;
drop policy if exists "Song editors can update review status"
  on public.song_review_threads;

create policy "Authorized members can update song review status"
on public.song_review_threads for update to authenticated
using (
  (select private.has_org_role(
    organization_id,
    array['admin', 'worship_leader', 'song_editor']::text[]
  ))
  or (
    status = 'draft'
    and (select private.is_org_member(organization_id))
  )
)
with check (
  updated_by = (select auth.uid())
  and exists (
    select 1 from public.songs as song
    where song.id = song_review_threads.song_id
      and song.organization_id = song_review_threads.organization_id
  )
  and (
    (select private.has_org_role(
      organization_id,
      array['admin', 'worship_leader', 'song_editor']::text[]
    ))
    or (
      status = 'in_review'
      and reviewed_by is null
      and (select private.is_org_member(organization_id))
    )
  )
);

create or replace function public.record_song_open(p_song_id uuid)
returns void
language plpgsql
security invoker
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

  select song.organization_id
    into v_organization_id
    from public.songs as song
    where song.id = p_song_id
      and song.status in ('active', 'archived');

  if v_organization_id is null then
    raise exception 'Song not found';
  end if;

  if not exists (
    select 1 from public.organization_members as member
    where member.organization_id = v_organization_id and member.user_id = v_user_id
  ) then
    raise exception 'Not authorized';
  end if;

  insert into public.song_user_preferences (
    user_id, song_id, last_opened_at, open_count, updated_at
  )
  values (v_user_id, p_song_id, now(), 1, now())
  on conflict (user_id, song_id)
  do update set
    last_opened_at = now(),
    open_count = public.song_user_preferences.open_count + 1,
    updated_at = now();
end;
$$;

revoke execute on function public.record_song_open(uuid) from public, anon;
grant execute on function public.record_song_open(uuid) to authenticated;

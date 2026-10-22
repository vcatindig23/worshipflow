-- Constrain review requests and status updates to the intended member roles.
drop policy if exists "Workspace members can start song review threads"
on public.song_review_threads;

create policy "Workspace members can start draft or requested review threads"
on public.song_review_threads for insert to authenticated
with check (
  requested_by = (select auth.uid())
  and status in ('draft', 'in_review')
  and (select private.is_org_member(organization_id))
  and exists (
    select 1 from public.songs as song
    where song.id = song_review_threads.song_id
      and song.organization_id = song_review_threads.organization_id
  )
);

create policy "Song editors can start reviewed song threads"
on public.song_review_threads for insert to authenticated
with check (
  requested_by = (select auth.uid())
  and (select private.has_org_role(
    organization_id,
    array['admin', 'worship_leader', 'song_editor']::text[]
  ))
  and exists (
    select 1 from public.songs as song
    where song.id = song_review_threads.song_id
      and song.organization_id = song_review_threads.organization_id
  )
);

drop policy if exists "Song editors can update review status"
on public.song_review_threads;

create policy "Song editors can update review status"
on public.song_review_threads for update to authenticated
using (
  (select private.has_org_role(
    organization_id,
    array['admin', 'worship_leader', 'song_editor']::text[]
  ))
)
with check (
  updated_by = (select auth.uid())
  and (select private.has_org_role(
    organization_id,
    array['admin', 'worship_leader', 'song_editor']::text[]
  ))
  and exists (
    select 1 from public.songs as song
    where song.id = song_review_threads.song_id
      and song.organization_id = song_review_threads.organization_id
  )
);

create policy "Members can request review for draft songs"
on public.song_review_threads for update to authenticated
using (
  status = 'draft'
  and (select private.is_org_member(organization_id))
)
with check (
  status = 'in_review'
  and updated_by = (select auth.uid())
  and reviewed_by is null
  and (select private.is_org_member(organization_id))
  and exists (
    select 1 from public.songs as song
    where song.id = song_review_threads.song_id
      and song.organization_id = song_review_threads.organization_id
  )
);

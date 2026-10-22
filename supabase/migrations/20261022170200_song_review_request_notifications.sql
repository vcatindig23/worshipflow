-- A request for review can be created by inserting an in_review thread.
-- Notify teammates for that insert as well as for later status changes.
create or replace function private.notify_song_review_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_song_title text;
  v_actor_id uuid;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;
  if new.status = 'draft' then
    return new;
  end if;

  v_actor_id := coalesce(new.updated_by, (select auth.uid()));

  select song.title into v_song_title
  from public.songs as song
  where song.id = new.song_id and song.organization_id = new.organization_id;

  insert into public.notifications (
    user_id, organization_id, setlist_id, song_id, type, title, body
  )
  select member.user_id, new.organization_id, null, new.song_id,
         'song_review_status', 'Song review status changed',
         '“' || coalesce(v_song_title, 'Song') || '” is now ' ||
           replace(new.status, '_', ' ') || '.'
  from public.organization_members as member
  where member.organization_id = new.organization_id
    and (v_actor_id is null or member.user_id <> v_actor_id);

  return new;
end;
$$;

revoke all on function private.notify_song_review_status()
from public, anon, authenticated;

drop trigger if exists notify_song_review_status
on public.song_review_threads;

create trigger notify_song_review_status
after insert or update of status on public.song_review_threads
for each row
execute function private.notify_song_review_status();

-- Song usage analytics and workspace-scoped collaborative review threads.
alter table public.song_user_preferences
  add column open_count integer not null default 0;

update public.song_user_preferences
set open_count = 1
where last_opened_at is not null and open_count = 0;

alter table public.song_user_preferences
  add constraint song_user_preferences_open_count_check
  check (open_count >= 0);

create index song_user_preferences_user_open_count_idx
  on public.song_user_preferences (user_id, open_count desc, last_opened_at desc);

create or replace function public.record_song_open(p_song_id uuid)
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

create table public.song_review_threads (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null unique references public.songs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null default 'draft',
  requested_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint song_review_threads_status_check
    check (status in ('draft', 'in_review', 'changes_requested', 'approved'))
);

create index song_review_threads_org_status_idx
  on public.song_review_threads (organization_id, status, updated_at desc);

create trigger song_review_threads_set_updated_at
before update on public.song_review_threads
for each row execute function public.set_updated_at();

create table public.song_review_comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.song_review_threads(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint song_review_comments_body_length_check
    check (char_length(trim(body)) between 1 and 5000)
);

create index song_review_comments_thread_created_idx
  on public.song_review_comments (thread_id, created_at asc);

alter table public.song_review_threads enable row level security;
alter table public.song_review_comments enable row level security;

grant select, insert, update on public.song_review_threads to authenticated;
grant select, insert, delete on public.song_review_comments to authenticated;

create policy "Workspace members can view song review threads"
on public.song_review_threads for select to authenticated
using (
  (select private.is_org_member(organization_id))
  and exists (
    select 1 from public.songs as song
    where song.id = song_review_threads.song_id
      and song.organization_id = song_review_threads.organization_id
  )
);

create policy "Workspace members can start song review threads"
on public.song_review_threads for insert to authenticated
with check (
  requested_by = (select auth.uid())
  and (select private.is_org_member(organization_id))
  and exists (
    select 1 from public.songs as song
    where song.id = song_review_threads.song_id
      and song.organization_id = song_review_threads.organization_id
  )
);

create policy "Song editors can update review status"
on public.song_review_threads for update to authenticated
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
  and exists (
    select 1 from public.songs as song
    where song.id = song_review_threads.song_id
      and song.organization_id = song_review_threads.organization_id
  )
);

create policy "Workspace members can view song review comments"
on public.song_review_comments for select to authenticated
using (
  (select private.is_org_member(organization_id))
  and exists (
    select 1 from public.song_review_threads as thread
    where thread.id = song_review_comments.thread_id
      and thread.song_id = song_review_comments.song_id
      and thread.organization_id = song_review_comments.organization_id
  )
);

create policy "Workspace members can add song review comments"
on public.song_review_comments for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.is_org_member(organization_id))
  and exists (
    select 1 from public.song_review_threads as thread
    join public.songs as song on song.id = thread.song_id
    where thread.id = song_review_comments.thread_id
      and thread.song_id = song_review_comments.song_id
      and thread.organization_id = song_review_comments.organization_id
      and song.organization_id = song_review_comments.organization_id
  )
);

create policy "Authors can remove their own song review comments"
on public.song_review_comments for delete to authenticated
using (
  user_id = (select auth.uid())
  and (select private.is_org_member(organization_id))
);

alter table public.notifications
  add column song_id uuid references public.songs(id) on delete set null;

create index notifications_user_song_created_idx
  on public.notifications (user_id, song_id, created_at desc)
  where song_id is not null;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type = any (array[
      'service_assignment',
      'service_assignment_removed',
      'team_chat_message',
      'team_chat_mention',
      'service_announcement',
      'assignment_swap_request',
      'assignment_swap_status',
      'service_reminder',
      'song_edited',
      'song_review_comment',
      'song_review_status'
    ]::text[])
  );

create or replace function private.notify_song_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
begin
  if row(new.title, new.artist, new.current_key, new.tempo, new.time_signature, new.capo, new.chordpro_source, new.notes)
     is not distinct from
     row(old.title, old.artist, old.current_key, old.tempo, old.time_signature, old.capo, old.chordpro_source, old.notes) then
    return new;
  end if;

  v_actor_id := coalesce(new.updated_by, (select auth.uid()));
  if v_actor_id is null then return new; end if;

  insert into public.notifications (
    user_id, organization_id, setlist_id, song_id, type, title, body
  )
  select member.user_id, new.organization_id, null, new.id, 'song_edited',
         'Song arrangement updated',
         '“' || new.title || '” was updated by a teammate.'
  from public.organization_members as member
  where member.organization_id = new.organization_id
    and member.user_id <> v_actor_id;

  return new;
end;
$$;

revoke all on function private.notify_song_edit() from public, anon, authenticated;

create trigger notify_song_edit
after update of title, artist, current_key, tempo, time_signature, capo, chordpro_source, notes
on public.songs for each row execute function private.notify_song_edit();

create or replace function private.notify_song_review_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_song_title text;
  v_author_name text;
begin
  select song.title into v_song_title
  from public.songs as song
  where song.id = new.song_id and song.organization_id = new.organization_id;

  select coalesce(nullif(trim(profile.display_name), ''), 'A teammate')
    into v_author_name
    from public.profiles as profile where profile.id = new.user_id;

  v_song_title := coalesce(v_song_title, 'a song');
  v_author_name := coalesce(v_author_name, 'A teammate');

  insert into public.notifications (
    user_id, organization_id, setlist_id, song_id, type, title, body
  )
  select member.user_id, new.organization_id, null, new.song_id,
         'song_review_comment', 'New song review comment',
         v_author_name || ' commented on “' || v_song_title || '”.'
  from public.organization_members as member
  where member.organization_id = new.organization_id
    and member.user_id <> new.user_id
    and (
      member.role in ('admin', 'worship_leader', 'song_editor')
      or member.user_id = (
        select thread.requested_by from public.song_review_threads as thread
        where thread.id = new.thread_id
      )
    );

  return new;
end;
$$;

revoke all on function private.notify_song_review_comment() from public, anon, authenticated;

create trigger notify_song_review_comment
after insert on public.song_review_comments
for each row execute function private.notify_song_review_comment();

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
  if new.status is not distinct from old.status then return new; end if;
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

revoke all on function private.notify_song_review_status() from public, anon, authenticated;

create trigger notify_song_review_status
after update of status on public.song_review_threads
for each row execute function private.notify_song_review_status();

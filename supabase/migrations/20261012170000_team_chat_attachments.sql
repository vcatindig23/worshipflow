alter table public.team_chat_messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

alter table public.team_chat_messages
  drop constraint if exists team_chat_messages_attachments_array;

alter table public.team_chat_messages
  add constraint team_chat_messages_attachments_array
  check (jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 5);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'team-chat-files',
  'team-chat-files',
  false,
  26214400,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav',
    'video/mp4', 'video/webm'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Team members can view team chat attachments" on storage.objects;
create policy "Team members can view team chat attachments"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'team-chat-files'
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id::text = (storage.foldername(name))[1]
      and om.user_id = (select auth.uid())
  )
);

drop policy if exists "Team members can upload their own team chat attachments" on storage.objects;
create policy "Team members can upload their own team chat attachments"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'team-chat-files'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id::text = (storage.foldername(name))[1]
      and om.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can delete their own team chat attachments" on storage.objects;
create policy "Users can delete their own team chat attachments"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'team-chat-files'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id::text = (storage.foldername(name))[1]
      and om.user_id = (select auth.uid())
  )
);

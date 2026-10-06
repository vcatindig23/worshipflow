insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'workspace-files',
  'workspace-files',
  false,
  26214400,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/webp',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/x-wav'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Organization members can view workspace files"
on storage.objects;

create policy "Organization members can view workspace files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'workspace-files'
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id::text =
      (storage.foldername(name))[1]
      and om.user_id = (select auth.uid())
  )
);

drop policy if exists "Editors can upload workspace files"
on storage.objects;

create policy "Editors can upload workspace files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'workspace-files'
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id::text =
      (storage.foldername(name))[1]
      and om.user_id = (select auth.uid())
      and om.role in (
        'admin',
        'worship_leader',
        'song_editor'
      )
  )
);

drop policy if exists "Editors can delete workspace files"
on storage.objects;

create policy "Editors can delete workspace files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'workspace-files'
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id::text =
      (storage.foldername(name))[1]
      and om.user_id = (select auth.uid())
      and om.role in (
        'admin',
        'worship_leader',
        'song_editor'
      )
  )
);

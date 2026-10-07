drop policy if exists "Users can view their profile avatars"
on storage.objects;

create policy "Organization members can view profile avatars"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] ~*
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  and (
    select private.can_view_profile(
      ((storage.foldername(name))[1])::uuid
    )
  )
);
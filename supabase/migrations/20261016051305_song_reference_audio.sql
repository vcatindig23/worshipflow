alter table public.songs
  add column if not exists reference_audio_path text;

alter table public.songs
  drop constraint if exists songs_reference_audio_path_length_check;

alter table public.songs
  add constraint songs_reference_audio_path_length_check
  check (
    reference_audio_path is null
    or char_length(reference_audio_path) <= 500
  );

comment on column public.songs.reference_audio_path is
  'Organization-scoped workspace-files storage path for the song reference track. Keep the object private and issue short-lived signed URLs only to authorized workspace members.';

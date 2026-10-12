-- Add service-level notes and announcements referenced by the setlist forms and pages.
alter table public.setlists
  add column if not exists service_notes text,
  add column if not exists announcements text;

alter table public.setlists
  drop constraint if exists setlists_service_notes_length_check,
  drop constraint if exists setlists_announcements_length_check;

alter table public.setlists
  add constraint setlists_service_notes_length_check
    check (service_notes is null or char_length(service_notes) <= 3000),
  add constraint setlists_announcements_length_check
    check (announcements is null or char_length(announcements) <= 3000);

notify pgrst, 'reload schema';

alter table public.setlists
  add column if not exists completed_at timestamptz,
  add column if not exists attendance_count integer,
  add column if not exists actual_duration_minutes integer,
  add column if not exists after_service_notes text;

alter table public.setlists
  drop constraint if exists setlists_attendance_count_check;

alter table public.setlists
  add constraint setlists_attendance_count_check
  check (attendance_count is null or attendance_count >= 0);

alter table public.setlists
  drop constraint if exists setlists_actual_duration_minutes_check;

alter table public.setlists
  add constraint setlists_actual_duration_minutes_check
  check (
    actual_duration_minutes is null
    or actual_duration_minutes between 1 and 1440
  );

alter table public.setlists
  drop constraint if exists setlists_after_service_notes_check;

alter table public.setlists
  add constraint setlists_after_service_notes_check
  check (
    after_service_notes is null
    or char_length(after_service_notes) <= 3000
  );

create index if not exists setlists_completed_at_idx
  on public.setlists(organization_id, completed_at desc)
  where completed_at is not null;

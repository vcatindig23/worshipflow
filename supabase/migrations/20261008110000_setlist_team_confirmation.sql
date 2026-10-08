alter table public.setlist_team_assignments
add column if not exists confirmation_status text
not null default 'pending';

alter table public.setlist_team_assignments
add column if not exists responded_at timestamptz;

alter table public.setlist_team_assignments
add column if not exists response_note text;

alter table public.setlist_team_assignments
drop constraint if exists setlist_team_assignments_confirmation_status_check;

alter table public.setlist_team_assignments
add constraint setlist_team_assignments_confirmation_status_check
check (
  confirmation_status in (
    'pending',
    'confirmed',
    'declined'
  )
);

alter table public.setlist_team_assignments
drop constraint if exists setlist_team_assignments_response_note_length_check;

alter table public.setlist_team_assignments
add constraint setlist_team_assignments_response_note_length_check
check (
  response_note is null
  or char_length(response_note) <= 500
);

create index if not exists setlist_team_assignments_confirmation_status_idx
on public.setlist_team_assignments (
  setlist_id,
  confirmation_status
);

create index if not exists setlist_team_assignments_user_status_idx
on public.setlist_team_assignments (
  user_id,
  confirmation_status
);

create or replace function public.respond_to_setlist_assignment(
  p_assignment_id uuid,
  p_status text,
  p_response_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_organization_id uuid;
  v_setlist_id uuid;
  v_setlist_name text;
  v_team_position text;
  v_clean_status text;
  v_clean_note text;
begin
  v_user_id := (select auth.uid());

  if v_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  v_clean_status := lower(trim(coalesce(p_status, '')));

  if v_clean_status not in (
    'confirmed',
    'declined'
  ) then
    raise exception 'INVALID_CONFIRMATION_STATUS';
  end if;

  v_clean_note := nullif(
    trim(coalesce(p_response_note, '')),
    ''
  );

  if v_clean_note is not null
     and char_length(v_clean_note) > 500 then
    raise exception 'RESPONSE_NOTE_TOO_LONG';
  end if;

  select
    s.organization_id,
    s.id,
    s.name,
    sta.team_position
  into
    v_organization_id,
    v_setlist_id,
    v_setlist_name,
    v_team_position
  from public.setlist_team_assignments sta
  join public.setlists s
    on s.id = sta.setlist_id
  where sta.id = p_assignment_id
    and sta.user_id = v_user_id;

  if v_organization_id is null then
    raise exception 'ASSIGNMENT_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.organization_members
    where organization_id = v_organization_id
      and user_id = v_user_id
  ) then
    raise exception 'MEMBERSHIP_REQUIRED';
  end if;

  update public.setlist_team_assignments
  set
    confirmation_status = v_clean_status,
    responded_at = now(),
    response_note = v_clean_note
  where id = p_assignment_id
    and user_id = v_user_id;

  if not found then
    raise exception 'ASSIGNMENT_NOT_FOUND';
  end if;
end;
$$;

revoke execute on function public.respond_to_setlist_assignment(
  uuid,
  text,
  text
)
from public, anon, authenticated;

grant execute on function public.respond_to_setlist_assignment(
  uuid,
  text,
  text
)
to authenticated;
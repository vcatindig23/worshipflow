create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

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
      'service_reminder'
    ]::text[])
  );

create table if not exists public.setlist_announcement_acknowledgments (
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  primary key (setlist_id, user_id)
);

create index if not exists setlist_announcement_ack_org_setlist_idx
  on public.setlist_announcement_acknowledgments(organization_id, setlist_id);

alter table public.setlist_announcement_acknowledgments enable row level security;
revoke all on table public.setlist_announcement_acknowledgments from anon, authenticated;
grant select on table public.setlist_announcement_acknowledgments to authenticated;

drop policy if exists "Members can view announcement acknowledgments"
  on public.setlist_announcement_acknowledgments;
create policy "Members can view announcement acknowledgments"
  on public.setlist_announcement_acknowledgments
  for select to authenticated
  using ((select private.is_org_member(organization_id)));

create table if not exists public.setlist_assignment_swap_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  assignment_id uuid not null,
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  substitute_user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  substitute_response_note text,
  status text not null default 'pending',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint setlist_assignment_swap_requests_not_self_check
    check (requester_user_id <> substitute_user_id),
  constraint setlist_assignment_swap_requests_status_check
    check (status in ('pending', 'substitute_accepted', 'approved', 'declined', 'cancelled')),
  constraint setlist_assignment_swap_requests_reason_check
    check (reason is null or char_length(reason) <= 500),
  constraint setlist_assignment_swap_requests_substitute_note_check
    check (substitute_response_note is null or char_length(substitute_response_note) <= 500),
  constraint setlist_assignment_swap_requests_resolution_note_check
    check (resolution_note is null or char_length(resolution_note) <= 500)
);

create unique index if not exists setlist_team_assignments_id_setlist_uidx
  on public.setlist_team_assignments(id, setlist_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'setlist_assignment_swap_requests_assignment_setlist_fkey'
      and conrelid = 'public.setlist_assignment_swap_requests'::regclass
  ) then
    alter table public.setlist_assignment_swap_requests
      add constraint setlist_assignment_swap_requests_assignment_setlist_fkey
      foreign key (assignment_id, setlist_id)
      references public.setlist_team_assignments(id, setlist_id)
      on delete cascade;
  end if;
end $$;

create index if not exists setlist_assignment_swap_requests_setlist_idx
  on public.setlist_assignment_swap_requests(setlist_id, status, created_at desc);
create index if not exists setlist_assignment_swap_requests_requester_idx
  on public.setlist_assignment_swap_requests(requester_user_id, created_at desc);
create index if not exists setlist_assignment_swap_requests_substitute_idx
  on public.setlist_assignment_swap_requests(substitute_user_id, status, created_at desc);
create unique index if not exists setlist_assignment_swap_requests_open_assignment_uidx
  on public.setlist_assignment_swap_requests(assignment_id)
  where status in ('pending', 'substitute_accepted');

alter table public.setlist_assignment_swap_requests enable row level security;
revoke all on table public.setlist_assignment_swap_requests from anon, authenticated;
grant select on table public.setlist_assignment_swap_requests to authenticated;

drop policy if exists "Participants and service leaders can view swap requests"
  on public.setlist_assignment_swap_requests;
create policy "Participants and service leaders can view swap requests"
  on public.setlist_assignment_swap_requests
  for select to authenticated
  using (
    requester_user_id = (select auth.uid())
    or substitute_user_id = (select auth.uid())
    or (select private.has_org_role(
      organization_id,
      array['admin', 'worship_leader']::text[]
    ))
  );

create table if not exists public.setlist_reminder_deliveries (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_type text not null,
  delivered_at timestamptz not null default now(),
  primary key (setlist_id, user_id, reminder_type),
  constraint setlist_reminder_deliveries_type_check
    check (reminder_type in ('service_24h', 'service_1h'))
);

create index if not exists setlist_reminder_deliveries_org_idx
  on public.setlist_reminder_deliveries(organization_id, delivered_at desc);

alter table public.setlist_reminder_deliveries enable row level security;
revoke all on table public.setlist_reminder_deliveries from anon, authenticated;

create or replace function public.acknowledge_service_announcement(
  p_setlist_id uuid
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_acknowledged_at timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  select s.organization_id
  into v_organization_id
  from public.setlists s
  join public.organization_members m
    on m.organization_id = s.organization_id
   and m.user_id = (select auth.uid())
  where s.id = p_setlist_id
    and nullif(trim(s.announcements), '') is not null;

  if v_organization_id is null then
    raise exception 'ANNOUNCEMENT_NOT_FOUND_OR_MEMBERSHIP_REQUIRED';
  end if;

  insert into public.setlist_announcement_acknowledgments (
    setlist_id, organization_id, user_id
  )
  values (
    p_setlist_id, v_organization_id, (select auth.uid())
  )
  on conflict (setlist_id, user_id) do nothing;

  select a.acknowledged_at
  into v_acknowledged_at
  from public.setlist_announcement_acknowledgments a
  where a.setlist_id = p_setlist_id
    and a.user_id = (select auth.uid());

  return v_acknowledged_at;
end;
$$;

revoke execute on function public.acknowledge_service_announcement(uuid)
from public, anon, authenticated;
grant execute on function public.acknowledge_service_announcement(uuid)
to authenticated;

create or replace function public.create_setlist_assignment_swap_request(
  p_assignment_id uuid,
  p_substitute_user_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_organization_id uuid;
  v_setlist_id uuid;
  v_setlist_name text;
  v_service_date date;
  v_status text;
  v_completed_at timestamptz;
  v_team_position text;
  v_substitute_name text;
  v_request_id uuid;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if v_reason is not null and char_length(v_reason) > 500 then
    raise exception 'SWAP_REASON_TOO_LONG';
  end if;

  if p_substitute_user_id is null or p_substitute_user_id = v_user_id then
    raise exception 'INVALID_SUBSTITUTE';
  end if;

  select
    s.organization_id,
    s.id,
    s.name,
    s.service_date,
    s.status,
    s.completed_at,
    a.team_position
  into
    v_organization_id,
    v_setlist_id,
    v_setlist_name,
    v_service_date,
    v_status,
    v_completed_at,
    v_team_position
  from public.setlist_team_assignments a
  join public.setlists s on s.id = a.setlist_id
  where a.id = p_assignment_id
    and a.user_id = v_user_id
  for update of a;

  if v_setlist_id is null then
    raise exception 'ASSIGNMENT_NOT_FOUND';
  end if;

  if v_status = 'archived' or v_completed_at is not null then
    raise exception 'SERVICE_CLOSED';
  end if;

  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = v_organization_id
      and m.user_id = v_user_id
  ) then
    raise exception 'MEMBERSHIP_REQUIRED';
  end if;

  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = v_organization_id
      and m.user_id = p_substitute_user_id
      and m.team_positions @> array[v_team_position]::text[]
  ) then
    raise exception 'SUBSTITUTE_POSITION_REQUIRED';
  end if;

  if exists (
    select 1 from public.setlist_team_assignments a
    where a.setlist_id = v_setlist_id
      and a.user_id = p_substitute_user_id
      and a.team_position = v_team_position
  ) then
    raise exception 'SUBSTITUTE_ALREADY_ASSIGNED';
  end if;

  insert into public.setlist_assignment_swap_requests (
    organization_id,
    setlist_id,
    assignment_id,
    requester_user_id,
    substitute_user_id,
    reason
  )
  values (
    v_organization_id,
    v_setlist_id,
    p_assignment_id,
    v_user_id,
    p_substitute_user_id,
    v_reason
  )
  returning id into v_request_id;

  select coalesce(nullif(trim(p.display_name), ''), 'A team member')
  into v_substitute_name
  from public.profiles p
  where p.id = p_substitute_user_id;

  insert into public.notifications (
    user_id, organization_id, setlist_id, type, title, body
  )
  values (
    p_substitute_user_id,
    v_organization_id,
    v_setlist_id,
    'assignment_swap_request',
    'Swap request for your review',
    'A teammate asked you to cover ' || replace(v_team_position, '_', ' ')
      || ' for ' || v_setlist_name || '.'
  );

  insert into public.notifications (
    user_id, organization_id, setlist_id, type, title, body
  )
  select
    m.user_id,
    v_organization_id,
    v_setlist_id,
    'assignment_swap_request',
    'Assignment swap requested',
    coalesce(nullif(trim(requester_profile.display_name), ''), 'A team member')
      || ' requested a swap for ' || replace(v_team_position, '_', ' ')
      || ' on ' || v_setlist_name || '.'
  from public.organization_members m
  left join public.profiles requester_profile
    on requester_profile.id = v_user_id
  where m.organization_id = v_organization_id
    and m.role in ('admin', 'worship_leader')
    and m.user_id not in (v_user_id, p_substitute_user_id);

  return v_request_id;
exception
  when unique_violation then
    raise exception 'SWAP_REQUEST_ALREADY_OPEN';
end;
$$;

revoke execute on function public.create_setlist_assignment_swap_request(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.create_setlist_assignment_swap_request(uuid, uuid, text)
to authenticated;

create or replace function public.respond_to_setlist_assignment_swap_request(
  p_request_id uuid,
  p_decision text,
  p_response_note text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_request public.setlist_assignment_swap_requests%rowtype;
  v_setlist_name text;
  v_requester_name text;
  v_decision text := lower(trim(coalesce(p_decision, '')));
  v_note text := nullif(trim(coalesce(p_response_note, '')), '');
  v_new_status text;
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if v_decision not in ('accept', 'decline') then
    raise exception 'INVALID_SWAP_DECISION';
  end if;

  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'SWAP_RESPONSE_TOO_LONG';
  end if;

  select r.*
  into v_request
  from public.setlist_assignment_swap_requests r
  where r.id = p_request_id
  for update;

  if not found then
    raise exception 'SWAP_REQUEST_NOT_FOUND';
  end if;

  if v_request.substitute_user_id <> v_user_id then
    raise exception 'SUBSTITUTE_REQUIRED';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'SWAP_REQUEST_NOT_PENDING';
  end if;

  v_new_status := case when v_decision = 'accept' then 'substitute_accepted' else 'declined' end;

  update public.setlist_assignment_swap_requests
  set
    status = v_new_status,
    substitute_response_note = v_note,
    updated_at = now()
  where id = p_request_id;

  select s.name into v_setlist_name
  from public.setlists s
  where s.id = v_request.setlist_id
    and s.organization_id = v_request.organization_id;

  select coalesce(nullif(trim(p.display_name), ''), 'A team member')
  into v_requester_name
  from public.profiles p
  where p.id = v_request.requester_user_id;

  insert into public.notifications (
    user_id, organization_id, setlist_id, type, title, body
  )
  values (
    v_request.requester_user_id,
    v_request.organization_id,
    v_request.setlist_id,
    'assignment_swap_status',
    case when v_new_status = 'substitute_accepted' then 'Swap request accepted' else 'Swap request declined' end,
    case when v_new_status = 'substitute_accepted'
      then 'Your proposed substitute accepted the request for ' || coalesce(v_setlist_name, 'the service') || '. A worship leader still needs to approve the change.'
      else 'Your proposed substitute declined the swap request for ' || coalesce(v_setlist_name, 'the service') || '.'
    end
  );

  insert into public.notifications (
    user_id, organization_id, setlist_id, type, title, body
  )
  select
    m.user_id,
    v_request.organization_id,
    v_request.setlist_id,
    'assignment_swap_status',
    'Assignment swap response',
    v_requester_name || '''s proposed substitute '
      || case when v_new_status = 'substitute_accepted' then 'accepted' else 'declined' end
      || ' the request for ' || coalesce(v_setlist_name, 'the service') || '.'
  from public.organization_members m
  where m.organization_id = v_request.organization_id
    and m.role in ('admin', 'worship_leader')
    and m.user_id not in (v_request.requester_user_id, v_request.substitute_user_id);

  return v_new_status;
end;
$$;

revoke execute on function public.respond_to_setlist_assignment_swap_request(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.respond_to_setlist_assignment_swap_request(uuid, text, text)
to authenticated;

create or replace function public.resolve_setlist_assignment_swap_request(
  p_request_id uuid,
  p_decision text,
  p_resolution_note text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_request public.setlist_assignment_swap_requests%rowtype;
  v_setlist_name text;
  v_requester_name text;
  v_substitute_name text;
  v_decision text := lower(trim(coalesce(p_decision, '')));
  v_note text := nullif(trim(coalesce(p_resolution_note, '')), '');
  v_position text;
  v_new_status text;
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if v_decision not in ('approve', 'decline') then
    raise exception 'INVALID_SWAP_DECISION';
  end if;

  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'SWAP_RESOLUTION_TOO_LONG';
  end if;

  select r.*
  into v_request
  from public.setlist_assignment_swap_requests r
  where r.id = p_request_id
  for update;

  if not found then
    raise exception 'SWAP_REQUEST_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.organization_members m
    where m.organization_id = v_request.organization_id
      and m.user_id = v_user_id
      and m.role in ('admin', 'worship_leader')
  ) then
    raise exception 'SERVICE_LEADER_REQUIRED';
  end if;

  if v_decision = 'approve' and v_request.status <> 'substitute_accepted' then
    raise exception 'SUBSTITUTE_ACCEPTANCE_REQUIRED';
  end if;

  if v_decision = 'decline' and v_request.status not in ('pending', 'substitute_accepted') then
    raise exception 'SWAP_REQUEST_NOT_OPEN';
  end if;

  select s.name, a.team_position
  into v_setlist_name, v_position
  from public.setlists s
  join public.setlist_team_assignments a
    on a.id = v_request.assignment_id
   and a.setlist_id = v_request.setlist_id
  where s.id = v_request.setlist_id
    and s.organization_id = v_request.organization_id
    and s.completed_at is null
    and s.status <> 'archived'
  for update of a;

  if v_position is null then
    raise exception 'ASSIGNMENT_NOT_FOUND_OR_SERVICE_CLOSED';
  end if;

  if v_decision = 'approve' then
    if not exists (
      select 1
      from public.organization_members m
      where m.organization_id = v_request.organization_id
        and m.user_id = v_request.substitute_user_id
        and m.team_positions @> array[v_position]::text[]
    ) then
      raise exception 'SUBSTITUTE_POSITION_REQUIRED';
    end if;

    begin
      update public.setlist_team_assignments
      set
        user_id = v_request.substitute_user_id,
        assigned_by = v_user_id,
        confirmation_status = 'pending',
        responded_at = null,
        response_note = null
      where id = v_request.assignment_id
        and setlist_id = v_request.setlist_id;
    exception
      when unique_violation then
        raise exception 'SUBSTITUTE_ALREADY_ASSIGNED';
    end;

    v_new_status := 'approved';
  else
    v_new_status := 'declined';
  end if;

  update public.setlist_assignment_swap_requests
  set
    status = v_new_status,
    reviewed_by = v_user_id,
    reviewed_at = now(),
    resolution_note = v_note,
    updated_at = now()
  where id = p_request_id;

  select coalesce(nullif(trim(p.display_name), ''), 'A team member')
  into v_requester_name
  from public.profiles p where p.id = v_request.requester_user_id;

  select coalesce(nullif(trim(p.display_name), ''), 'A team member')
  into v_substitute_name
  from public.profiles p where p.id = v_request.substitute_user_id;

  insert into public.notifications (
    user_id, organization_id, setlist_id, type, title, body
  )
  values (
    v_request.requester_user_id,
    v_request.organization_id,
    v_request.setlist_id,
    'assignment_swap_status',
    case when v_new_status = 'approved' then 'Assignment swap approved' else 'Assignment swap declined' end,
    case when v_new_status = 'approved'
      then v_substitute_name || ' has been assigned to replace you as '
        || replace(v_position, '_', ' ') || ' for ' || coalesce(v_setlist_name, 'the service')
        || '. Your replacement must confirm the assignment.'
      else 'Your assignment swap request for ' || coalesce(v_setlist_name, 'the service') || ' was declined.'
    end || case when v_note is not null then ' Leader note: ' || v_note else '' end
  );

  if v_new_status = 'approved' then
    insert into public.notifications (
      user_id, organization_id, setlist_id, type, title, body
    )
    values (
      v_request.substitute_user_id,
      v_request.organization_id,
      v_request.setlist_id,
      'service_assignment',
      'New service assignment',
      'You have been assigned as ' || replace(v_position, '_', ' ')
        || ' for ' || coalesce(v_setlist_name, 'the service') || '. Please confirm your availability.'
    );
  end if;

  return v_new_status;
end;
$$;

revoke execute on function public.resolve_setlist_assignment_swap_request(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.resolve_setlist_assignment_swap_request(uuid, text, text)
to authenticated;

create or replace function private.notify_service_announcement_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.announcements is not distinct from old.announcements
    or nullif(trim(coalesce(new.announcements, '')), '') is null then
    return null;
  end if;

  insert into public.notifications (
    user_id, organization_id, setlist_id, type, title, body
  )
  select distinct
    a.user_id,
    new.organization_id,
    new.id,
    'service_announcement',
    'Service announcement updated',
    'New announcement for ' || new.name || ': ' || left(new.announcements, 1200)
  from public.setlist_team_assignments a
  join public.organization_members m
    on m.organization_id = new.organization_id
   and m.user_id = a.user_id
  where a.setlist_id = new.id
    and a.confirmation_status <> 'declined'
    and a.user_id <> coalesce(new.updated_by, (select auth.uid()));

  return null;
end;
$$;

revoke all on function private.notify_service_announcement_change()
from public, anon, authenticated;

drop trigger if exists setlist_announcement_notification on public.setlists;
create trigger setlist_announcement_notification
after update of announcements on public.setlists
for each row
execute function private.notify_service_announcement_change();

create or replace function private.dispatch_service_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer := 0;
begin
  with scheduled_services as (
    select
      s.id as setlist_id,
      s.organization_id,
      s.name,
      s.service_date,
      s.service_time,
      ((s.service_date + s.service_time) at time zone coalesce(nullif(o.timezone, ''), 'Asia/Manila')) as starts_at
    from public.setlists s
    join public.organizations o on o.id = s.organization_id
    where s.service_date is not null
      and s.service_time is not null
      and s.completed_at is null
      and s.status <> 'archived'
  ),
  due_reminders as (
    select distinct
      s.setlist_id,
      s.organization_id,
      s.name,
      s.service_date,
      s.service_time,
      a.user_id,
      case
        when s.starts_at >= now() + interval '23 hours'
          and s.starts_at <= now() + interval '25 hours'
          then 'service_24h'
        when s.starts_at >= now() + interval '45 minutes'
          and s.starts_at <= now() + interval '75 minutes'
          then 'service_1h'
      end as reminder_type
    from scheduled_services s
    join public.setlist_team_assignments a on a.setlist_id = s.setlist_id
    join public.organization_members m
      on m.organization_id = s.organization_id
     and m.user_id = a.user_id
    where a.confirmation_status <> 'declined'
      and (
        (s.starts_at >= now() + interval '23 hours' and s.starts_at <= now() + interval '25 hours')
        or
        (s.starts_at >= now() + interval '45 minutes' and s.starts_at <= now() + interval '75 minutes')
      )
      and not exists (
        select 1
        from public.setlist_reminder_deliveries d
        where d.setlist_id = s.setlist_id
          and d.user_id = a.user_id
          and d.reminder_type = case
            when s.starts_at >= now() + interval '23 hours'
              and s.starts_at <= now() + interval '25 hours'
              then 'service_24h'
            else 'service_1h'
          end
      )
  ),
  delivered as (
    insert into public.setlist_reminder_deliveries (
      organization_id, setlist_id, user_id, reminder_type
    )
    select
      d.organization_id, d.setlist_id, d.user_id, d.reminder_type
    from due_reminders d
    where d.reminder_type is not null
    on conflict (setlist_id, user_id, reminder_type) do nothing
    returning organization_id, setlist_id, user_id, reminder_type
  )
  insert into public.notifications (
    user_id, organization_id, setlist_id, type, title, body
  )
  select
    d.user_id,
    d.organization_id,
    d.setlist_id,
    'service_reminder',
    case
      when d.reminder_type = 'service_24h' then 'Service tomorrow'
      else 'Service starting soon'
    end,
    'Reminder: ' || d.name || ' is scheduled for '
      || trim(to_char(d.service_date, 'FMDay, FMMonth DD'))
      || ' at ' || trim(to_char(d.service_time, 'FMHH12:MI AM')) || '.'
  from delivered delivery
  join due_reminders d
    on d.organization_id = delivery.organization_id
   and d.setlist_id = delivery.setlist_id
   and d.user_id = delivery.user_id
   and d.reminder_type = delivery.reminder_type;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke all on function private.dispatch_service_reminders()
from public, anon, authenticated;
grant execute on function private.dispatch_service_reminders() to postgres;

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid
    from cron.job
    where jobname = 'worshipflow-service-reminders'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'worshipflow-service-reminders',
    '*/15 * * * *',
    'select private.dispatch_service_reminders();'
  );
end $$;

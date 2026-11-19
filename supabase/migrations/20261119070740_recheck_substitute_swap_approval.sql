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
  if not private.has_active_account_session() then
    raise exception 'ACTIVE_VERIFIED_SESSION_REQUIRED' using errcode = '42501';
  end if;

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
    perform 1
    from public.organization_members m
    where m.organization_id = v_request.organization_id
      and m.user_id = v_request.substitute_user_id
      and m.team_positions @> array[v_position]::text[]
    for update;

    if not found then
      raise exception 'SUBSTITUTE_POSITION_REQUIRED';
    end if;

    if exists (
      select 1
      from public.member_availability av
      join public.setlists s
        on s.id = v_request.setlist_id
       and s.organization_id = av.organization_id
      where av.organization_id = v_request.organization_id
        and av.user_id = v_request.substitute_user_id
        and av.is_active
        and av.entry_type = 'blockout'
        and (
          (s.service_date is not null
            and s.service_date between av.starts_on and av.ends_on)
          or
          (s.rehearsal_date is not null
            and s.rehearsal_date between av.starts_on and av.ends_on)
        )
    ) then
      raise exception 'SUBSTITUTE_UNAVAILABLE';
    end if;

    if exists (
      with schedule_events as (
        select
          s.id as setlist_id,
          s.organization_id,
          'service'::text as event_kind,
          s.service_date + s.service_time as starts_at,
          case
            when s.end_time is not null and s.end_time > s.service_time
              then s.service_date + s.end_time
            else (s.service_date + s.service_time) + interval '60 minutes'
          end as ends_at,
          coalesce(s.service_prep_buffer_minutes, 0)::integer as prep_minutes,
          coalesce(s.service_travel_buffer_minutes, 0)::integer as travel_minutes
        from public.setlists s
        where s.organization_id = v_request.organization_id
          and s.completed_at is null
          and s.status <> 'archived'
          and s.service_date is not null
          and s.service_time is not null

        union all

        select
          s.id as setlist_id,
          s.organization_id,
          'rehearsal'::text as event_kind,
          s.rehearsal_date + s.rehearsal_time as starts_at,
          case
            when s.rehearsal_end_time is not null
              and s.rehearsal_end_time > s.rehearsal_time
              then s.rehearsal_date + s.rehearsal_end_time
            else (s.rehearsal_date + s.rehearsal_time) + interval '90 minutes'
          end as ends_at,
          coalesce(s.rehearsal_prep_buffer_minutes, 0)::integer as prep_minutes,
          coalesce(s.rehearsal_travel_buffer_minutes, 0)::integer as travel_minutes
        from public.setlists s
        where s.organization_id = v_request.organization_id
          and s.completed_at is null
          and s.status <> 'archived'
          and s.rehearsal_date is not null
          and s.rehearsal_time is not null
      )
      select 1
      from schedule_events target_event
      join schedule_events other_event
        on other_event.organization_id = target_event.organization_id
      where target_event.setlist_id = v_request.setlist_id
        and not (
          target_event.setlist_id = other_event.setlist_id
          and target_event.event_kind = other_event.event_kind
        )
        and exists (
          select 1
          from public.setlist_team_assignments a
          where a.setlist_id = other_event.setlist_id
            and a.user_id = v_request.substitute_user_id
            and a.confirmation_status in ('pending', 'confirmed')
        )
        and (
          target_event.starts_at
            - make_interval(mins => target_event.prep_minutes)
        ) < (
          other_event.ends_at
            + make_interval(mins => other_event.travel_minutes)
        )
        and (
          other_event.starts_at
            - make_interval(mins => other_event.prep_minutes)
        ) < (
          target_event.ends_at
            + make_interval(mins => target_event.travel_minutes)
        )
    ) then
      raise exception 'SUBSTITUTE_SCHEDULE_CONFLICT';
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

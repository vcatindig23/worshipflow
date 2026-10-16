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
    and nullif(trim(s.announcements), '') is not null
    and exists (
      select 1
      from public.setlist_team_assignments a
      where a.setlist_id = s.id
        and a.user_id = (select auth.uid())
        and a.confirmation_status <> 'declined'
    );

  if v_organization_id is null then
    raise exception 'ANNOUNCEMENT_NOT_FOUND_OR_ASSIGNMENT_REQUIRED';
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

create or replace function private.notify_service_announcement_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.announcements is not distinct from old.announcements then
    return null;
  end if;

  delete from public.setlist_announcement_acknowledgments
  where setlist_id = new.id
    and organization_id = new.organization_id;

  if nullif(trim(coalesce(new.announcements, '')), '') is null then
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

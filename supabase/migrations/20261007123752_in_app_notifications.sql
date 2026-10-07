create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  setlist_id uuid references public.setlists(id) on delete set null,
  type text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (
    type in ('service_assignment', 'service_assignment_removed')
  )
);

create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index notifications_user_unread_idx
  on public.notifications (user_id)
  where read_at is null;

alter table public.notifications enable row level security;

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "Users can view their own organization notifications"
on public.notifications
for select
to authenticated
using (
  user_id = (select auth.uid())
  and (select private.is_org_member(organization_id))
);

create policy "Users can mark their own organization notifications as read"
on public.notifications
for update
to authenticated
using (
  user_id = (select auth.uid())
  and (select private.is_org_member(organization_id))
)
with check (
  user_id = (select auth.uid())
  and (select private.is_org_member(organization_id))
  and read_at is not null
);

create or replace function private.notify_setlist_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_setlist_name text;
  v_user_id uuid;
  v_setlist_id uuid;
  v_team_position text;
begin
  if tg_op = 'INSERT' then
    v_user_id := new.user_id;
    v_setlist_id := new.setlist_id;
    v_team_position := new.team_position;

    if new.assigned_by = new.user_id then
      return null;
    end if;
  else
    v_user_id := old.user_id;
    v_setlist_id := old.setlist_id;
    v_team_position := old.team_position;
  end if;

  select s.organization_id, s.name
  into v_organization_id, v_setlist_name
  from public.setlists as s
  where s.id = v_setlist_id;

  if v_organization_id is null or v_setlist_name is null then
    return null;
  end if;

  if not exists (
    select 1
    from public.organization_members as om
    where om.organization_id = v_organization_id
      and om.user_id = v_user_id
  ) then
    return null;
  end if;

  insert into public.notifications (
    user_id,
    organization_id,
    setlist_id,
    type,
    title,
    body
  )
  values (
    v_user_id,
    v_organization_id,
    v_setlist_id,
    case
      when tg_op = 'INSERT' then 'service_assignment'
      else 'service_assignment_removed'
    end,
    case
      when tg_op = 'INSERT' then 'New service assignment'
      else 'Service assignment changed'
    end,
    case
      when tg_op = 'INSERT' then
        'You have been assigned as '
          || replace(v_team_position, '_', ' ')
          || ' for '
          || v_setlist_name
          || '.'
      else
        'Your assignment as '
          || replace(v_team_position, '_', ' ')
          || ' for '
          || v_setlist_name
          || ' was removed.'
    end
  );

  return null;
end;
$$;

revoke all on function private.notify_setlist_assignment()
from public, anon, authenticated;

create trigger setlist_assignment_notification
after insert or delete on public.setlist_team_assignments
for each row
execute function private.notify_setlist_assignment();
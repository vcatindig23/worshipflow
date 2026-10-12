alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'service_assignment',
      'service_assignment_removed',
      'team_chat_message'
    )
  );

create or replace function private.notify_team_chat_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_name text;
  v_excerpt text;
begin
  select coalesce(nullif(trim(p.display_name), ''), 'A team member')
  into v_sender_name
  from public.profiles as p
  where p.id = new.user_id;

  v_sender_name := coalesce(v_sender_name, 'A team member');
  v_excerpt := left(trim(new.body), 140);

  if char_length(trim(new.body)) > 140 then
    v_excerpt := v_excerpt || '…';
  end if;

  insert into public.notifications (
    user_id,
    organization_id,
    setlist_id,
    type,
    title,
    body
  )
  select
    om.user_id,
    new.organization_id,
    null,
    'team_chat_message',
    'New team chat message',
    v_sender_name || ': ' || v_excerpt
  from public.organization_members as om
  where om.organization_id = new.organization_id
    and om.user_id <> new.user_id;

  return new;
end;
$$;

revoke all on function private.notify_team_chat_message()
from public, anon, authenticated;

create trigger team_chat_message_notification
after insert on public.team_chat_messages
for each row
execute function private.notify_team_chat_message();

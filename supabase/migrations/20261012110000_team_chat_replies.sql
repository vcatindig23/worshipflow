-- Persist the original message context for replies in Team Chat.
-- Snapshots are server-populated so replies retain their context if a message
-- is later deleted.

alter table public.team_chat_messages
  add column if not exists reply_to_message_id uuid
    references public.team_chat_messages(id) on delete set null,
  add column if not exists reply_to_user_id uuid,
  add column if not exists reply_to_body text;

create index if not exists team_chat_messages_reply_to_idx
  on public.team_chat_messages (reply_to_message_id)
  where reply_to_message_id is not null;

create or replace function private.set_team_chat_reply_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent_user_id uuid;
  v_parent_body text;
begin
  if new.reply_to_message_id is null then
    if tg_op = 'INSERT' then
      new.reply_to_user_id := null;
      new.reply_to_body := null;
    end if;
    return new;
  end if;

  select message.user_id, message.body
  into v_parent_user_id, v_parent_body
  from public.team_chat_messages as message
  where message.id = new.reply_to_message_id
    and message.organization_id = new.organization_id;

  if not found then
    raise exception 'Reply target must belong to the same workspace.'
      using errcode = '23514';
  end if;

  new.reply_to_user_id := v_parent_user_id;
  new.reply_to_body := left(v_parent_body, 500);

  return new;
end;
$$;

revoke all on function private.set_team_chat_reply_snapshot()
from public, anon, authenticated;

drop trigger if exists team_chat_reply_snapshot
on public.team_chat_messages;

create trigger team_chat_reply_snapshot
before insert or update of
  reply_to_message_id,
  reply_to_user_id,
  reply_to_body,
  organization_id
on public.team_chat_messages
for each row
execute function private.set_team_chat_reply_snapshot();

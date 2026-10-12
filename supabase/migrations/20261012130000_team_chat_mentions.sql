-- Add workspace-scoped @mentions and notify the selected teammates directly.
alter table public.team_chat_messages
  add column if not exists mentioned_user_ids uuid[] not null default '{}'::uuid[];

create index if not exists team_chat_messages_mentioned_users_idx
  on public.team_chat_messages using gin (mentioned_user_ids);

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'service_assignment',
      'service_assignment_removed',
      'team_chat_message',
      'team_chat_mention'
    )
  );

create or replace function private.validate_team_chat_mentions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mentioned_user_id uuid;
  v_valid_user_ids uuid[] := '{}'::uuid[];
begin
  if new.mentioned_user_ids is null then
    new.mentioned_user_ids := '{}'::uuid[];
  end if;

  if pg_catalog.cardinality(new.mentioned_user_ids) > 10 then
    raise exception 'A message can mention at most 10 team members.'
      using errcode = '23514';
  end if;

  foreach v_mentioned_user_id in array new.mentioned_user_ids loop
    if v_mentioned_user_id is null or v_mentioned_user_id = new.user_id then
      continue;
    end if;

    if not exists (
      select 1
      from public.organization_members as member
      where member.organization_id = new.organization_id
        and member.user_id = v_mentioned_user_id
    ) then
      raise exception 'Mentioned users must belong to the same workspace.'
        using errcode = '23514';
    end if;

    if not (v_mentioned_user_id = any(v_valid_user_ids)) then
      v_valid_user_ids := pg_catalog.array_append(v_valid_user_ids, v_mentioned_user_id);
    end if;
  end loop;

  new.mentioned_user_ids := v_valid_user_ids;
  return new;
end;
$$;

revoke all on function private.validate_team_chat_mentions()
from public, anon, authenticated;

drop trigger if exists validate_team_chat_mentions
on public.team_chat_messages;

create trigger validate_team_chat_mentions
before insert or update of mentioned_user_ids
on public.team_chat_messages
for each row
execute function private.validate_team_chat_mentions();

create or replace function private.notify_team_chat_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_name text;
  v_excerpt text;
  v_mentioned_user_id uuid;
begin
  select coalesce(nullif(trim(profile.display_name), ''), 'A team member')
  into v_sender_name
  from public.profiles as profile
  where profile.id = new.user_id;

  v_sender_name := coalesce(v_sender_name, 'A team member');
  v_excerpt := left(trim(new.body), 140);

  if char_length(trim(new.body)) > 140 then
    v_excerpt := v_excerpt || '…';
  end if;

  -- Non-mentioned teammates receive the regular shared-chat notification.
  insert into public.notifications (
    user_id,
    organization_id,
    setlist_id,
    type,
    title,
    body
  )
  select
    member.user_id,
    new.organization_id,
    null,
    'team_chat_message',
    'New team chat message',
    v_sender_name || ': ' || v_excerpt
  from public.organization_members as member
  where member.organization_id = new.organization_id
    and member.user_id <> new.user_id
    and not (
      member.user_id = any(
        coalesce(new.mentioned_user_ids, '{}'::uuid[])
      )
    );

  -- Mentioned teammates receive one direct notification instead.
  insert into public.notifications (
    user_id,
    organization_id,
    setlist_id,
    type,
    title,
    body
  )
  select
    mentioned.user_id,
    new.organization_id,
    null,
    'team_chat_mention',
    'You were mentioned in Team Chat',
    v_sender_name || ' mentioned you: ' || v_excerpt
  from (
    select distinct mention.user_id
    from pg_catalog.unnest(
      coalesce(new.mentioned_user_ids, '{}'::uuid[])
    ) as mention(user_id)
  ) as mentioned
  where mentioned.user_id <> new.user_id
    and exists (
      select 1
      from public.organization_members as member
      where member.organization_id = new.organization_id
        and member.user_id = mentioned.user_id
    );

  return new;
end;
$$;

revoke all on function private.notify_team_chat_message()
from public, anon, authenticated;

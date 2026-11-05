-- Add private one-to-one conversations and persisted emoji reactions without
-- changing the existing organization-wide group conversation.
create table public.team_chat_direct_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_one_id uuid not null references auth.users(id) on delete cascade,
  user_two_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_message_preview text not null default '',
  constraint team_chat_direct_conversations_distinct_users
    check (user_one_id <> user_two_id),
  constraint team_chat_direct_conversations_sorted_users
    check (user_one_id < user_two_id),
  constraint team_chat_direct_conversations_pair_unique
    unique (organization_id, user_one_id, user_two_id)
);

create index team_chat_direct_conversations_user_one_idx
  on public.team_chat_direct_conversations (organization_id, user_one_id, updated_at desc);
create index team_chat_direct_conversations_user_two_idx
  on public.team_chat_direct_conversations (organization_id, user_two_id, updated_at desc);

alter table public.team_chat_direct_conversations enable row level security;
revoke all on public.team_chat_direct_conversations from anon, authenticated;
grant select, insert on public.team_chat_direct_conversations to authenticated;

create policy "Direct chat participants can view their conversations"
on public.team_chat_direct_conversations
for select to authenticated
using (
  (select auth.uid()) in (user_one_id, user_two_id)
  and (select private.is_org_member(organization_id))
);

create policy "Organization members can create their own direct conversations"
on public.team_chat_direct_conversations
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (select auth.uid()) in (user_one_id, user_two_id)
  and (select private.is_org_member(organization_id))
  and exists (
    select 1 from public.organization_members as member
    where member.organization_id = team_chat_direct_conversations.organization_id
      and member.user_id = team_chat_direct_conversations.user_one_id
  )
  and exists (
    select 1 from public.organization_members as member
    where member.organization_id = team_chat_direct_conversations.organization_id
      and member.user_id = team_chat_direct_conversations.user_two_id
  )
);

create table public.team_chat_direct_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.team_chat_direct_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  constraint team_chat_direct_messages_body_length
    check (char_length(trim(body)) between 1 and 2000),
  constraint team_chat_direct_messages_attachments_array
    check (jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 5)
);

create index team_chat_direct_messages_conversation_created_idx
  on public.team_chat_direct_messages (conversation_id, created_at desc);
create index team_chat_direct_messages_organization_created_idx
  on public.team_chat_direct_messages (organization_id, created_at desc);

alter table public.team_chat_direct_messages enable row level security;
revoke all on public.team_chat_direct_messages from anon, authenticated;
grant select, insert, update (body, edited_at), delete on public.team_chat_direct_messages to authenticated;

create policy "Direct participants can view direct messages"
on public.team_chat_direct_messages
for select to authenticated
using (
  (select private.is_org_member(organization_id))
  and exists (
    select 1 from public.team_chat_direct_conversations as conversation
    where conversation.id = team_chat_direct_messages.conversation_id
      and conversation.organization_id = team_chat_direct_messages.organization_id
      and (select auth.uid()) in (conversation.user_one_id, conversation.user_two_id)
  )
);

create policy "Direct participants can send their own messages"
on public.team_chat_direct_messages
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.is_org_member(organization_id))
  and exists (
    select 1 from public.team_chat_direct_conversations as conversation
    where conversation.id = team_chat_direct_messages.conversation_id
      and conversation.organization_id = team_chat_direct_messages.organization_id
      and (select auth.uid()) in (conversation.user_one_id, conversation.user_two_id)
  )
);

create policy "Users can edit their own direct messages"
on public.team_chat_direct_messages
for update to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.team_chat_direct_conversations as conversation
    where conversation.id = team_chat_direct_messages.conversation_id
      and (select auth.uid()) in (conversation.user_one_id, conversation.user_two_id)
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.team_chat_direct_conversations as conversation
    where conversation.id = team_chat_direct_messages.conversation_id
      and (select auth.uid()) in (conversation.user_one_id, conversation.user_two_id)
  )
);

create policy "Users can delete their own direct messages"
on public.team_chat_direct_messages
for delete to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.team_chat_direct_conversations as conversation
    where conversation.id = team_chat_direct_messages.conversation_id
      and (select auth.uid()) in (conversation.user_one_id, conversation.user_two_id)
  )
);

create table public.team_chat_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.team_chat_messages(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '😂', '🙏', '👏', '🔥', '🎉', '😮')),
  created_at timestamptz not null default now(),
  constraint team_chat_message_reactions_unique unique (message_id, user_id, emoji)
);

create index team_chat_message_reactions_message_idx
  on public.team_chat_message_reactions (message_id, created_at);

alter table public.team_chat_message_reactions enable row level security;
revoke all on public.team_chat_message_reactions from anon, authenticated;
grant select, insert, delete on public.team_chat_message_reactions to authenticated;

create policy "Organization members can view group message reactions"
on public.team_chat_message_reactions
for select to authenticated
using (
  (select private.is_org_member(organization_id))
  and exists (
    select 1 from public.team_chat_messages as message
    where message.id = team_chat_message_reactions.message_id
      and message.organization_id = team_chat_message_reactions.organization_id
  )
);

create policy "Members can add their own group message reactions"
on public.team_chat_message_reactions
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.is_org_member(organization_id))
  and exists (
    select 1 from public.team_chat_messages as message
    where message.id = team_chat_message_reactions.message_id
      and message.organization_id = team_chat_message_reactions.organization_id
  )
);

create policy "Members can remove their own group message reactions"
on public.team_chat_message_reactions
for delete to authenticated
using (
  user_id = (select auth.uid())
  and (select private.is_org_member(organization_id))
);

create table public.team_chat_direct_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.team_chat_direct_messages(id) on delete cascade,
  conversation_id uuid not null references public.team_chat_direct_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '😂', '🙏', '👏', '🔥', '🎉', '😮')),
  created_at timestamptz not null default now(),
  constraint team_chat_direct_message_reactions_unique
    unique (message_id, user_id, emoji)
);

create index team_chat_direct_message_reactions_message_idx
  on public.team_chat_direct_message_reactions (message_id, created_at);

alter table public.team_chat_direct_message_reactions enable row level security;
revoke all on public.team_chat_direct_message_reactions from anon, authenticated;
grant select, insert, delete on public.team_chat_direct_message_reactions to authenticated;

create policy "Direct participants can view direct message reactions"
on public.team_chat_direct_message_reactions
for select to authenticated
using (
  exists (
    select 1 from public.team_chat_direct_conversations as conversation
    where conversation.id = team_chat_direct_message_reactions.conversation_id
      and (select auth.uid()) in (conversation.user_one_id, conversation.user_two_id)
  )
);

create policy "Direct participants can add their own reactions"
on public.team_chat_direct_message_reactions
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.team_chat_direct_conversations as conversation
    where conversation.id = team_chat_direct_message_reactions.conversation_id
      and (select auth.uid()) in (conversation.user_one_id, conversation.user_two_id)
  )
  and exists (
    select 1 from public.team_chat_direct_messages as message
    where message.id = team_chat_direct_message_reactions.message_id
      and message.conversation_id = team_chat_direct_message_reactions.conversation_id
  )
);

create policy "Direct participants can remove their own reactions"
on public.team_chat_direct_message_reactions
for delete to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.team_chat_direct_conversations as conversation
    where conversation.id = team_chat_direct_message_reactions.conversation_id
      and (select auth.uid()) in (conversation.user_one_id, conversation.user_two_id)
  )
);

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'team-chat-direct-files',
  'team-chat-direct-files',
  false,
  26214400,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav',
    'video/mp4', 'video/webm'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Direct chat participants can view direct attachments" on storage.objects;
create policy "Direct chat participants can view direct attachments"
on storage.objects for select to authenticated
using (
  bucket_id = 'team-chat-direct-files'
  and exists (
    select 1 from public.team_chat_direct_conversations as conversation
    where conversation.id::text = (storage.foldername(name))[1]
      and (select auth.uid()) in (conversation.user_one_id, conversation.user_two_id)
  )
);

drop policy if exists "Direct chat participants can upload their own attachments" on storage.objects;
create policy "Direct chat participants can upload their own attachments"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'team-chat-direct-files'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1 from public.team_chat_direct_conversations as conversation
    where conversation.id::text = (storage.foldername(name))[1]
      and (select auth.uid()) in (conversation.user_one_id, conversation.user_two_id)
  )
);

drop policy if exists "Users can delete their own direct chat attachments" on storage.objects;
create policy "Users can delete their own direct chat attachments"
on storage.objects for delete to authenticated
using (
  bucket_id = 'team-chat-direct-files'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1 from public.team_chat_direct_conversations as conversation
    where conversation.id::text = (storage.foldername(name))[1]
      and (select auth.uid()) in (conversation.user_one_id, conversation.user_two_id)
  )
);

-- Give direct-message notifications their own type so opening one-to-one
-- conversations never clears the unread state of the church group chat.
alter table public.notifications
  add column direct_conversation_id uuid
  references public.team_chat_direct_conversations(id) on delete cascade;

create index notifications_direct_conversation_unread_idx
  on public.notifications (user_id, direct_conversation_id, read_at)
  where type = 'team_chat_direct_message' and read_at is null;

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'service_assignment',
      'service_assignment_removed',
      'team_chat_message',
      'team_chat_mention',
      'service_announcement',
      'assignment_swap_request',
      'assignment_swap_status',
      'service_reminder',
      'song_edited',
      'song_review_comment',
      'song_review_status',
      'team_chat_direct_message'
    )
  );

create or replace function private.update_direct_chat_conversation_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recipient uuid;
  v_sender_name text;
  v_excerpt text;
begin
  update public.team_chat_direct_conversations as conversation
  set
    updated_at = pg_catalog.now(),
    last_message_at = new.created_at,
    last_message_preview = left(trim(new.body), 120)
  where conversation.id = new.conversation_id
    and conversation.organization_id = new.organization_id
  returning
    case when conversation.user_one_id = new.user_id
      then conversation.user_two_id else conversation.user_one_id end
  into v_recipient;

  select coalesce(nullif(trim(profile.display_name), ''), 'A team member')
  into v_sender_name
  from public.profiles as profile
  where profile.id = new.user_id;
  v_sender_name := coalesce(v_sender_name, 'A team member');
  v_excerpt := left(trim(new.body), 120);

  if v_recipient is not null then
    insert into public.notifications (
      user_id, organization_id, setlist_id, direct_conversation_id, type, title, body
    )
    values (
      v_recipient,
      new.organization_id,
      null,
      new.conversation_id,
      'team_chat_direct_message',
      'New direct message',
      v_sender_name || ': ' || v_excerpt
    );
  end if;

  return new;
end;
$$;

revoke all on function private.update_direct_chat_conversation_activity()
from public, anon, authenticated;

drop trigger if exists team_chat_direct_message_activity
on public.team_chat_direct_messages;
create trigger team_chat_direct_message_activity
after insert on public.team_chat_direct_messages
for each row execute function private.update_direct_chat_conversation_activity();

-- Realtime is enabled for message and reaction inserts so both sides see updates.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public'
        and tablename = 'team_chat_direct_messages'
    ) then
      execute 'alter publication supabase_realtime add table public.team_chat_direct_messages';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public'
        and tablename = 'team_chat_message_reactions'
    ) then
      execute 'alter publication supabase_realtime add table public.team_chat_message_reactions';
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public'
        and tablename = 'team_chat_direct_message_reactions'
    ) then
      execute 'alter publication supabase_realtime add table public.team_chat_direct_message_reactions';
    end if;
  end if;
end;
$$;

drop policy if exists "Direct participants can receive private chat broadcasts" on realtime.messages;
create policy "Direct participants can receive private chat broadcasts"
on realtime.messages for select to authenticated
using (
  extension = 'broadcast'
  and case
    when realtime.topic() ~ '^direct-chat:[0-9a-fA-F-]{36}$' then exists (
      select 1 from public.team_chat_direct_conversations as conversation
      where conversation.id::text = split_part(realtime.topic(), ':', 2)
        and (select auth.uid()) in (conversation.user_one_id, conversation.user_two_id)
    )
    else false
  end
);

drop policy if exists "Direct participants can send private chat broadcasts" on realtime.messages;
create policy "Direct participants can send private chat broadcasts"
on realtime.messages for insert to authenticated
with check (
  extension = 'broadcast'
  and case
    when realtime.topic() ~ '^direct-chat:[0-9a-fA-F-]{36}$' then exists (
      select 1 from public.team_chat_direct_conversations as conversation
      where conversation.id::text = split_part(realtime.topic(), ':', 2)
        and (select auth.uid()) in (conversation.user_one_id, conversation.user_two_id)
    )
    else false
  end
);

-- Keep private-message files, reactions, and Realtime access aligned with
-- the direct-message table's active-organization-membership checks.
drop policy if exists "Direct participants can view direct message reactions"
on public.team_chat_direct_message_reactions;
create policy "Direct participants can view direct message reactions"
on public.team_chat_direct_message_reactions
for select to authenticated
using (
  exists (
    select 1
    from public.team_chat_direct_conversations as conversation
    where conversation.id = team_chat_direct_message_reactions.conversation_id
      and (select auth.uid()) in (conversation.user_one_id, conversation.user_two_id)
      and (select private.is_org_member(conversation.organization_id))
  )
);

drop policy if exists "Direct participants can add their own reactions"
on public.team_chat_direct_message_reactions;
create policy "Direct participants can add their own reactions"
on public.team_chat_direct_message_reactions
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.team_chat_direct_conversations as conversation
    where conversation.id = team_chat_direct_message_reactions.conversation_id
      and (select auth.uid()) in (conversation.user_one_id, conversation.user_two_id)
      and (select private.is_org_member(conversation.organization_id))
  )
  and exists (
    select 1
    from public.team_chat_direct_messages as message
    where message.id = team_chat_direct_message_reactions.message_id
      and message.conversation_id = team_chat_direct_message_reactions.conversation_id
  )
);

drop policy if exists "Direct participants can remove their own reactions"
on public.team_chat_direct_message_reactions;
create policy "Direct participants can remove their own reactions"
on public.team_chat_direct_message_reactions
for delete to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.team_chat_direct_conversations as conversation
    where conversation.id = team_chat_direct_message_reactions.conversation_id
      and (select auth.uid()) in (conversation.user_one_id, conversation.user_two_id)
      and (select private.is_org_member(conversation.organization_id))
  )
);

drop policy if exists "Direct chat participants can view direct attachments"
on storage.objects;
create policy "Direct chat participants can view direct attachments"
on storage.objects for select to authenticated
using (
  bucket_id = 'team-chat-direct-files'
  and exists (
    select 1
    from public.team_chat_direct_conversations as conversation
    where conversation.id::text = (storage.foldername(name))[1]
      and (select auth.uid()) in (conversation.user_one_id, conversation.user_two_id)
      and (select private.is_org_member(conversation.organization_id))
  )
);

drop policy if exists "Direct chat participants can upload their own attachments"
on storage.objects;
create policy "Direct chat participants can upload their own attachments"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'team-chat-direct-files'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1
    from public.team_chat_direct_conversations as conversation
    where conversation.id::text = (storage.foldername(name))[1]
      and (select auth.uid()) in (conversation.user_one_id, conversation.user_two_id)
      and (select private.is_org_member(conversation.organization_id))
  )
);

drop policy if exists "Users can delete their own direct chat attachments"
on storage.objects;
create policy "Users can delete their own direct chat attachments"
on storage.objects for delete to authenticated
using (
  bucket_id = 'team-chat-direct-files'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1
    from public.team_chat_direct_conversations as conversation
    where conversation.id::text = (storage.foldername(name))[1]
      and (select auth.uid()) in (conversation.user_one_id, conversation.user_two_id)
      and (select private.is_org_member(conversation.organization_id))
  )
);

drop policy if exists "Direct participants can receive private chat broadcasts"
on realtime.messages;
create policy "Direct participants can receive private chat broadcasts"
on realtime.messages for select to authenticated
using (
  extension = 'broadcast'
  and case
    when realtime.topic() ~ '^direct-chat:[0-9a-fA-F-]{36}$' then exists (
      select 1
      from public.team_chat_direct_conversations as conversation
      where conversation.id::text = split_part(realtime.topic(), ':', 2)
        and (select auth.uid()) in (conversation.user_one_id, conversation.user_two_id)
        and (select private.is_org_member(conversation.organization_id))
    )
    else false
  end
);

drop policy if exists "Direct participants can send private chat broadcasts"
on realtime.messages;
create policy "Direct participants can send private chat broadcasts"
on realtime.messages for insert to authenticated
with check (
  extension = 'broadcast'
  and case
    when realtime.topic() ~ '^direct-chat:[0-9a-fA-F-]{36}$' then exists (
      select 1
      from public.team_chat_direct_conversations as conversation
      where conversation.id::text = split_part(realtime.topic(), ':', 2)
        and (select auth.uid()) in (conversation.user_one_id, conversation.user_two_id)
        and (select private.is_org_member(conversation.organization_id))
    )
    else false
  end
);

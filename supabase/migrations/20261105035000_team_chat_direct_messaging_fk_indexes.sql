-- Cover foreign keys on chat tables so participant/message deletes and
-- notification cleanup do not require table scans.
create index if not exists notifications_direct_conversation_id_idx
  on public.notifications (direct_conversation_id);

create index if not exists team_chat_direct_conversations_created_by_idx
  on public.team_chat_direct_conversations (created_by);
create index if not exists team_chat_direct_conversations_user_one_fk_idx
  on public.team_chat_direct_conversations (user_one_id);
create index if not exists team_chat_direct_conversations_user_two_fk_idx
  on public.team_chat_direct_conversations (user_two_id);

create index if not exists team_chat_direct_messages_user_id_idx
  on public.team_chat_direct_messages (user_id);

create index if not exists team_chat_message_reactions_organization_id_idx
  on public.team_chat_message_reactions (organization_id);
create index if not exists team_chat_message_reactions_user_id_idx
  on public.team_chat_message_reactions (user_id);

create index if not exists team_chat_direct_message_reactions_conversation_id_idx
  on public.team_chat_direct_message_reactions (conversation_id);
create index if not exists team_chat_direct_message_reactions_user_id_idx
  on public.team_chat_direct_message_reactions (user_id);

-- Allow authenticated workspace members to edit and delete only their own Team Chat messages.
-- Update access is column-scoped so a member cannot change ownership, organization, or timestamps.

grant update (body) on table public.team_chat_messages to authenticated;
grant delete on table public.team_chat_messages to authenticated;

drop policy if exists "Members can edit their own team chat messages"
on public.team_chat_messages;

create policy "Members can edit their own team chat messages"
on public.team_chat_messages
for update
to authenticated
using (
  user_id = (select auth.uid())
  and (select private.is_org_member(organization_id))
)
with check (
  user_id = (select auth.uid())
  and (select private.is_org_member(organization_id))
);

drop policy if exists "Members can delete their own team chat messages"
on public.team_chat_messages;

create policy "Members can delete their own team chat messages"
on public.team_chat_messages
for delete
to authenticated
using (
  user_id = (select auth.uid())
  and (select private.is_org_member(organization_id))
);

-- Limit private Team Chat typing broadcasts to authenticated members of the
-- organization encoded in the channel topic: team-chat:<organization UUID>.
-- Do not enable RLS on realtime.messages here; Supabase manages that table.

drop policy if exists "Organization members can receive team chat typing broadcasts"
on realtime.messages;

create policy "Organization members can receive team chat typing broadcasts"
on realtime.messages
for select
to authenticated
using (
  extension = 'broadcast'
  and case
    when realtime.topic() ~ '^team-chat:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then (
      select private.is_org_member(
        split_part(realtime.topic(), ':', 2)::uuid
      )
    )
    else false
  end
);

drop policy if exists "Organization members can send team chat typing broadcasts"
on realtime.messages;

create policy "Organization members can send team chat typing broadcasts"
on realtime.messages
for insert
to authenticated
with check (
  extension = 'broadcast'
  and case
    when realtime.topic() ~ '^team-chat:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then (
      select private.is_org_member(
        split_part(realtime.topic(), ':', 2)::uuid
      )
    )
    else false
  end
);

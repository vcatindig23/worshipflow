-- Pin important chat messages for the current organization.
-- Pin permissions are intentionally provided by a SECURITY DEFINER RPC rather
-- than broad UPDATE policies, so a pinning role cannot edit other people's bodies.

alter table public.team_chat_messages
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by uuid references auth.users(id) on delete set null;

create index if not exists team_chat_messages_pinned_idx
  on public.team_chat_messages (organization_id, pinned_at desc)
  where pinned_at is not null;

create or replace function public.set_team_chat_message_pinned(
  p_message_id uuid,
  p_pinned boolean
)
returns public.team_chat_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_message public.team_chat_messages;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  select message.organization_id
  into v_organization_id
  from public.team_chat_messages as message
  where message.id = p_message_id;

  if v_organization_id is null
    or not private.has_org_role(
      v_organization_id,
      array['admin', 'worship_leader']::text[]
    )
  then
    raise exception 'Only organization administrators and worship leaders can pin messages.'
      using errcode = '42501';
  end if;

  update public.team_chat_messages as message
  set
    pinned_at = case when p_pinned then pg_catalog.now() else null end,
    pinned_by = case when p_pinned then auth.uid() else null end
  where message.id = p_message_id
    and message.organization_id = v_organization_id
  returning message.* into v_message;

  return v_message;
end;
$$;

revoke all on function public.set_team_chat_message_pinned(uuid, boolean)
from public, anon;

grant execute on function public.set_team_chat_message_pinned(uuid, boolean)
to authenticated;

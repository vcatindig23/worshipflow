create table public.team_chat_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint team_chat_messages_body_length check (
    char_length(trim(body)) between 1 and 2000
  )
);

create index team_chat_messages_organization_created_idx
  on public.team_chat_messages (organization_id, created_at desc);

alter table public.team_chat_messages enable row level security;

revoke all on public.team_chat_messages from anon, authenticated;
grant select, insert on public.team_chat_messages to authenticated;

create policy "Organization members can view team chat messages"
on public.team_chat_messages
for select
to authenticated
using ((select private.is_org_member(organization_id)));

create policy "Organization members can send their own team chat messages"
on public.team_chat_messages
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.is_org_member(organization_id))
);

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'team_chat_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.team_chat_messages';
  end if;
end;
$$;

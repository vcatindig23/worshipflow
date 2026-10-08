create table if not exists public.setlist_resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  storage_path text not null,
  display_name text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint setlist_resources_display_name_length_check
    check (char_length(display_name) between 1 and 120),
  constraint setlist_resources_storage_path_length_check
    check (char_length(storage_path) between 3 and 500)
);

create unique index if not exists setlist_resources_setlist_path_idx
  on public.setlist_resources(setlist_id, storage_path);

create index if not exists setlist_resources_organization_idx
  on public.setlist_resources(organization_id);

create index if not exists setlist_resources_setlist_idx
  on public.setlist_resources(setlist_id);

alter table public.setlist_resources enable row level security;

drop policy if exists "Organization members can view setlist resources"
on public.setlist_resources;

create policy "Organization members can view setlist resources"
on public.setlist_resources
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = setlist_resources.organization_id
      and om.user_id = (select auth.uid())
  )
);

drop policy if exists "Editors can add setlist resources"
on public.setlist_resources;

create policy "Editors can add setlist resources"
on public.setlist_resources
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id = setlist_resources.organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('admin', 'worship_leader', 'song_editor')
  )
  and exists (
    select 1
    from public.setlists s
    where s.id = setlist_resources.setlist_id
      and s.organization_id = setlist_resources.organization_id
  )
);

drop policy if exists "Editors can remove setlist resources"
on public.setlist_resources;

create policy "Editors can remove setlist resources"
on public.setlist_resources
for delete
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = setlist_resources.organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('admin', 'worship_leader', 'song_editor')
  )
);

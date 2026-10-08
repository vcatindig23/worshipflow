create table if not exists public.setlist_timeline_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  position integer not null default 0,
  item_type text not null default 'other',
  title text not null,
  duration_minutes integer,
  notes text,
  song_id uuid references public.songs(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint setlist_timeline_position_check check (position >= 0),
  constraint setlist_timeline_item_type_check check (
    item_type in ('opening','welcome','song','prayer','offering','announcements','message','communion','closing','transition','other')
  ),
  constraint setlist_timeline_title_length_check check (char_length(title) between 1 and 160),
  constraint setlist_timeline_duration_check check (duration_minutes is null or duration_minutes between 1 and 240),
  constraint setlist_timeline_notes_length_check check (notes is null or char_length(notes) <= 1000)
);

create index if not exists setlist_timeline_items_setlist_position_idx
  on public.setlist_timeline_items(setlist_id, position);

create index if not exists setlist_timeline_items_organization_idx
  on public.setlist_timeline_items(organization_id);

alter table public.setlist_timeline_items enable row level security;

drop policy if exists "Organization members can view service timeline"
on public.setlist_timeline_items;

create policy "Organization members can view service timeline"
on public.setlist_timeline_items
for select to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = setlist_timeline_items.organization_id
      and om.user_id = (select auth.uid())
  )
);

drop policy if exists "Editors can create service timeline items"
on public.setlist_timeline_items;

create policy "Editors can create service timeline items"
on public.setlist_timeline_items
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.organization_members om
    where om.organization_id = setlist_timeline_items.organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('admin','worship_leader','song_editor')
  )
  and exists (
    select 1 from public.setlists s
    where s.id = setlist_timeline_items.setlist_id
      and s.organization_id = setlist_timeline_items.organization_id
  )
);

drop policy if exists "Editors can update service timeline items"
on public.setlist_timeline_items;

create policy "Editors can update service timeline items"
on public.setlist_timeline_items
for update to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = setlist_timeline_items.organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('admin','worship_leader','song_editor')
  )
)
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = setlist_timeline_items.organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('admin','worship_leader','song_editor')
  )
);

drop policy if exists "Editors can delete service timeline items"
on public.setlist_timeline_items;

create policy "Editors can delete service timeline items"
on public.setlist_timeline_items
for delete to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = setlist_timeline_items.organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('admin','worship_leader','song_editor')
  )
);

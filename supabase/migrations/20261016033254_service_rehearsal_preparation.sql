alter table public.setlists
  add column if not exists rehearsal_date date,
  add column if not exists rehearsal_time time without time zone,
  add column if not exists rehearsal_end_time time without time zone,
  add column if not exists rehearsal_location text,
  add column if not exists rehearsal_notes text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'setlists_rehearsal_location_length_check'
      and conrelid = 'public.setlists'::regclass
  ) then
    alter table public.setlists
      add constraint setlists_rehearsal_location_length_check
      check (rehearsal_location is null or char_length(rehearsal_location) <= 200);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'setlists_rehearsal_notes_length_check'
      and conrelid = 'public.setlists'::regclass
  ) then
    alter table public.setlists
      add constraint setlists_rehearsal_notes_length_check
      check (rehearsal_notes is null or char_length(rehearsal_notes) <= 3000);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'setlists_rehearsal_end_after_start_check'
      and conrelid = 'public.setlists'::regclass
  ) then
    alter table public.setlists
      add constraint setlists_rehearsal_end_after_start_check
      check (
        rehearsal_time is null
        or rehearsal_end_time is null
        or rehearsal_end_time > rehearsal_time
      );
  end if;
end $$;

create table if not exists public.setlist_preparation_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  setlist_id uuid not null,
  title text not null,
  details text,
  is_completed boolean not null default false,
  position integer not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint setlist_preparation_tasks_title_check
    check (char_length(trim(title)) between 1 and 160),
  constraint setlist_preparation_tasks_details_check
    check (details is null or char_length(details) <= 1000),
  constraint setlist_preparation_tasks_setlist_org_fkey
    foreign key (setlist_id, organization_id)
    references public.setlists(id, organization_id)
    on delete cascade
);

create index if not exists setlist_preparation_tasks_setlist_position_idx
  on public.setlist_preparation_tasks(setlist_id, position, created_at);

create index if not exists setlist_preparation_tasks_organization_idx
  on public.setlist_preparation_tasks(organization_id);

alter table public.setlist_preparation_tasks enable row level security;

revoke all on table public.setlist_preparation_tasks from anon, authenticated;
grant select, insert, update, delete on table public.setlist_preparation_tasks to authenticated;

drop policy if exists "Members can view service preparation tasks"
  on public.setlist_preparation_tasks;
create policy "Members can view service preparation tasks"
  on public.setlist_preparation_tasks
  for select to authenticated
  using ((select private.is_org_member(organization_id)));

drop policy if exists "Service editors can create preparation tasks"
  on public.setlist_preparation_tasks;
create policy "Service editors can create preparation tasks"
  on public.setlist_preparation_tasks
  for insert to authenticated
  with check (
    (select private.has_org_role(
      organization_id,
      array['admin', 'worship_leader', 'song_editor']::text[]
    ))
    and created_by = (select auth.uid())
    and exists (
      select 1
      from public.setlists s
      where s.id = setlist_preparation_tasks.setlist_id
        and s.organization_id = setlist_preparation_tasks.organization_id
    )
  );

drop policy if exists "Service editors can update preparation tasks"
  on public.setlist_preparation_tasks;
create policy "Service editors can update preparation tasks"
  on public.setlist_preparation_tasks
  for update to authenticated
  using (
    (select private.has_org_role(
      organization_id,
      array['admin', 'worship_leader', 'song_editor']::text[]
    ))
  )
  with check (
    (select private.has_org_role(
      organization_id,
      array['admin', 'worship_leader', 'song_editor']::text[]
    ))
    and exists (
      select 1
      from public.setlists s
      where s.id = setlist_preparation_tasks.setlist_id
        and s.organization_id = setlist_preparation_tasks.organization_id
    )
  );

drop policy if exists "Service editors can delete preparation tasks"
  on public.setlist_preparation_tasks;
create policy "Service editors can delete preparation tasks"
  on public.setlist_preparation_tasks
  for delete to authenticated
  using (
    (select private.has_org_role(
      organization_id,
      array['admin', 'worship_leader', 'song_editor']::text[]
    ))
  );

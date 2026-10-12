create table if not exists public.service_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  template_data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_templates_name_check check (
    char_length(trim(name)) between 1 and 120
  ),
  constraint service_templates_description_check check (
    description is null or char_length(description) <= 2000
  ),
  constraint service_templates_data_object_check check (
    jsonb_typeof(template_data) = 'object'
  )
);

create index if not exists service_templates_organization_updated_idx
  on public.service_templates(organization_id, updated_at desc);

drop trigger if exists set_service_templates_updated_at
  on public.service_templates;

create trigger set_service_templates_updated_at
before update on public.service_templates
for each row
execute function public.set_updated_at();

alter table public.service_templates enable row level security;

revoke all on public.service_templates from anon;
grant select, insert, update, delete on public.service_templates to authenticated;

drop policy if exists "Organization members can view service templates"
  on public.service_templates;

create policy "Organization members can view service templates"
on public.service_templates
for select to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = service_templates.organization_id
      and om.user_id = (select auth.uid())
  )
);

drop policy if exists "Editors can create service templates"
  on public.service_templates;

create policy "Editors can create service templates"
on public.service_templates
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id = service_templates.organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('admin', 'worship_leader', 'song_editor')
  )
);

drop policy if exists "Editors can update service templates"
  on public.service_templates;

create policy "Editors can update service templates"
on public.service_templates
for update to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = service_templates.organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('admin', 'worship_leader', 'song_editor')
  )
)
with check (
  updated_by = (select auth.uid())
  and exists (
    select 1
    from public.organization_members om
    where om.organization_id = service_templates.organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('admin', 'worship_leader', 'song_editor')
  )
);

drop policy if exists "Editors can delete service templates"
  on public.service_templates;

create policy "Editors can delete service templates"
on public.service_templates
for delete to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = service_templates.organization_id
      and om.user_id = (select auth.uid())
      and om.role in ('admin', 'worship_leader', 'song_editor')
  )
);

-- Create the complete service in one database transaction, so failed template
-- applications cannot leave an empty or partially populated service behind.
create or replace function public.create_service_from_template(
  p_template_id uuid,
  p_name text,
  p_service_date date,
  p_service_time time default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_template public.service_templates%rowtype;
  v_template_data jsonb;
  v_service_id uuid;
  v_song jsonb;
  v_item jsonb;
  v_song_id uuid;
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if char_length(trim(coalesce(p_name, ''))) not between 1 and 200 then
    raise exception 'INVALID_SERVICE_NAME';
  end if;

  select *
  into v_template
  from public.service_templates st
  where st.id = p_template_id
  for share;

  if not found then
    raise exception 'TEMPLATE_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.organization_members om
    where om.organization_id = v_template.organization_id
      and om.user_id = v_user_id
      and om.role in ('admin', 'worship_leader', 'song_editor')
  ) then
    raise exception 'EDITOR_REQUIRED';
  end if;

  v_template_data := v_template.template_data;

  if jsonb_typeof(coalesce(v_template_data -> 'songs', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(v_template_data -> 'timeline', '[]'::jsonb)) <> 'array' then
    raise exception 'INVALID_TEMPLATE_DATA';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(v_template_data -> 'songs', '[]'::jsonb)) song_item
    where not exists (
      select 1
      from public.songs s
      where s.id = (song_item.value ->> 'song_id')::uuid
        and s.organization_id = v_template.organization_id
    )
  ) then
    raise exception 'TEMPLATE_SONG_UNAVAILABLE';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(v_template_data -> 'timeline', '[]'::jsonb)) timeline_item
    where nullif(timeline_item.value ->> 'song_id', '') is not null
      and not exists (
        select 1
        from jsonb_array_elements(coalesce(v_template_data -> 'songs', '[]'::jsonb)) song_item
        where (song_item.value ->> 'song_id')::uuid =
          (timeline_item.value ->> 'song_id')::uuid
      )
  ) then
    raise exception 'INVALID_TEMPLATE_TIMELINE_LINK';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_attribute a
    where a.attrelid = 'public.setlists'::regclass
      and a.attname = 'service_time'
      and not a.attisdropped
  ) then
    execute
      'insert into public.setlists
        (organization_id, name, description, service_notes, announcements, service_date, service_time, status, created_by, updated_by)
       values ($1, $2, $3, $4, $5, $6, $7, ''draft'', $8, $8)
       returning id'
      into v_service_id
      using
        v_template.organization_id,
        trim(p_name),
        nullif(v_template_data ->> 'description', ''),
        nullif(v_template_data ->> 'service_notes', ''),
        nullif(v_template_data ->> 'announcements', ''),
        p_service_date,
        p_service_time,
        v_user_id;
  else
    insert into public.setlists (
      organization_id,
      name,
      description,
      service_notes,
      announcements,
      service_date,
      status,
      created_by,
      updated_by
    )
    values (
      v_template.organization_id,
      trim(p_name),
      nullif(v_template_data ->> 'description', ''),
      nullif(v_template_data ->> 'service_notes', ''),
      nullif(v_template_data ->> 'announcements', ''),
      p_service_date,
      'draft',
      v_user_id,
      v_user_id
    )
    returning id into v_service_id;
  end if;

  for v_song in
    select value
    from jsonb_array_elements(coalesce(v_template_data -> 'songs', '[]'::jsonb))
  loop
    v_song_id := (v_song ->> 'song_id')::uuid;

    insert into public.setlist_songs (
      setlist_id,
      song_id,
      position,
      section,
      key_override,
      capo_override,
      tempo_override,
      notes
    )
    values (
      v_service_id,
      v_song_id,
      (v_song ->> 'position')::integer,
      coalesce(nullif(trim(v_song ->> 'section'), ''), 'Worship'),
      nullif(trim(coalesce(v_song ->> 'key_override', '')), ''),
      nullif(v_song ->> 'capo_override', '')::integer,
      nullif(v_song ->> 'tempo_override', '')::integer,
      nullif(v_song ->> 'notes', '')
    );
  end loop;

  for v_item in
    select value
    from jsonb_array_elements(coalesce(v_template_data -> 'timeline', '[]'::jsonb))
  loop
    v_song_id := nullif(v_item ->> 'song_id', '')::uuid;

    if v_song_id is not null and not exists (
      select 1
      from public.setlist_songs ss
      where ss.setlist_id = v_service_id
        and ss.song_id = v_song_id
    ) then
      raise exception 'INVALID_TEMPLATE_TIMELINE_LINK';
    end if;

    insert into public.setlist_timeline_items (
      organization_id,
      setlist_id,
      position,
      item_type,
      title,
      duration_minutes,
      notes,
      song_id,
      created_by
    )
    values (
      v_template.organization_id,
      v_service_id,
      (v_item ->> 'position')::integer,
      v_item ->> 'item_type',
      trim(v_item ->> 'title'),
      nullif(v_item ->> 'duration_minutes', '')::integer,
      nullif(v_item ->> 'notes', ''),
      v_song_id,
      v_user_id
    );
  end loop;

  return v_service_id;
end;
$$;

revoke execute on function public.create_service_from_template(uuid, text, date, time)
from public, anon, authenticated;

grant execute on function public.create_service_from_template(uuid, text, date, time)
to authenticated;

notify pgrst, 'reload schema';

create or replace function public.create_song_with_initial_version(
  p_organization_id uuid,
  p_title text,
  p_artist text,
  p_tempo integer,
  p_time_signature text,
  p_capo integer,
  p_chordpro_source text,
  p_notes text,
  p_current_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_song_id uuid;
begin
  v_user_id := (select auth.uid());

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.organization_members
    where organization_id = p_organization_id
      and user_id = v_user_id
      and role in ('admin', 'worship_leader', 'song_editor')
  ) then
    raise exception 'Not authorized';
  end if;

  if p_organization_id is null then
    raise exception 'Organization is required';
  end if;

  if p_title is null or char_length(trim(p_title)) < 1 or char_length(trim(p_title)) > 200 then
    raise exception 'Song title must be between 1 and 200 characters';
  end if;

  if p_artist is not null and char_length(p_artist) > 200 then
    raise exception 'Artist is too long';
  end if;

  if p_tempo is not null and (p_tempo < 20 or p_tempo > 300) then
    raise exception 'Tempo must be between 20 and 300';
  end if;

  if p_capo < 0 or p_capo > 12 then
    raise exception 'Capo must be between 0 and 12';
  end if;

  if p_chordpro_source is null or char_length(p_chordpro_source) > 500000 then
    raise exception 'Invalid ChordPro source';
  end if;

  insert into public.songs (
    organization_id,
    title,
    artist,
    original_key,
    current_key,
    tempo,
    time_signature,
    capo,
    chordpro_source,
    notes,
    status,
    created_by,
    updated_by
  )
  values (
    p_organization_id,
    trim(p_title),
    nullif(trim(p_artist), ''),
    p_current_key,
    p_current_key,
    p_tempo,
    coalesce(nullif(trim(p_time_signature), ''), '4/4'),
    p_capo,
    p_chordpro_source,
    nullif(trim(p_notes), ''),
    'active',
    v_user_id,
    v_user_id
  )
  returning id into v_song_id;

  insert into public.song_versions (
    song_id,
    organization_id,
    version_number,
    title,
    artist,
    original_key,
    current_key,
    tempo,
    time_signature,
    capo,
    chordpro_source,
    notes,
    created_by
  )
  select
    id,
    organization_id,
    1,
    title,
    artist,
    original_key,
    current_key,
    tempo,
    time_signature,
    capo,
    chordpro_source,
    notes,
    v_user_id
  from public.songs
  where id = v_song_id;

  return v_song_id;
end;
$$;

create or replace function public.update_song_with_version(
  p_song_id uuid,
  p_title text,
  p_artist text,
  p_tempo integer,
  p_time_signature text,
  p_capo integer,
  p_chordpro_source text,
  p_notes text,
  p_current_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_organization_id uuid;
  v_original_key text;
  v_next_version integer;
begin
  v_user_id := (select auth.uid());

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select
    organization_id,
    original_key
  into
    v_organization_id,
    v_original_key
  from public.songs
  where id = p_song_id
    and status = 'active'
  for update;

  if v_organization_id is null then
    raise exception 'Song not found';
  end if;

  if not exists (
    select 1
    from public.organization_members
    where organization_id = v_organization_id
      and user_id = v_user_id
      and role in ('admin', 'worship_leader', 'song_editor')
  ) then
    raise exception 'Not authorized';
  end if;

  if p_title is null or char_length(trim(p_title)) < 1 or char_length(trim(p_title)) > 200 then
    raise exception 'Song title must be between 1 and 200 characters';
  end if;

  if p_artist is not null and char_length(p_artist) > 200 then
    raise exception 'Artist is too long';
  end if;

  if p_tempo is not null and (p_tempo < 20 or p_tempo > 300) then
    raise exception 'Tempo must be between 20 and 300';
  end if;

  if p_capo < 0 or p_capo > 12 then
    raise exception 'Capo must be between 0 and 12';
  end if;

  if p_chordpro_source is null or char_length(p_chordpro_source) > 500000 then
    raise exception 'Invalid ChordPro source';
  end if;

  select coalesce(max(version_number), 0) + 1
  into v_next_version
  from public.song_versions
  where song_id = p_song_id;

  insert into public.song_versions (
    song_id,
    organization_id,
    version_number,
    title,
    artist,
    original_key,
    current_key,
    tempo,
    time_signature,
    capo,
    chordpro_source,
    notes,
    created_by
  )
  select
    id,
    organization_id,
    v_next_version,
    title,
    artist,
    original_key,
    current_key,
    tempo,
    time_signature,
    capo,
    chordpro_source,
    notes,
    v_user_id
  from public.songs
  where id = p_song_id;

  update public.songs
  set
    title = trim(p_title),
    artist = nullif(trim(p_artist), ''),
    current_key = p_current_key,
    tempo = p_tempo,
    time_signature = coalesce(nullif(trim(p_time_signature), ''), '4/4'),
    capo = p_capo,
    chordpro_source = p_chordpro_source,
    notes = nullif(trim(p_notes), ''),
    updated_by = v_user_id,
    updated_at = now()
  where id = p_song_id;

  return p_song_id;
end;
$$;

revoke execute on function public.create_song_with_initial_version(
  uuid,
  text,
  text,
  integer,
  text,
  integer,
  text,
  text,
  text
) from public;

revoke execute on function public.create_song_with_initial_version(
  uuid,
  text,
  text,
  integer,
  text,
  integer,
  text,
  text,
  text
) from anon;

grant execute on function public.create_song_with_initial_version(
  uuid,
  text,
  text,
  integer,
  text,
  integer,
  text,
  text,
  text
) to authenticated;

revoke execute on function public.update_song_with_version(
  uuid,
  text,
  text,
  integer,
  text,
  integer,
  text,
  text,
  text
) from public;

revoke execute on function public.update_song_with_version(
  uuid,
  text,
  text,
  integer,
  text,
  integer,
  text,
  text,
  text
) from anon;

grant execute on function public.update_song_with_version(
  uuid,
  text,
  text,
  integer,
  text,
  integer,
  text,
  text,
  text
) to authenticated;
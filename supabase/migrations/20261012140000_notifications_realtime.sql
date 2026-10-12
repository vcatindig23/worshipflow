-- Enable live refreshes for the signed-in user's notification dropdown.
-- Row visibility is still governed by the existing notifications RLS policies.

do $$
begin
  if exists (
    select 1
    from pg_catalog.pg_publication
    where pubname = 'supabase_realtime'
  )
  and not exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  )
  then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
end;
$$;

-- Enforce least-privilege defaults for the public API schema.
-- WorshipFlow data is organization-scoped; every public table policy requires
-- an authenticated user. No application table has an anon/public RLS policy.
-- Existing authenticated grants are retained. This does not delete any data.

revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon;

-- New tables and sequences created by the migration role should not be
-- accessible to unauthenticated clients by default.
alter default privileges for role postgres in schema public
  revoke all on tables from anon;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon;

-- New RPCs must opt in to authenticated execution through an explicit GRANT.
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

notify pgrst, 'reload schema';

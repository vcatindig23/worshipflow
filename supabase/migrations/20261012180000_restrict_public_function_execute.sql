-- Remove inherited PUBLIC execution on existing public-schema functions and
-- stop future functions created by postgres from inheriting PUBLIC execution.
-- Existing explicit grants to authenticated/service_role are retained.

revoke execute on all functions in schema public from public, anon;

alter default privileges for role postgres
  revoke execute on functions from public;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

notify pgrst, 'reload schema';

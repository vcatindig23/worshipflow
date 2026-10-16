-- Keep the private schema useful to RLS policies without leaving
-- trigger-only/internal functions directly executable by client roles.

revoke usage on schema private from public, anon;
grant usage on schema private to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;

-- These four helpers are referenced by public-table RLS policies and must
-- remain executable by authenticated requests.
grant execute on function private.can_view_profile(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, text[]) to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.song_organization_id(uuid) to authenticated;

-- Prevent new private functions created by postgres from inheriting broad
-- client execution privileges.
alter default privileges for role postgres in schema private
  revoke execute on functions from public, anon, authenticated;

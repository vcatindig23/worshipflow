# WorshipFlow authorization

## Sources of authority

Authentication uses Supabase `getClaims()` on the server. Authorization uses the current `organization_members` record queried by the verified user ID. The app's access role and tenant never come from form fields, URL parameters, client state, `user_metadata`, or worship-team positions. Removed memberships lose access without waiting for a JWT role claim to refresh.

The proxy, RLS policies, and existing callable SECURITY DEFINER functions also check the current Auth session, confirmed email, session age, and enabled MFA. See [authentication](authentication.md) for the session lifecycle and account controls.

`src/lib/permissions.ts` defines the role/permission contract. `src/lib/authorization.ts` provides a server context that rejects missing identity, ambiguous/failed membership queries, unknown roles, and insufficient permission. Resource reads and writes still need tenant/owner predicates; RLS and checked RPCs enforce the same boundary when an attacker skips the UI or server action.

## Role rules

| Capability | Admin | Worship leader | Song editor | Team member | Viewer |
| --- | --- | --- | --- | --- | --- |
| Read own church's shared planning | Yes | Yes | Yes | Yes | Yes |
| Edit song catalog, files, service plans, templates | Yes | Yes | Yes | No | No |
| Publish/archive, complete/reopen, duplicate/delete services | Yes | Yes | No | No | No |
| Pin team messages | Yes | Yes | No | No | No |
| Moderate review status | Yes | Yes | Yes | No | No |
| Manage invitations, access roles, other members' positions | Yes | No | No | No | No |
| Edit organization settings | Yes | No | No | No | No |
| Read permission history | Yes | No | No | No | No |
| Own profile, preferences, notification read state | Self only | Self only | Self only | Self only | Self only |
| Chat/review participation | Yes | Yes | Yes | Yes | Yes |

Existing chat and review participation is retained for all members, including viewers. Viewer restrictions apply to shared catalog and service management. Assignment responses/swap requests require the actual assigned/requesting/substitute user, not just a role. Ownership checks remain necessary even when a permission is allowed. Selecting “worship leader” as a ministry position does not grant the `worship_leader` access role.

Only an administrator may change access roles through checked membership RPCs. Direct client membership INSERT/UPDATE/DELETE is revoked. Administrators cannot demote the last administrator or remove themselves; existing concurrency locks and database membership constraints remain in place. Account creation may create a new organization and its initial administrator, but cannot attach the caller to an existing organization without a valid invitation. Invitations cannot grant the admin role.

## Database boundaries

The two authorization migrations:

- Remove client `TRUNCATE`, `TRIGGER`, and `REFERENCES` privileges on application tables. RLS does not apply to `TRUNCATE`, so these privileges must be revoked separately.
- Remove unnecessary DML permissions and restrict direct UPDATE to the columns used by the app. Identity, tenant, parent, creation, version, and membership metadata cannot be rewritten through generic table access. Song/version/tag writes that use checked RPCs keep using them.
- Preserve personal notification and chat-body column grants and checked RPC behavior.
- Keep RLS enabled on every public table, including the new audit table; preserve private Storage bucket policies and private-schema helpers.
- Enforce leader-only publication/archive/completion at the database layer, including attempts to INSERT pre-published/pre-completed plans.
- Validate tenant-scoped reference-audio/resource paths; prevent ownership moves for setlists/templates.
- Revoke future default public/client table/function grants; new migrations must explicitly grant the least privilege required.

Workspace reads and writes use the publishable key and the caller's authenticated session. A separate server-only admin client is limited to authentication rate limits and account deletion; those operations derive the target user from a verified session and require reauthentication where appropriate. SQL migrations/control-plane tooling use privileged access for deployment/verification. Never put service credentials in `NEXT_PUBLIC_*` variables.

## Permission audit

Administrators can open **Team → Permission history** at `/settings/team/audit`. Both the page's server gate and the table's RLS restrict this history to administrators of the affected organization. The page is paginated and returns no data from other tenants.

`permission_audit_log` records database-generated actor ID, target ID, timestamp, action, and before/after role/position or invitation status. It does not store invitation codes, hashes, email addresses, or credentials. Client roles cannot insert, update, or delete log entries, including administrators. Trigger-only functions are private, pin `search_path`, and are not directly executable by client roles. History starts when the migration is applied; it does not fabricate past events. Database-owner/service maintenance remains privileged and must be audited operationally as well.

## Verification

```bash
npm test
npm run lint
npm run build
npm run audit:seo:local
```

Application tests cover role matrices, forged metadata, failed/unknown membership, direct action invocation, submitted tenant tampering, file ownership, and guessed service IDs. Existing service-team tests cover assignment/swap participants and ownership.

`supabase/tests/authorization.sql` must run as a database owner on a test database (or through authorized database maintenance tooling). It creates isolated synthetic users/tenants, switches to actual `authenticated`/`anon` roles, exercises RLS, grants and RPC checks, and rolls back all fixtures. Stop on the first SQL error. It never executes TRUNCATE. Example with a privately configured test database connection:

```bash
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/authorization.sql
```

The 33 database checks were run against the updated Supabase schema with all test fixtures rolled back. They include cross-tenant and anonymous denial, forged admin metadata, direct/self promotion, non-admin removal, safe editor writes, leader-only publishing/completion, ownership/path tampering, personal preferences, self-service positions, admin-only append-only audit visibility, and last-admin protection.

Post-change catalog checks confirmed zero public tables without RLS, zero authenticated TRUNCATE grants, zero anonymous executable public functions, zero public Storage buckets, and no authenticated direct execution of the audit trigger. The pre-existing advisor warnings remain: authenticated access to 30 intentionally exposed SECURITY DEFINER RPCs, and disabled leaked-password protection. Those RPCs retain explicit authentication/role/tenant checks; changing them all to invoker would break the intended constrained operations. Leaked-password protection is a separate Auth configuration item, not changed by these authorization migrations.

Signed-in browser interaction was not exercised with real user credentials; action tests and database-role tests verify the authorization boundaries without using customer accounts.

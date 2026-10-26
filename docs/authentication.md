# Authentication and account security

WorshipFlow uses Supabase Auth for identities, password hashing, email verification, refresh-token rotation, and authenticator verification. Account controls are under **Settings → Account security**.

## Sign-in and recovery

- New passwords require at least 12 characters and no more than 72 UTF-8 bytes. Existing passwords continue to work at sign-in.
- Signup checks that the hosted provider has email confirmation enabled. Existing and new addresses receive the same completion page.
- Sign-in errors do not distinguish unknown accounts, incorrect passwords, or unconfirmed email. Recovery requests use the same response whether the address exists or not.
- Redirect destinations stay within the application. PKCE codes are exchanged on the server; callback credentials are removed from the destination URL.
- Email links containing a token hash show a confirmation form before verification. A GET or email-link scanner cannot consume the token or sign in a browser.
- A successful recovery callback grants a signed, HttpOnly proof bound to that user and session for ten minutes. A normal signed-in session cannot use the recovery form to change a password.
- Password recovery preserves MFA. Accounts with an enabled authenticator must verify it before resetting a password.
- Password changes and password recovery revoke all sessions and require another sign-in.

OAuth provider buttons are not currently offered. The existing PKCE callback uses the same local redirect rules and session checks.

## Sessions and browser access

The server manages Supabase sessions in cookies with `HttpOnly`, `SameSite=Lax`, and a `/` path. Cookies also use `Secure` in production. Existing session cookies are upgraded on requests that refresh/check the session.

The browser Supabase client does not persist sessions or refresh tokens. Realtime notifications and direct file uploads obtain a short-lived access token through a same-origin POST to `/api/auth/session`. That token stays in memory. The endpoint returns no refresh token, requires a browser-specific request header, and cannot be cached.

The proxy rejects unsafe requests with a missing or foreign Origin. Next.js Server Actions retain their own origin validation. Sign-out accepts POST only. Authentication routes use `no-referrer`; personalized responses use `private, no-store`.

Database policies check that the JWT's session ID still belongs to the user, that the user is active and email-confirmed, and that MFA is satisfied when enabled. They also enforce a 30-day maximum session age and the provider's `not_after` time. The same check is inside existing callable SECURITY DEFINER functions because those functions bypass RLS. It applies to private Storage access as well.

The standard sign-out action revokes all sessions. The security page can revoke other sessions while keeping the current device signed in. Revoked access tokens lose database access before their JWT expiry. Saved offline charts are removed on the current device at sign-out; an offline device cannot receive a remote wipe until it reconnects. Previously issued signed file URLs remain subject to their own expiry.

## Authenticator app

Members can enroll a TOTP authenticator after confirming their current password. Setup is complete only after a valid code is entered. Factor IDs are checked against the signed-in user's factors.

After enrollment, other sessions are revoked and password-only sessions cannot access workspace data. Removing an authenticator requires the current password and a fresh authenticator code, revokes other sessions before removal, and signs out the current session afterward.

Keep the authenticator backed up or available on another trusted device. Lost-factor recovery requires the project maintainer to verify ownership and use the provider's recovery controls; a workspace role does not grant access to Auth administration.

## Rate limits

Application limits use atomic Postgres counters shared across server instances. Each fixed window lasts 15 minutes.

| Operation | Per account/address | Per IP |
| --- | --- | --- |
| Sign-in | 10 | 50 |
| Signup | 3 | 15 |
| Recovery and email security codes | 3 | 15 |
| Sensitive account actions | 5 | 25 |
| MFA, email-token, and PKCE verification | 10 | 40 |

Counters store SHA-256 digests rather than raw addresses or IPs and are cleaned up after 24 hours when another request is processed. Only the server service role can call the limiter. Requests fail closed if it is unavailable. Vercel's forwarded client-IP header is used in production; other hosts need an equivalent trusted proxy integration to avoid the conservative shared fallback.

Supabase's native limits still protect direct Auth endpoints. The application limiter does not replace those provider limits or bot protection.

## Account deletion

Deletion requires the current password, completed MFA when enabled, typing `DELETE`, and a confirmation dialog. The target account always comes from the verified session.

The only administrator of a workspace must appoint another administrator first. Both the preflight check and an atomic database trigger enforce this rule, including direct Auth Admin deletion.

Deletion removes the Auth account, profile, memberships, messages, preferences, notifications, and account-owned uploads. Uploads are deleted through the Storage API; shared audio/resource links are cleared. Shared songs, services, and historical activity remain with account references cleared. Past names or mentions in shared content may remain. Permission history is retained for security, and provider backups follow their configured retention period.

Storage and Auth cannot be deleted in one transaction. If file cleanup is interrupted, the account remains available for retry; some uploads may already have been removed. If the final Auth deletion fails after session revocation, the member must sign in again to retry.

## Deployment settings

Set these for each environment:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for that environment's project.
- `NEXT_PUBLIC_SITE_URL` to an HTTPS origin without a path, query, or credentials. HTTP is permitted only for localhost development.
- Server-only `SUPABASE_SECRET_KEY` for the private limiter, recovery-proof signing, and account deletion. The legacy `SUPABASE_SERVICE_ROLE_KEY` is accepted as a fallback. Neither belongs in browser variables or source control.

Use a separate Supabase project and keys for development, previews, and browser tests. The authenticated CI job reads `E2E_SUPABASE_SECRET_KEY` in addition to its existing test-project credentials.

The connected Supabase tools do not expose hosted Auth configuration. Check these in the [project's Auth settings](https://supabase.com/dashboard/project/kivvypsdudvijlrtpind/auth/providers):

1. Email confirmation enabled, email signup allowed, and working SMTP delivery.
2. Strong password rules, leaked-password protection where available, and secure password changes. The form supports Supabase's emailed reauthentication code.
3. TOTP enrollment and verification enabled.
4. An exact Site URL and a narrow redirect allowlist for `/auth/callback` and the email-confirmation template used by the deployment. Avoid production wildcards.
5. Appropriate Auth rate limits, refresh-token rotation and reuse detection, and an acceptable JWT lifetime. Provider time-box/inactivity settings may depend on the plan; the application's 30-day database limit applies independently.

The latest advisor check still reports [disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); this requires the hosted Auth setting. The existing 30 callable SECURITY DEFINER warnings refer to intentionally exposed, guarded workspace RPCs. The private rate-counter table intentionally has no client RLS policy and denies client table access.

References: [Supabase sessions](https://supabase.com/docs/guides/auth/sessions), [password security](https://supabase.com/docs/guides/auth/password-security), [MFA](https://supabase.com/docs/guides/auth/auth-mfa/totp), and [rate limits](https://supabase.com/docs/guides/auth/rate-limits).

## Verification

Run `npm test`, `npm run lint`, `npm run build`, and `npm run audit:seo:local`. Unit tests cover CSRF, recovery-proof expiry/tampering, session-cookie flags, rate-limit failure, reauthentication, factor ownership, and deletion guards.

Run [`supabase/tests/account-security.sql`](../supabase/tests/account-security.sql) and [`supabase/tests/authorization.sql`](../supabase/tests/authorization.sql) as the database owner. Both use synthetic fixtures and roll back all changes. Never run fixture tests through the public Data API.

Before release, use disposable accounts in the test project to complete email confirmation and recovery, enroll/verify/remove an authenticator, revoke another browser's session, and delete an account with uploads. Check that shared content remains and revoked tokens cannot read it. Email delivery and a real signed-in browser journey require those test-project credentials and a browser runtime; unit and SQL checks alone do not establish those results.

# Security Policy

## Reporting a vulnerability

Please do not report exploitable vulnerabilities in a public issue. Contact the repository maintainer privately through GitHub's security advisory feature, if enabled for this repository. Include the affected area, impact, reproduction steps, and a suggested mitigation when possible. Do not include real user data, passwords, access tokens, or production secrets.

## Security controls

WorshipFlow uses Supabase Auth and Row Level Security, server-side authorization checks, Zod validation for many form actions, and private Supabase Storage buckets with role-aware policies. These controls should be reviewed as the application evolves.

- Never commit `.env.local`, tokens, service-role keys, or production credentials.
- Keep Supabase secret/service-role keys server-only. Public publishable keys may use the `NEXT_PUBLIC_*` prefix.
- Use Supabase's query builder and RPC parameters rather than concatenating untrusted input into SQL.
- Keep production errors generic; logs must not include passwords, session tokens, invite codes, or uploaded file contents.
- Apply migrations in order and review RLS policies before deploying.
- Keep dependencies patched and review Dependabot, CodeQL, and npm audit findings.
- Verify email confirmation, password policy, auth rate limits, storage limits, and production redirect URLs in the hosted Supabase project settings.

## Deployment checklist

Some protections are provider settings and cannot be enforced by repository code alone:

1. Enable email confirmations in the hosted Supabase Auth settings and verify SMTP/delivery.
2. Require strong passwords and secure password changes in hosted Auth settings.
3. Configure auth rate limits and CAPTCHA for exposed signup/login/reset flows as appropriate.
4. Configure Vercel Firewall or another distributed rate limiter for app actions and upload/search endpoints. Do not rely on in-memory rate limits in serverless deployments.
5. Restrict production CORS/redirect allowlists to the actual application domains.
6. Enable GitHub secret scanning and push protection where available.
7. Run a Claude security review only after the repository owner configures and approves the required Anthropic credentials and data-sharing settings.
8. Review Supabase Security Advisors and test RLS using both authorized and unauthorized accounts before production release.

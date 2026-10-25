# WorshipFlow

WorshipFlow helps church worship teams manage song charts, plan services, and coordinate the people serving each week.

[Website](https://worshipflow-weld.vercel.app) · [Issues](https://github.com/vcatindig23/worshipflow/issues)

## Features

- **Songs:** A shared library with ChordPro charts, transposition, version comparison, reference recordings, and print/PDF output.
- **Service planning:** Setlists, a timed service order, rehearsals, preparation tasks, shared resources, and reusable templates.
- **Team coordination:** Invitations, ministry positions, assignment confirmations, swap requests, chat, and notifications.
- **Live Stage:** A focused lyrics-and-chords view with fullscreen, auto-scroll, song navigation, and saved offline charts.
- **Service history:** Completion notes, attendance, and service insights.
- **Permissions:** Role-based workspace access and administrator-only permission history.

Offline access is limited to Live Stage charts saved on the current device. Open the service online and wait for **Saved for offline** before using them without a connection.

## Stack

Next.js App Router, React, TypeScript, Tailwind CSS, and Supabase for authentication, PostgreSQL, and file storage. Form validation uses Zod; tests use Vitest and Playwright.

## Local development

For authorized development, you will need Node.js 22, npm, and a Supabase project.

```bash
git clone https://github.com/vcatindig23/worshipflow.git
cd worshipflow
npm ci
cp .env.example .env.local
```

Update `.env.local` with your project values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Use a Supabase publishable key for browser configuration. Keep secret and service-role keys out of `NEXT_PUBLIC_*` variables, and do not commit credentials.

Before starting the app:

1. Apply the migrations in [`supabase/migrations`](supabase/migrations) in timestamp order. For an existing database, check its migration history first.
2. Configure Supabase Auth's Site URL and redirect allowlist for your local application.

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000), then create an account and create or join a church workspace.

## Checks

| Command | Purpose |
| --- | --- |
| `npm run lint` | Check code quality |
| `npm test` | Run unit and component tests |
| `npm run build` | Build the production app |
| `npm run start` | Serve the production build |
| `npm run audit:seo:local` | Audit the production build's public metadata, links, redirects, and access rules |

Build the app before running the HTTP audit or browser tests. To run the public browser tests:

```bash
npx playwright install chromium
npm run test:e2e
```

The authenticated service workflow tests require a separate Supabase test project and test accounts. Their configuration is in the [browser test workflow](.github/workflows/e2e.yml). Database authorization checks are covered in the [authorization notes](docs/authorization.md#verification).

## Documentation

- [Design system](docs/design-system.md) — shared components, styles, and interaction patterns.
- [Authorization](docs/authorization.md) — roles, tenant isolation, database permissions, and audit logging.
- [Public-page SEO](docs/seo.md) — metadata, indexing rules, sitemap, and HTTP checks.
- [Security policy](SECURITY.md) — vulnerability reporting and deployment controls.

Use [GitHub Issues](https://github.com/vcatindig23/worshipflow/issues) for bugs and feature requests. Report security vulnerabilities through the process in `SECURITY.md`.

## Deployment

Deploy to Vercel or another compatible Next.js host. Set the production environment variables, apply the required Supabase migrations, and configure Auth redirects for the deployed domain. Use HTTPS for service workers and offline support.

If the production domain changes, update `SITE_URL` in [`src/lib/seo.ts`](src/lib/seo.ts). Verify sign-in, password recovery, permissions, and the main service workflow after deployment.

## License

WorshipFlow is proprietary software. Use, modification, deployment, and redistribution require permission from the repository owner under the [project license](LICENSE). Third-party dependencies and song materials retain their respective licenses and ownership.

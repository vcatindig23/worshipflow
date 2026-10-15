# WorshipFlow crawler guidance

WorshipFlow is a workspace for church worship teams to organize songs, chord charts, setlists, services, schedules, and team communication.

## Crawl policy

- The generated crawler directives are published at `/robots.txt`.
- The XML sitemap is published at `/sitemap.xml`.
- Login, sign-up, and password-recovery pages are public entry points.
- Workspace pages, personal schedules, team chat, profiles, uploaded files, settings, and API routes contain private or account-specific information and should not be indexed.
- Robots directives are crawl guidance, not access control. Private data must remain protected by server-side authentication and authorization.

## Preferred URLs

Use HTTPS and the canonical production host: https://worshipflow-weld.vercel.app/

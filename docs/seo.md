# Public discoverability and indexing

`src/lib/seo.ts` owns the production origin, public metadata helpers, JSON-LD serialization, and indexable content paths. Canonicals always use the production HTTPS origin and discard filters/fragments. Titles, descriptions, Open Graph URLs, and Twitter metadata are specific to each public page. `src/app/opengraph-image.tsx` generates the shared 1200×630 PNG social image locally without a remote font or image dependency.

| Routes | Policy |
| --- | --- |
| `/`, `/faq`, `/privacy`, `/terms` | Anonymous public content, indexable, included in sitemap |
| Auth/account entry, reset/confirmation, error pages | Accessible where required, noindex, excluded from sitemap |
| Workspace roots, onboarding, API routes | Require authentication; workspace data keeps existing membership/role authorization and database policies; noindex response headers |
| `/` with an authenticated session | Dashboard metadata, noindex header/meta, private/no-store response |
| `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/robots.md`, PWA shell assets | Accessible without a Supabase session or session refresh |
| Unknown routes outside workspace roots | Let Next return the real 404 page rather than redirecting every unknown URL to login |
| Vercel preview/development deployments | Disallow crawling, noindex header, empty sitemap, public metadata noindex |

The root metadata defaults to noindex; only the four public content pages opt in. Workspace titles are descriptive but never expose song/service/member names in social metadata. Structured data describes the actual landing page and visible FAQ answers; it does not invent reviews, ratings, or prices. Schema markup does not guarantee a rich result.

Robots rules reduce unnecessary crawling; they are not access controls. Login and error pages remain crawlable so crawlers can observe their noindex signals. Private URLs are protected by authentication and their existing server-side authorization, not just robots directives. Unauthenticated page requests redirect to login with 307; API requests return JSON 401. Existing resource handlers use `notFound()`/404 or permission checks. Next may return a streamed shell before a resource-level `notFound()`; its noindex output still applies. Unknown public routes are tested for an actual HTTP 404.

Authentication confirmation now verifies token hashes once, then redirects to a clean internal URL with 303. PKCE codes go to `/auth/callback` for exchange. Missing/invalid/expired confirmation inputs go to the error page. Recovery links go to password reset. The destination sanitizer rejects offsite/backslash/entry/callback destinations and strips credentials from destination query strings. Session refresh cookies survive proxy redirects.

## Check a build

```bash
npm test
npm run build
npm run audit:seo:local
```

`audit:seo:local` starts the production build on loopback, uses public placeholder Supabase values if none are supplied, tests anonymous responses, and stops the server. No user credentials or database writes are needed. It verifies public metadata, sitemap membership, JSON-LD parsing, internal public-page links, hash targets, account noindex signals, anonymous private-page redirects, API 401, unknown-page 404, trailing-slash 308, missing-confirmation 303, crawler assets, and PNG dimensions. CI runs it after the production build.

For a deployed production site:

```bash
npm run audit:seo -- https://worshipflow-weld.vercel.app
```

This audit intentionally fails on a preview deployment's noindex policy. It does not submit the sitemap to Search Console, verify live email delivery, test a real sign-in/token, or crawl authenticated user content. Supabase confirmation is covered with mocked success/expired/recovery/PKCE inputs in unit tests; existing signed-in authorization must also be checked with test accounts when available.

When adding a page, classify its root in `src/lib/public-paths.ts`. The route-classification test prevents a new app section from silently missing an access-policy decision. For new public content, add accurate metadata and sitemap membership explicitly. New private route roots must retain server-side authorization; add them to `protectedRouteRoots` so auth and noindex headers apply. Keep `SITE_URL` synchronized with the actual primary production domain when a custom domain is introduced.

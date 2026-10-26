import assert from "node:assert/strict"
import { JSDOM } from "jsdom"

const base = new URL(process.argv[2] ?? "http://127.0.0.1:3100")
const publicPaths = ["/", "/faq", "/privacy", "/terms"]
const headers = { "User-Agent": "Googlebot" }
const checked = new Map()

async function request(path, follow = true) {
  let url = new URL(path, base)
  const visited = new Set()
  for (let hops = 0; hops <= 5; hops++) {
    assert(!visited.has(url.href), `Redirect loop at ${url}`)
    visited.add(url.href)
    const response = await fetch(url, {
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    })
    if (follow && [301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location")
      assert(location, `Redirect has no Location: ${url}`)
      url = new URL(location, url)
      assert.equal(
        url.origin,
        base.origin,
        `Unexpected offsite redirect: ${url}`
      )
      continue
    }
    return { response, body: await response.text(), url }
  }
  throw new Error(`Too many redirects: ${path}`)
}

const sitemap = await request("/sitemap.xml")
assert.equal(sitemap.response.status, 200)
const xml = new JSDOM(sitemap.body, { contentType: "text/xml" }).window.document
const locations = [...xml.querySelectorAll("loc")].map(
  (el) => new URL(el.textContent)
)
assert.deepEqual(
  locations.map((url) => url.pathname).sort(),
  [...publicPaths].sort()
)
const canonicalOrigin = locations[0].origin
const links = []
for (const path of publicPaths) {
  const { response, body } = await request(path, false)
  assert.equal(response.status, 200, `${path} should be directly crawlable`)
  assert(
    !/noindex/i.test(response.headers.get("x-robots-tag") ?? ""),
    `${path} blocks indexing`
  )
  const document = new JSDOM(body).window.document
  assert(
    document.title.includes("WorshipFlow"),
    `${path} has no accurate title`
  )
  assert(
    document.querySelector('meta[name="description"]')?.content,
    `${path} has no description`
  )
  assert.equal(
    document.querySelector('link[rel="canonical"]')?.href,
    new URL(path, canonicalOrigin).href
  )
  assert(
    !/noindex/.test(
      document.querySelector('meta[name="robots"]')?.content ?? ""
    ),
    `${path} has noindex`
  )
  assert.equal(
    new URL(document.querySelector('meta[property="og:url"]')?.content).href,
    new URL(path, canonicalOrigin).href
  )
  assert(
    document.querySelector('meta[property="og:title"]')?.content,
    `${path} has no social title`
  )
  assert.equal(
    document.querySelector('meta[name="twitter:card"]')?.content,
    "summary_large_image"
  )
  if (path === "/" || path === "/faq") {
    const data = [
      ...document.querySelectorAll('script[type="application/ld+json"]'),
    ].map((script) => JSON.parse(script.textContent))
    assert(data.length, `${path} has no structured data`)
  }
  for (const anchor of document.querySelectorAll("a[href]")) {
    const target = new URL(anchor.getAttribute("href"), new URL(path, base))
    if (![base.origin, canonicalOrigin].includes(target.origin)) continue
    if (target.hash && target.pathname === path && !target.search) {
      assert(
        document.getElementById(decodeURIComponent(target.hash.slice(1))),
        `Broken fragment: ${path} → ${target.hash}`
      )
    } else {
      links.push(target.pathname + target.search)
    }
  }
  console.log(`PASS metadata and crawlability: ${path}`)
}
for (const path of new Set(links)) {
  const result = await request(path)
  assert(
    result.response.status < 400,
    `Broken internal link: ${path} (${result.response.status})`
  )
  checked.set(path, result.response.status)
}
for (const path of [
  "/missing-seo-audit-page",
  "/faq/missing-seo-audit-page",
  "/login/missing-seo-audit-page",
]) {
  const { response } = await request(path, false)
  assert.equal(
    response.status,
    404,
    `${path} must return 404, not a sign-in redirect`
  )
}
for (const path of ["/songs", "/settings/team", "/setlists", "/onboarding"]) {
  const { response } = await request(path, false)
  assert.equal(response.status, 307, `${path} must require sign-in`)
  assert.equal(
    new URL(response.headers.get("location"), base).pathname,
    "/login"
  )
  assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/)
}
for (const path of [
  "/login",
  "/signup",
  "/forgot-password",
  "/check-email",
  "/error",
]) {
  const { response, body } = await request(path)
  assert.equal(response.status, 200)
  assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/)
  assert.match(
    new JSDOM(body).window.document.querySelector('meta[name="robots"]')
      ?.content ?? "",
    /noindex/
  )
}
assert.equal(
  (
    await request(
      "/api/setlists/00000000-0000-4000-8000-000000000000/songs/0",
      false
    )
  ).response.status,
  401
)
for (const path of [
  "/robots.txt",
  "/llms.txt",
  "/robots.md",
  "/sw.js",
  "/offline-stage.html",
  "/offline-stage.js",
  "/worshipflow-app-icon.png",
  "/opengraph-image",
]) {
  assert.equal(
    (await request(path, false)).response.status,
    200,
    `${path} requires sign-in or is missing`
  )
}
const slashRedirect = (await request("/faq/", false)).response
assert.equal(slashRedirect.status, 308)
assert.equal(
  new URL(slashRedirect.headers.get("location"), base).pathname,
  "/faq"
)
const confirm = (await request("/auth/confirm", false)).response
assert.equal(confirm.status, 303)
assert.equal(new URL(confirm.headers.get("location"), base).pathname, "/error")
assert.equal((await request("/auth/confirm")).response.status, 200)
// Exercise authentication boundaries without credentials or outbound email.
for (const path of ["/auth/signout", "/api/auth/session"]) {
  for (const origin of [null, "https://foreign.example"]) {
    const response = await fetch(new URL(path, base), {
      method: "POST", redirect: "manual",
      headers: origin ? { Origin: origin } : {},
    })
    assert.equal(response.status, 403, `${path} accepted an unverified mutation`)
  }
}
const bridge = await fetch(new URL("/api/auth/session", base), {
  method: "POST", headers: { Origin: base.origin, "X-WorshipFlow-Client": "browser" }, redirect: "manual",
})
assert.equal(bridge.status, 401)
assert.equal((await fetch(new URL("/auth/signout", base), { redirect: "manual" })).status, 405)
const consent = await request("/auth/confirm?token_hash=non-secret-audit-fixture&type=signup&next=/songs")
assert.equal(consent.response.status, 200)
assert.match(consent.body, /Continue securely/)
assert.equal(consent.response.headers.get("referrer-policy"), "no-referrer")
const image = await fetch(new URL("/opengraph-image", base))
assert.match(image.headers.get("content-type") ?? "", /image\/png/)
const png = Buffer.from(await image.arrayBuffer())
assert.equal(png.readUInt32BE(16), 1200)
assert.equal(png.readUInt32BE(20), 630)
console.log(
  `PASS ${checked.size} internal links, redirect chains, 404/401 statuses, private access, CSRF/token boundaries, email confirmation, indexing headers, crawler assets, and 1200×630 social image`
)

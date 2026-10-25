import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readdirSync } from "node:fs"
import { resolve } from "node:path"
import sitemap from "../../src/app/sitemap"
import robots from "../../src/app/robots"
import config from "../../next.config"
import {
  canonicalUrl,
  INDEXABLE_PUBLIC_PATHS,
  publicPageMetadata,
  serializeJsonLd,
  SITE_URL,
} from "../../src/lib/seo"
import {
  isProtectedPath,
  isPublicPath,
  needsSessionRefresh,
  protectedRouteRoots,
} from "../../src/lib/public-paths"
import { getSafeAuthNextPath } from "../../src/lib/auth-redirect"

beforeEach(() => vi.stubEnv("VERCEL_ENV", "production"))
afterEach(() => vi.unstubAllEnvs())

describe("public indexing policy", () => {
  it("includes only canonical indexable pages in the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url)
    expect(urls).toEqual(INDEXABLE_PUBLIC_PATHS.map(canonicalUrl))
    expect(
      urls.every(
        (url) => !new URL(url).search && isPublicPath(new URL(url).pathname)
      )
    ).toBe(true)
  })
  it("keeps account entry pages crawlable so their noindex metadata is visible", () => {
    const rules = robots().rules as { disallow: string[]; allow: string }
    expect(rules.allow).toBe("/")
    for (const path of ["/login", "/signup", "/forgot-password", "/error"])
      expect(rules.disallow).not.toContain(path)
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`)
  })
  it("restricts preview crawling/indexing and omits a preview sitemap", () => {
    vi.stubEnv("VERCEL_ENV", "preview")
    expect(sitemap()).toEqual([])
    expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" })
    expect(
      publicPageMetadata("/faq", "Help", "Helpful answers").robots
    ).toEqual({ index: false, follow: false })
  })
  it("matches canonical, social URL, title, description and image dimensions", () => {
    const meta = publicPageMetadata(
      "/faq?search=songs#answer",
      "Help & FAQ",
      "Answers about worship planning"
    )
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/faq`)
    expect(meta.title).toEqual({ absolute: "Help & FAQ | WorshipFlow" })
    expect(meta.openGraph).toMatchObject({
      url: `${SITE_URL}/faq`,
      title: "Help & FAQ | WorshipFlow",
      description: meta.description,
      images: [{ width: 1200, height: 630 }],
    })
    expect(meta.twitter).toMatchObject({
      title: "Help & FAQ | WorshipFlow",
      card: "summary_large_image",
    })
    expect(
      publicPageMetadata("/login", "Sign in", "Account access", false).robots
    ).toEqual({ index: false, follow: false })
    expect(() => canonicalUrl("https://example.org/fake")).toThrow()
  })
  it("escapes script delimiters in JSON-LD without changing the parsed content", () => {
    const data = { text: '</script><script>alert("x")</script>' }
    const output = serializeJsonLd(data)
    expect(output).not.toContain("<")
    expect(JSON.parse(output)).toEqual(data)
  })
  it("sets noindex response headers for every workspace root", async () => {
    const headers = await config.headers!()
    for (const root of protectedRouteRoots) {
      expect(
        headers.find((entry) => entry.source === `${root}/:path*`)?.headers
      ).toContainEqual({ key: "X-Robots-Tag", value: "noindex, nofollow" })
    }
  })
  it("requires every page to have an explicit public/private classification", () => {
    for (const filename of readdirSync(resolve("src/app"), { recursive: true })) {
      const name = String(filename).replaceAll("\\", "/")
      if (name !== "page.tsx" && !name.endsWith("/page.tsx")) continue
      const path = name === "page.tsx" ? "/" : "/" + name.slice(0, -"/page.tsx".length)
      expect(isPublicPath(path) || isProtectedPath(path), `Unclassified page: ${path}`).toBe(true)
    }
  })
  it.each([
    "/robots.txt",
    "/sitemap.xml",
    "/llms.txt",
    "/robots.md",
    "/sw.js",
    "/offline-stage.html",
    "/opengraph-image",
    "/faq",
    "/faq/missing",
    "/missing",
  ])("does not require session refresh for %s", (path) => {
    expect(needsSessionRefresh(path)).toBe(false)
  })
  it.each(["/faq/private", "/login/private", "/sitemap.xml/private"])(
    "does not wildcard-publicize %s",
    (path) => expect(isPublicPath(path)).toBe(false)
  )
})
describe("authentication destinations", () => {
  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/auth/confirm",
    "/auth/callback?code=secret",
    "/login",
    "/signup",
    "/\nsettings",
  ])("rejects unsafe or looping destination %s", (path) =>
    expect(getSafeAuthNextPath(path)).toBe("/")
  )
  it("preserves internal filters while removing credentials", () => {
    expect(
      getSafeAuthNextPath("/songs?key=G&code=secret&token_hash=secret#chart")
    ).toBe("/songs?key=G#chart")
    expect(getSafeAuthNextPath("/reset-password")).toBe("/reset-password")
  })
})

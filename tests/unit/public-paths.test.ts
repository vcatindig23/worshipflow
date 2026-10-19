import { describe, expect, it } from "vitest"
import { isPublicPath } from "../../src/lib/public-paths"

describe("public routes", () => {
  it.each([
    "/login", "/signup", "/forgot-password", "/manifest.webmanifest",
    "/robots.txt", "/sitemap.xml", "/auth/callback", "/auth/confirm",
  ])("allows unauthenticated access to %s", (pathname) => {
    expect(isPublicPath(pathname)).toBe(true)
  })

  it.each(["/", "/songs", "/setlists", "/settings", "/api/private"])(
    "keeps %s protected", (pathname) => {
      expect(isPublicPath(pathname)).toBe(false)
    }
  )

  it("does not expose routes with a similar prefix", () => {
    expect(isPublicPath("/robots.txt.old")).toBe(false)
    expect(isPublicPath("/sitemap.xml-extra")).toBe(false)
    expect(isPublicPath("/login-help")).toBe(false)
  })
})

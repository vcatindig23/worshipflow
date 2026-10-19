import { describe, expect, it } from "vitest"
import { shouldLoadSiteUtilities } from "../../src/lib/site-utilities-routes"

describe("site utilities route splitting", () => {
  it.each([
    "/login", "/signup", "/forgot-password", "/reset-password", "/check-email",
    "/error", "/onboarding", "/onboarding/join", "/auth/callback", "/auth/confirm",
  ])("does not load app utilities on %s", (pathname) => {
    expect(shouldLoadSiteUtilities(pathname)).toBe(false)
  })

  it.each([
    "/", "/songs", "/songs/song-1", "/setlists/service-1/live", "/chat",
    "/settings", "/settings/profile", "/faq",
  ])("loads app utilities on %s", (pathname) => {
    expect(shouldLoadSiteUtilities(pathname)).toBe(true)
  })

  it("does not exclude unrelated routes with a similar prefix", () => {
    expect(shouldLoadSiteUtilities("/login-help")).toBe(true)
    expect(shouldLoadSiteUtilities("/onboarding-tools")).toBe(true)
    expect(shouldLoadSiteUtilities("/author")).toBe(true)
  })
})

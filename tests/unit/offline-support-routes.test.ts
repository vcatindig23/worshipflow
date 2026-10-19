import { describe, expect, it } from "vitest"
import { shouldSyncOfflineAccount } from "../../src/lib/offline-support-routes"

describe("offline account sync route guard", () => {
  it.each([
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/check-email",
    "/onboarding",
    "/onboarding/join",
    "/auth/callback",
    "/auth/confirm",
  ])("skips Supabase account sync on %s", (pathname) => {
    expect(shouldSyncOfflineAccount(pathname)).toBe(false)
  })

  it.each([
    "/",
    "/songs",
    "/songs/song-1",
    "/setlists/service-1/live",
    "/chat",
    "/settings/profile",
  ])("keeps account sync enabled on %s", (pathname) => {
    expect(shouldSyncOfflineAccount(pathname)).toBe(true)
  })

  it("does not treat unrelated routes with similar prefixes as public auth pages", () => {
    expect(shouldSyncOfflineAccount("/login-help")).toBe(true)
    expect(shouldSyncOfflineAccount("/onboarding-tools")).toBe(true)
  })
})

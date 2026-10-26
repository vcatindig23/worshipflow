import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
const mocks = vi.hoisted(() => ({
  claims: vi.fn(),
  createServerClient: vi.fn(),
  sessionState: vi.fn(),
}))
vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}))
vi.mock("@/lib/supabase/env", () => ({
  getPublicEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-test-key",
  }),
}))
import { updateSession } from "../../src/lib/supabase/proxy"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.claims.mockResolvedValue({ data: { claims: null } })
  mocks.sessionState.mockResolvedValue({ data: { active: true, verified: true, mfaRequired: false }, error: null })
  mocks.createServerClient.mockReturnValue({
    auth: { getClaims: mocks.claims },
    rpc: mocks.sessionState,
  })
})
const request = (path: string) =>
  new NextRequest(`https://worshipflow.example${path}`)
describe("crawler access and authorization", () => {
  it.each([
    "/faq",
    "/privacy",
    "/robots.txt",
    "/sitemap.xml",
    "/llms.txt",
    "/robots.md",
    "/sw.js",
    "/offline-stage.html",
    "/opengraph-image",
    "/unknown",
    "/faq/unknown",
  ])("lets Next serve public content or a real 404 for %s", async (path) => {
    const response = await updateSession(request(path))
    expect(response.headers.get("x-middleware-next")).toBe("1")
    expect(mocks.createServerClient).not.toHaveBeenCalled()
    expect(response.headers.get("location")).toBeNull()
  })
  it.each([
    "/songs",
    "/settings/team",
    "/setlists/id/live",
    "/onboarding/join",
  ])("requires authentication for %s", async (path) => {
    const response = await updateSession(request(path))
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "https://worshipflow.example/login"
    )
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow")
    expect(response.headers.get("cache-control")).toBe("private, no-store")
  })
  it("returns a 401 JSON response to an unauthenticated API caller", async () => {
    const response = await updateSession(request("/api/setlists/id/songs/0"))
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: "Authentication required." })
    expect(response.headers.get("location")).toBeNull()
  })
  it("lets authenticated users through while preventing indexing/caching of their pages", async () => {
    mocks.claims.mockResolvedValue({ data: { claims: { sub: "user-1" } } })
    for (const path of ["/", "/songs"]) {
      const response = await updateSession(request(path))
      expect(response.headers.get("x-middleware-next")).toBe("1")
      expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow")
    }
    const response = await updateSession(request("/login"))
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "https://worshipflow.example/"
    )
  })
  it("preserves refreshed session cookies when redirecting", async () => {
    mocks.createServerClient.mockImplementation((_url, _key, options) => {
      options.cookies.setAll(
        [
          {
            name: "test-session",
            value: "refreshed",
            options: { httpOnly: true, path: "/" },
          },
        ],
        {}
      )
      return { auth: { getClaims: mocks.claims } }
    })
    const response = await updateSession(request("/songs"))
    expect(response.cookies.get("test-session")?.value).toBe("refreshed")
  })
  it("refuses cross-site and missing-Origin mutations", async () => {
    for (const origin of [undefined, "https://evil.example"]) {
      const response = await updateSession(new NextRequest("https://worshipflow.example/auth/signout", { method: "POST", headers: origin ? { origin } : {} }))
      expect(response.status).toBe(403)
    }
    expect(mocks.createServerClient).not.toHaveBeenCalled()
  })
  it("blocks revoked sessions even while their JWT is unexpired", async () => {
    mocks.claims.mockResolvedValue({ data: { claims: { sub: "user-1" } } })
    mocks.sessionState.mockResolvedValue({ data: { active: false, verified: true, mfaRequired: false } })
    const response = await updateSession(request("/settings/security"))
    expect(response.headers.get("location")).toBe("https://worshipflow.example/login")
  })
  it("routes password-only MFA accounts to verification and denies API access", async () => {
    mocks.claims.mockResolvedValue({ data: { claims: { sub: "user-1" } } })
    mocks.sessionState.mockResolvedValue({ data: { active: true, verified: true, mfaRequired: true } })
    expect((await updateSession(request("/songs"))).headers.get("location")).toBe("https://worshipflow.example/auth/mfa")
    expect((await updateSession(request("/api/auth/session"))).status).toBe(403)
  })
  it("upgrades older browser-readable cookies to HttpOnly", async () => {
    const req = request("/songs")
    req.cookies.set("sb-test-auth-token.0", "old-session")
    const response = await updateSession(req)
    expect(response.cookies.get("sb-test-auth-token.0")?.httpOnly).toBe(true)
  })
})

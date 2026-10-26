import { afterEach, describe, expect, it, vi } from "vitest"
import { createRecoveryProof, getAuthSiteUrl, isSameOriginRequest, sessionCookieOptions, verifyRecoveryProof } from "../../src/lib/auth-security"

afterEach(() => vi.unstubAllEnvs())
describe("session cookies", () => {
  it("uses HttpOnly, Secure, SameSite Lax cookies in production", () => {
    vi.stubEnv("NODE_ENV", "production")
    expect(sessionCookieOptions()).toEqual({ httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 2592000 })
  })
  it("permits HTTP localhost during development", () => {
    vi.stubEnv("NODE_ENV", "development")
    expect(sessionCookieOptions().secure).toBe(false)
  })
})
describe("CSRF checks", () => {
  it.each([undefined, "null", "https://evil.example", "not a url"])("rejects Origin %s", (origin) => {
    const headers = new Headers({ host: "worshipflow.example" })
    if (origin) headers.set("origin", origin)
    expect(isSameOriginRequest(headers)).toBe(false)
  })
  it("rejects a cross-site request even with a matching host", () => {
    expect(isSameOriginRequest(new Headers({ origin: "https://worshipflow.example", host: "worshipflow.example", "sec-fetch-site": "cross-site" }))).toBe(false)
  })
  it("accepts a same-origin request", () => {
    expect(isSameOriginRequest(new Headers({ origin: "https://worshipflow.example" }), "https://worshipflow.example/auth/signout")).toBe(true)
  })
  it("rejects a different scheme on the same host", () => {
    expect(isSameOriginRequest(new Headers({ origin: "http://worshipflow.example" }), "https://worshipflow.example/auth/signout")).toBe(false)
  })
  it("supports only the configured origin behind a development proxy", () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://own-3000.app.github.dev")
    const headers = new Headers({ origin: "https://own-3000.app.github.dev", "x-forwarded-host": "own-3000.app.github.dev" })
    expect(isSameOriginRequest(headers, "http://localhost:3000/login")).toBe(true)
    headers.set("origin", "https://other-3000.app.github.dev")
    headers.set("x-forwarded-host", "other-3000.app.github.dev")
    expect(isSameOriginRequest(headers, "http://localhost:3000/login")).toBe(false)
    vi.stubEnv("NODE_ENV", "production")
    headers.set("origin", "https://own-3000.app.github.dev")
    headers.set("x-forwarded-host", "own-3000.app.github.dev")
    expect(isSameOriginRequest(headers, "http://localhost:3000/login")).toBe(false)
  })
})
describe("recovery grants", () => {
  it("binds a ten-minute grant to exactly one user and session", () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "server-test-key")
    const now = 1000000
    const proof = createRecoveryProof("user-1", "session-1", now)
    expect(verifyRecoveryProof(proof, "user-1", "session-1", now)).toBe(true)
    expect(verifyRecoveryProof(proof, "user-2", "session-1", now)).toBe(false)
    expect(verifyRecoveryProof(proof, "user-1", "session-2", now)).toBe(false)
    expect(verifyRecoveryProof(proof, "user-1", "session-1", now + 600000)).toBe(false)
    expect(verifyRecoveryProof(proof + "x", "user-1", "session-1", now)).toBe(false)
    expect(verifyRecoveryProof(undefined, "user-1", "session-1", now)).toBe(false)
  })
  it("rejects edited payloads and grants signed before key rotation", () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "server-test-key")
    const proof = createRecoveryProof("user-1", "session-1")
    const [, signature] = proof.split(".")
    const edited = Buffer.from(JSON.stringify({ userId: "user-2", sessionId: "session-2", expires: Date.now() + 600000 })).toString("base64url")
    expect(verifyRecoveryProof(edited + "." + signature, "user-2", "session-2")).toBe(false)
    vi.stubEnv("SUPABASE_SECRET_KEY", "rotated-test-key")
    expect(verifyRecoveryProof(proof, "user-1", "session-1")).toBe(false)
  })
})
describe("authentication callback base URL", () => {
  it.each(["https://user:pass@app.example", "https://app.example/path", "https://app.example?next=evil", "http://app.example", "javascript:alert(1)"])("rejects %s", (url) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", url)
    expect(() => getAuthSiteUrl()).toThrow()
  })
  it.each(["https://app.example", "http://localhost:3000"])("accepts %s", (url) => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", url)
    expect(getAuthSiteUrl()).toBe(url)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
const m = vi.hoisted(() => ({
  client: vi.fn(), rate: vi.fn(), provider: vi.fn(), recovery: vi.fn(), grant: vi.fn(), deleteCookie: vi.fn(),
  redirect: vi.fn((path: string): never => { throw new Error("REDIRECT:" + path) }),
}))
vi.mock("@/lib/supabase/server", () => ({ createClient: m.client }))
vi.mock("@/lib/auth-rate-limit", () => ({ allowAuthAttempt: m.rate }))
vi.mock("@/lib/auth-provider", () => ({ supportsVerifiedSignup: m.provider }))
vi.mock("@/lib/auth-recovery", () => ({ hasRecoverySession: m.recovery, grantRecoverySession: m.grant }))
vi.mock("next/navigation", () => ({ redirect: m.redirect }))
vi.mock("next/headers", () => ({ cookies: async () => ({ delete: m.deleteCookie }) }))
import { signup } from "../../src/app/signup/actions"
import { login } from "../../src/app/login/actions"
import { requestPasswordReset } from "../../src/app/forgot-password/actions"
import { updatePassword } from "../../src/app/reset-password/actions"
import { confirmEmail } from "../../src/app/auth/verify/actions"
import { GET as authCallback } from "../../src/app/auth/callback/route"
import { NextRequest } from "next/server"

function form(values: Record<string, string>) {
  const data = new FormData()
  Object.entries(values).forEach(([k,v]) => data.set(k,v))
  return data
}
function fixture() {
  const auth = {
    signUp: vi.fn(async () => ({ data: { session: null }, error: null })),
    signInWithPassword: vi.fn(async () => ({ error: null })),
    getClaims: vi.fn(async () => ({ data: { claims: { sub: "own-user" } }, error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ error: null })),
    updateUser: vi.fn(async () => ({ error: null })),
    verifyOtp: vi.fn(async () => ({ error: null })),
    exchangeCodeForSession: vi.fn(async () => ({ error: null })),
  }
  const client = { auth, rpc: vi.fn(async () => ({ data: { active: true, verified: true, mfaRequired: false }, error: null })), from: vi.fn() }
  m.client.mockResolvedValue(client)
  return client
}
let client: ReturnType<typeof fixture>
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://worshipflow.example")
  m.rate.mockResolvedValue(true); m.provider.mockResolvedValue(true)
  m.recovery.mockResolvedValue(true); m.grant.mockResolvedValue(true)
  client = fixture()
})
afterEach(() => vi.unstubAllEnvs())

describe("account enumeration resistance", () => {
  const signupForm = () => form({ fullName: "Test Member", email: "fixture@example.invalid", password: "a-long-test-password", confirmPassword: "a-long-test-password" })
  it("gives new and existing addresses the same signup destination", async () => {
    await expect(signup(signupForm())).rejects.toThrow("REDIRECT:/check-email")
    client.auth.signUp.mockResolvedValue({ data: { session: null }, error: { message: "already registered" } } as never)
    await expect(signup(signupForm())).rejects.toThrow("REDIRECT:/check-email")
  })
  it("refuses signup when hosted Auth would skip email confirmation", async () => {
    m.provider.mockResolvedValue(false)
    await expect(signup(signupForm())).rejects.toThrow("configuration_error")
    expect(client.auth.signUp).not.toHaveBeenCalled()
  })
  it("keeps recovery responses generic for unknown addresses and provider errors", async () => {
    const values = { email: "fixture@example.invalid" }
    await expect(requestPasswordReset(form(values))).rejects.toThrow("sent=true")
    client.auth.resetPasswordForEmail.mockResolvedValue({ error: { message: "no account" } } as never)
    await expect(requestPasswordReset(form(values))).rejects.toThrow("sent=true")
  })
  it.each(["invalid credentials", "email not confirmed", "user not found"])("does not expose provider error: %s", async (message) => {
    client.auth.signInWithPassword.mockResolvedValue({ error: { message } } as never)
    expect(await login({ error: "" }, form({ email: "fixture@example.invalid", password: "wrong" }))).toEqual({ error: "The email or password is incorrect. Check your details and try again." })
  })
  it("requires MFA before reading memberships after password sign-in", async () => {
    client.rpc.mockResolvedValue({ data: { active: true, verified: true, mfaRequired: true }, error: null })
    await expect(login({ error: "" }, form({ email: "fixture@example.invalid", password: "password" }))).rejects.toThrow("REDIRECT:/auth/mfa")
    expect(client.from).not.toHaveBeenCalled()
  })
})

describe("password recovery authorization", () => {
  const passwordForm = () => form({ password: "a-new-long-password", confirmPassword: "a-new-long-password" })
  it("rejects a signed-in session without a recovery grant", async () => {
    m.recovery.mockResolvedValue(false)
    await expect(updatePassword(passwordForm())).rejects.toThrow("error=expired")
    expect(client.auth.updateUser).not.toHaveBeenCalled()
  })
  it("does not let recovery bypass an enrolled authenticator", async () => {
    client.rpc.mockResolvedValue({ data: { active: true, verified: true, mfaRequired: true }, error: null })
    await expect(updatePassword(passwordForm())).rejects.toThrow("/auth/mfa?next=/reset-password")
    expect(client.auth.updateUser).not.toHaveBeenCalled()
  })
  it("consumes the grant and revokes sessions after a valid reset", async () => {
    await expect(updatePassword(passwordForm())).rejects.toThrow("saved=true")
    expect(client.auth.updateUser).toHaveBeenCalledWith({ password: "a-new-long-password" })
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "global" })
    expect(m.deleteCookie).toHaveBeenCalledWith("wf-recovery")
  })
})

describe("intentional email confirmation", () => {
  it("verifies only submitted valid email types and uses a safe destination", async () => {
    await expect(confirmEmail(form({ token_hash: "one-time-token", type: "signup", next: "https://evil.example" }))).rejects.toThrow("REDIRECT:/")
    expect(client.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "one-time-token", type: "signup" })
  })
  it("creates recovery authorization only after a valid recovery token", async () => {
    client.auth.verifyOtp.mockResolvedValue({ error: { message: "expired" } } as never)
    await expect(confirmEmail(form({ token_hash: "expired", type: "recovery" }))).rejects.toThrow("confirmation_failed")
    expect(m.grant).not.toHaveBeenCalled()
  })
  it("rejects unsupported confirmation types before contacting the provider", async () => {
    await expect(confirmEmail(form({ token_hash: "token", type: "sms" }))).rejects.toThrow("confirmation_failed")
    expect(client.auth.verifyOtp).not.toHaveBeenCalled()
  })
})

describe("PKCE callback", () => {
  it("rejects provider errors without exchanging a code", async () => {
    const response = await authCallback(new NextRequest("https://worshipflow.example/auth/callback?error=access_denied&code=unused"))
    expect(response.headers.get("location")).toBe("https://worshipflow.example/error?code=confirmation_failed")
    expect(client.auth.exchangeCodeForSession).not.toHaveBeenCalled()
  })
  it("fails closed when a callback exceeds its rate limit", async () => {
    m.rate.mockResolvedValue(false)
    await authCallback(new NextRequest("https://worshipflow.example/auth/callback?code=unused"))
    expect(client.auth.exchangeCodeForSession).not.toHaveBeenCalled()
  })
  it("grants recovery only after a successful code exchange", async () => {
    const response = await authCallback(new NextRequest("https://worshipflow.example/auth/callback?code=valid-fixture&next=/reset-password"))
    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith("valid-fixture")
    expect(m.grant).toHaveBeenCalledWith(client)
    expect(response.headers.get("location")).toBe("https://worshipflow.example/reset-password")
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
const mocks = vi.hoisted(() => ({ verifyOtp: vi.fn(), createClient: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }))
vi.mock("@/lib/auth-recovery", () => ({ grantRecoverySession: vi.fn(async () => true) }))
import { GET } from "../../src/app/auth/confirm/route"

const origin = "https://worshipflow.example"
beforeEach(() => {
  vi.clearAllMocks()
  mocks.createClient.mockResolvedValue({ auth: { verifyOtp: mocks.verifyOtp } })
  mocks.verifyOtp.mockResolvedValue({ error: null })
})
describe("email confirmation redirects", () => {
  it("requires confirmation without consuming a token on GET", async () => {
    const response = await GET(
      new NextRequest(
        `${origin}/auth/confirm?token_hash=example&type=email&next=/songs`
      )
    )
    expect(mocks.verifyOtp).not.toHaveBeenCalled()
    expect(response.status).toBe(303)
    const location = new URL(response.headers.get("location")!)
    expect(location.pathname).toBe("/auth/verify")
    expect(location.searchParams.get("token_hash")).toBe("example")
    expect(location.searchParams.get("next")).toBe("/songs")
  })
  it("sends recovery tokens to password reset", async () => {
    const response = await GET(
      new NextRequest(
        `${origin}/auth/confirm?token_hash=example&type=recovery&next=/songs`
      )
    )
    const location = new URL(response.headers.get("location")!)
    expect(location.pathname).toBe("/auth/verify")
    expect(location.searchParams.get("next")).toBe("/reset-password")
  })
  it("hands PKCE codes to the callback without placing credentials on the homepage", async () => {
    const response = await GET(
      new NextRequest(`${origin}/auth/confirm?code=example&next=/songs`)
    )
    const location = new URL(response.headers.get("location")!)
    expect(location.pathname).toBe("/auth/callback")
    expect(location.searchParams.get("code")).toBe("example")
    expect(location.searchParams.get("next")).toBe("/songs")
    expect(mocks.createClient).not.toHaveBeenCalled()
  })
  it.each([
    "",
    "?token_hash=example&type=sms",
    "?token_hash=example",
    "?type=email",
  ])(
    "rejects malformed confirmation %s without a verification call",
    async (query) => {
      const response = await GET(
        new NextRequest(`${origin}/auth/confirm${query}`)
      )
      expect(response.headers.get("location")).toBe(
        `${origin}/error?code=confirmation_failed`
      )
      expect(mocks.verifyOtp).not.toHaveBeenCalled()
    }
  )
  it("does not attempt token verification during an email scanner request", async () => {
    await GET(new NextRequest(`${origin}/auth/confirm?token_hash=example&type=email`))
    expect(mocks.verifyOtp).not.toHaveBeenCalled()
  })
})

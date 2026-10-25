import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
const mocks = vi.hoisted(() => ({ verifyOtp: vi.fn(), createClient: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }))
import { GET } from "../../src/app/auth/confirm/route"

const origin = "https://worshipflow.example"
beforeEach(() => {
  vi.clearAllMocks()
  mocks.createClient.mockResolvedValue({ auth: { verifyOtp: mocks.verifyOtp } })
  mocks.verifyOtp.mockResolvedValue({ error: null })
})
describe("email confirmation redirects", () => {
  it("verifies a token once and redirects away from the confirmation endpoint", async () => {
    const response = await GET(
      new NextRequest(
        `${origin}/auth/confirm?token_hash=example&type=email&next=/songs`
      )
    )
    expect(mocks.verifyOtp).toHaveBeenCalledExactlyOnceWith({
      token_hash: "example",
      type: "email",
    })
    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe(`${origin}/songs`)
  })
  it("sends recovery tokens to password reset", async () => {
    const response = await GET(
      new NextRequest(
        `${origin}/auth/confirm?token_hash=example&type=recovery&next=/songs`
      )
    )
    expect(response.headers.get("location")).toBe(`${origin}/reset-password`)
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
  it("handles expired tokens with one error redirect", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: { message: "expired" } })
    const response = await GET(
      new NextRequest(`${origin}/auth/confirm?token_hash=example&type=email`)
    )
    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe(
      `${origin}/error?code=confirmation_failed`
    )
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
const m = vi.hoisted(() => ({ client: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: m.client }))
import { POST } from "../../src/app/api/auth/session/route"

let client: ReturnType<typeof fixture>
function fixture() {
  const value = {
    auth: {
      getClaims: vi.fn(async () => ({ data: { claims: { sub: "own-user" } }, error: null })),
      getSession: vi.fn(async () => ({ data: { session: { access_token: "short-lived-access", refresh_token: "must-never-leave-server", expires_at: 2000000000, user: { id: "own-user", email: "private@example.invalid" } } } })),
    },
    rpc: vi.fn(async () => ({ data: { active: true, verified: true, mfaRequired: false }, error: null })),
  }
  m.client.mockResolvedValue(value)
  return value
}
const request = (origin = "https://worshipflow.example", marker = "browser") => new NextRequest("https://worshipflow.example/api/auth/session", { method: "POST", headers: { origin, "x-worshipflow-client": marker } })
beforeEach(() => { vi.clearAllMocks(); client = fixture() })
describe("browser token bridge", () => {
  it.each([["https://evil.example", "browser"], ["https://worshipflow.example", ""]])("rejects cross-origin or unmarked requests", async (origin, marker) => {
    expect((await POST(request(origin, marker))).status).toBe(403)
    expect(m.client).not.toHaveBeenCalled()
  })
  it("does not expose refresh tokens or private user metadata", async () => {
    const response = await POST(request())
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(await response.json()).toEqual({ access_token: "short-lived-access", expires_at: 2000000000, user: { id: "own-user" } })
  })
  it.each([
    { active: false, verified: true, mfaRequired: false },
    { active: true, verified: false, mfaRequired: false },
    { active: true, verified: true, mfaRequired: true },
  ])("withholds tokens for an unauthorized session: %j", async (state) => {
    client.rpc.mockResolvedValue({ data: state, error: null })
    expect((await POST(request())).status).toBe(401)
    expect(client.auth.getSession).not.toHaveBeenCalled()
  })
})

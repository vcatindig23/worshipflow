import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  hasPermission,
  roles,
  type Permission,
} from "../../src/lib/permissions"
const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error("REDIRECT:" + path)
  }),
}))
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/invitations/code", () => ({
  generateInviteCode: () => "TESTCODE",
  hashInviteCode: () => "test-hash",
}))
import { requireWorkspaceAuthorization } from "../../src/lib/authorization"
import {
  createInvitation,
  updateMemberRole,
} from "../../src/app/settings/team/actions"
import { deleteWorkspaceFile } from "../../src/app/files/actions"
import { GET } from "../../src/app/api/setlists/[id]/songs/[index]/route"

const userId = "10000000-0000-4000-8000-000000000001"
const otherUserId = "10000000-0000-4000-8000-000000000002"
const orgA = "20000000-0000-4000-8000-000000000001"
const orgB = "20000000-0000-4000-8000-000000000002"
const serviceId = "30000000-0000-4000-8000-000000000001"
function form(values: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(values)) data.set(key, value)
  return data
}
function client(
  role = "admin",
  membershipError: object | null = null,
  membership = true
) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({
      data: membership ? { organization_id: orgA, role } : null,
      error: membershipError,
    })),
  }
  const remove = vi.fn(async () => ({ error: null }))
  const supabase = {
    auth: {
      getClaims: vi.fn(async () => ({
        data: {
          claims: {
            sub: userId,
            role: "admin",
            user_metadata: { role: "admin", organization_id: orgB },
          },
        },
        error: null as object | null,
      })),
    },
    from: vi.fn(() => query),
    rpc: vi.fn(async () => ({ error: null })),
    storage: { from: vi.fn(() => ({ remove })) },
  }
  mocks.createClient.mockResolvedValue(supabase)
  return { supabase, query, remove }
}
beforeEach(() => vi.clearAllMocks())

describe("role and permission contract", () => {
  it.each(roles)(
    "preserves member reading/personal participation for %s",
    (role) => {
      expect(hasPermission(role, "workspace:read")).toBe(true)
      expect(hasPermission(role, "preferences:self")).toBe(true)
    }
  )
  it.each(["team:manage", "organization:manage", "audit:read"] as Permission[])(
    "reserves %s for administrators",
    (permission) => {
      for (const role of roles)
        expect(hasPermission(role, permission)).toBe(role === "admin")
    }
  )
  it("separates catalog editing from leading services and administration", () => {
    expect(hasPermission("song_editor", "songs:edit")).toBe(true)
    expect(hasPermission("song_editor", "services:lead")).toBe(false)
    expect(hasPermission("worship_leader", "services:lead")).toBe(true)
    expect(hasPermission("worship_leader", "team:manage")).toBe(false)
    expect(hasPermission("viewer", "services:edit")).toBe(false)
  })
  it.each([null, undefined, "owner", "ADMIN", { role: "admin" }, ["admin"]])(
    "rejects malformed or unrecognized role %j",
    (role) => expect(hasPermission(role, "team:manage")).toBe(false)
  )
})
describe("server authorization context", () => {
  it("ignores role/tenant claims in user metadata and reads the persisted membership", async () => {
    const { query } = client("viewer")
    const result = await requireWorkspaceAuthorization("workspace:read")
    expect(result).toMatchObject({
      userId,
      organizationId: orgA,
      role: "viewer",
    })
    expect(query.eq).toHaveBeenCalledWith("user_id", userId)
    await expect(requireWorkspaceAuthorization("team:manage")).rejects.toThrow(
      "REDIRECT:/error?code=permission_denied"
    )
  })
  it("rejects claims verification errors before reading membership", async () => {
    const { supabase } = client()
    supabase.auth.getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: userId,
          role: "admin",
          user_metadata: { role: "admin", organization_id: orgB },
        },
      },
      error: { message: "invalid signature" },
    })
    await expect(requireWorkspaceAuthorization()).rejects.toThrow(
      "REDIRECT:/login"
    )
    expect(supabase.from).not.toHaveBeenCalled()
  })
  it("rejects a membership error without choosing a guessed tenant", async () => {
    client("admin", { code: "PGRST116" })
    await expect(requireWorkspaceAuthorization()).rejects.toThrow(
      "REDIRECT:/error?code=membership_load_failed"
    )
  })
  it("routes a verified account with no membership to onboarding", async () => {
    client("admin", null, false)
    await expect(requireWorkspaceAuthorization()).rejects.toThrow(
      "REDIRECT:/onboarding"
    )
  })
  it("fails closed even for reading when the persisted role is unknown", async () => {
    client("owner")
    await expect(requireWorkspaceAuthorization()).rejects.toThrow(
      "REDIRECT:/error?code=permission_denied"
    )
  })
})
describe("direct protected operations", () => {
  it("prevents a non-admin from inviting members despite forged admin claims", async () => {
    const { supabase } = client("viewer")
    const result = await createInvitation(
      { success: false, code: "", error: "" },
      form({ email: "member@example.com", role: "team_member" })
    )
    expect(result.success).toBe(false)
    expect(supabase.rpc).not.toHaveBeenCalled()
  })
  it("ignores a submitted organization ID for a legitimate administrator role update", async () => {
    const { supabase } = client("admin")
    await expect(
      updateMemberRole(
        form({ userId: otherUserId, role: "song_editor", organizationId: orgB })
      )
    ).rejects.toThrow("REDIRECT:/settings/team")
    expect(supabase.rpc).toHaveBeenCalledWith(
      "update_organization_member_role",
      { p_organization_id: orgA, p_user_id: otherUserId, p_role: "song_editor" }
    )
  })
  it("rejects direct invocation of role updates by a team member", async () => {
    const { supabase } = client("team_member")
    await expect(
      updateMemberRole(form({ userId, role: "admin" }))
    ).rejects.toThrow("REDIRECT:/settings/team?error=administrator_required")
    expect(supabase.rpc).not.toHaveBeenCalled()
  })
  it("rejects a file path from another tenant before calling Storage", async () => {
    const { supabase, remove } = client("admin")
    await expect(
      deleteWorkspaceFile(form({ path: orgB + "/private.pdf" }))
    ).rejects.toThrow("REDIRECT:/files?error=invalid_file")
    expect(supabase.storage.from).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
  })
  it("allows an editor to remove an own-tenant file", async () => {
    const { remove } = client("song_editor")
    await expect(
      deleteWorkspaceFile(form({ path: orgA + "/rehearsal.pdf" }))
    ).rejects.toThrow("REDIRECT:/files")
    expect(remove).toHaveBeenCalledExactlyOnceWith([orgA + "/rehearsal.pdf"])
  })
  it("rejects file management by a viewer", async () => {
    const { remove } = client("viewer")
    await expect(
      deleteWorkspaceFile(form({ path: orgA + "/rehearsal.pdf" }))
    ).rejects.toThrow("REDIRECT:/error?code=permission_denied")
    expect(remove).not.toHaveBeenCalled()
  })
  it("returns 401 when API claims verification fails even if a subject is present", async () => {
    const { supabase } = client("admin")
    supabase.auth.getClaims.mockResolvedValue({ data: { claims: { sub: userId, role: "admin", user_metadata: { role: "admin", organization_id: orgB } } }, error: { message: "invalid signature" } })
    const response = await GET(new Request("https://example.test"), { params: Promise.resolve({ id: serviceId, index: "0" }) })
    expect(response.status).toBe(401)
    expect(supabase.from).not.toHaveBeenCalled()
  })
  it("returns 404 for a guessed service ID outside the caller's tenant", async () => {
    const { supabase, query: membership } = client("admin")
    const scopedQuery = {
      select: vi.fn(() => scopedQuery),
      eq: vi.fn(() => scopedQuery),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    }
    supabase.from.mockImplementation((...args: unknown[]) =>
      args[0] === "organization_members" ? membership : scopedQuery
    )
    const response = await GET(new Request("https://example.test"), {
      params: Promise.resolve({ id: serviceId, index: "0" }),
    })
    expect(response.status).toBe(404)
    expect(scopedQuery.eq).toHaveBeenCalledWith("organization_id", orgA)
    expect(supabase.from).not.toHaveBeenCalledWith("songs")
  })
})

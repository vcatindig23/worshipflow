import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getProfileAvatarUrlMap: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}))

vi.mock("@/lib/profile-avatars", () => ({
  getProfileAvatarUrlMap: mocks.getProfileAvatarUrlMap,
}))

import { getWorkspaceIdentity } from "@/lib/workspace/get-workspace-identity"

function createQueryBuilder(result: unknown) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {}
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.limit = vi.fn(() => builder)
  builder.in = vi.fn(() => builder)
  builder.maybeSingle = vi.fn().mockResolvedValue(result)
  builder.is = vi.fn().mockResolvedValue(result)
  return builder
}

describe("getWorkspaceIdentity", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads the authenticated member and shared workspace context", async () => {
    const profileQuery = createQueryBuilder({
      data: {
        display_name: "  Worship Leader  ",
        avatar_url: "profile-id/avatar-id.webp",
      },
      error: null,
    })
    const membershipQuery = createQueryBuilder({
      data: {
        organization_id: "organization-123",
        role: "worship_leader",
        organizations: {
          id: "organization-123",
          name: "Unity in Jesus",
          description: "Worship team",
          contact_email: "team@example.com",
          contact_phone: null,
          address: null,
          website: null,
          timezone: "Asia/Manila",
          default_service_name: "Sunday Worship",
          default_service_day: 0,
          default_service_time: "09:00",
          onboarding_completed_at: "2026-01-01T00:00:00.000Z",
        },
      },
      error: null,
    })
    const notificationsQuery = createQueryBuilder({
      count: 3,
      error: null,
    })

    const supabase = {
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: {
            claims: {
              sub: "user-123",
              email: "member@example.com",
            },
          },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === "profiles") return profileQuery
        if (table === "organization_members") return membershipQuery
        if (table === "notifications") return notificationsQuery
        throw new Error(`Unexpected table: ${table}`)
      }),
    }

    mocks.createClient.mockResolvedValue(supabase)
    mocks.getProfileAvatarUrlMap.mockResolvedValue(
      new Map([["profile-id/avatar-id.webp", "https://example.com/avatar.webp"]])
    )

    const workspace = await getWorkspaceIdentity()

    expect(workspace).toMatchObject({
      userId: "user-123",
      userName: "Worship Leader",
      userAvatarUrl: "https://example.com/avatar.webp",
      userEmail: "member@example.com",
      role: "worship_leader",
      organizationId: "organization-123",
      organizationName: "Unity in Jesus",
      organizationTimezone: "Asia/Manila",
      defaultServiceName: "Sunday Worship",
      defaultServiceDay: 0,
      defaultServiceTime: "09:00",
      unreadChatNotificationCount: 3,
    })
    expect(workspace.supabase).toBe(supabase)
    expect(mocks.createClient).toHaveBeenCalledOnce()
    expect(supabase.auth.getClaims).toHaveBeenCalledOnce()
    expect(supabase.from).toHaveBeenCalledTimes(3)
    expect(mocks.getProfileAvatarUrlMap).toHaveBeenCalledWith(supabase, [
      "profile-id/avatar-id.webp",
    ])
  })
})

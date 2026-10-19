import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getWorkspace: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((destination: string): never => {
    throw new Error(`REDIRECT:${destination}`)
  }),
}))

vi.mock("../../src/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}))

vi.mock("../../src/lib/workspace/get-workspace", () => ({
  getWorkspace: mocks.getWorkspace,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}))

import { respondToSetlistAssignment } from "../../src/app/my-schedule/actions"
import { requestAssignmentSwap } from "../../src/app/my-schedule/swap-actions"
import {
  respondToAssignmentSwapRequest,
  resolveAssignmentSwapRequest,
} from "../../src/app/setlists/[id]/coordination-actions"

const assignmentId = "f1d2d2f9-2a9d-4f8e-a6c0-2c5ce44f3a10"
const requestId = "2f5c4b0a-6d17-4e88-9b6a-3d8b7e2c1f40"
const setlistId = "6a3e9d18-c9b4-4a12-8f61-3b2d7a9e5c40"
const organizationId = "7b4f0e29-dad5-4c64-9a73-4c3e8b0f6d51"
const requesterId = "8c5a1f30-ebc6-4d75-a084-5d4f9c1a7e62"
const substituteId = "9d6b2a41-fcd7-4e86-b195-6e5a0d2b8f73"
const otherUserId = "ae7c3b52-0de8-4f97-82a6-7f6b1e3c9a84"

function createQuery(data: unknown) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data, error: null })),
  }
  return query
}

function createSupabase(options?: {
  rpcError?: { message: string } | null
  queryData?: unknown
}) {
  const query = createQuery(options?.queryData ?? null)
  const supabase = {
    auth: {
      getClaims: vi.fn(async () => ({
        data: { claims: { sub: substituteId } },
      })),
    },
    from: vi.fn(() => query),
    rpc: vi.fn(async () => ({ error: options?.rpcError ?? null })),
  }
  return { supabase, query }
}

function form(values: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(values)) data.set(key, value)
  return data
}

function expectRedirect(promise: Promise<unknown>, destination: string) {
  return expect(promise).rejects.toThrow(`REDIRECT:${destination}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.redirect.mockImplementation((destination: string): never => {
    throw new Error(`REDIRECT:${destination}`)
  })
  mocks.getWorkspace.mockResolvedValue({
    userId: substituteId,
    organizationId,
    role: "team_member",
  })
})

describe("service-team server actions", () => {
  it("saves a valid assignment confirmation and refreshes schedule views", async () => {
    const { supabase } = createSupabase()
    mocks.createClient.mockResolvedValue(supabase)

    const result = await respondToSetlistAssignment(
      assignmentId,
      "confirmed",
      "  I will be there  "
    )

    expect(result).toEqual({
      success: true,
      status: "confirmed",
      error: "",
    })
    expect(supabase.rpc).toHaveBeenCalledWith("respond_to_setlist_assignment", {
      p_assignment_id: assignmentId,
      p_status: "confirmed",
      p_response_note: "I will be there",
    })
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/my-schedule")
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/services")
  })

  it("rejects an invalid assignment response before creating a Supabase client", async () => {
    const result = await respondToSetlistAssignment(
      "../../another-user",
      "pending",
      "invalid"
    )

    expect(result).toEqual({
      success: false,
      status: null,
      error: "The confirmation response is invalid.",
    })
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it("creates a swap request only after confirming the assignment belongs to the requester", async () => {
    mocks.getWorkspace.mockResolvedValue({
      userId: requesterId,
      organizationId,
      role: "team_member",
    })
    const { supabase, query } = createSupabase({
      queryData: {
        id: assignmentId,
        setlist_id: setlistId,
        user_id: requesterId,
      },
    })
    mocks.createClient.mockResolvedValue(supabase)

    await expectRedirect(
      requestAssignmentSwap(
        form({
          assignmentId,
          substituteUserId: substituteId,
          reason: "  I have a schedule conflict.  ",
        })
      ),
      "/my-schedule?swapRequested=1"
    )

    expect(query.eq).toHaveBeenNthCalledWith(1, "id", assignmentId)
    expect(query.eq).toHaveBeenNthCalledWith(2, "user_id", requesterId)
    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_setlist_assignment_swap_request",
      {
        p_assignment_id: assignmentId,
        p_substitute_user_id: substituteId,
        p_reason: "I have a schedule conflict.",
      }
    )
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/my-schedule")
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/notifications")
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/setlists/${setlistId}`)
  })

  it("prevents a different member from responding to the substitute's swap request", async () => {
    const { supabase } = createSupabase({
      queryData: {
        id: requestId,
        setlist_id: setlistId,
        substitute_user_id: otherUserId,
        status: "pending",
      },
    })
    mocks.createClient.mockResolvedValue(supabase)

    await expectRedirect(
      respondToAssignmentSwapRequest(
        form({
          requestId,
          decision: "accept",
          responseNote: "",
        })
      ),
      "/notifications?error=swap_request_unavailable"
    )

    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it("lets the intended substitute respond and refreshes affected views", async () => {
    const { supabase } = createSupabase({
      queryData: {
        id: requestId,
        setlist_id: setlistId,
        substitute_user_id: substituteId,
        status: "pending",
      },
    })
    mocks.createClient.mockResolvedValue(supabase)

    await expectRedirect(
      respondToAssignmentSwapRequest(
        form({
          requestId,
          decision: "accept",
          responseNote: "  I can cover it.  ",
        })
      ),
      `/setlists/${setlistId}?swapResponse=1#assignment-swaps`
    )

    expect(supabase.rpc).toHaveBeenCalledWith(
      "respond_to_setlist_assignment_swap_request",
      {
        p_request_id: requestId,
        p_decision: "accept",
        p_response_note: "I can cover it.",
      }
    )
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/my-schedule")
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/notifications")
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/setlists/${setlistId}`)
  })

  it("blocks non-leaders from resolving a swap before database access", async () => {
    mocks.getWorkspace.mockResolvedValue({
      userId: substituteId,
      organizationId,
      role: "team_member",
    })

    await expectRedirect(
      resolveAssignmentSwapRequest(
        form({
          requestId,
          decision: "approve",
          resolutionNote: "",
        })
      ),
      "/error?code=permission_denied"
    )

    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it("scopes leader resolution to the leader's workspace and records the decision", async () => {
    mocks.getWorkspace.mockResolvedValue({
      userId: requesterId,
      organizationId,
      role: "worship_leader",
    })
    const { supabase, query } = createSupabase({
      queryData: {
        id: requestId,
        setlist_id: setlistId,
        organization_id: organizationId,
      },
    })
    mocks.createClient.mockResolvedValue(supabase)

    await expectRedirect(
      resolveAssignmentSwapRequest(
        form({
          requestId,
          decision: "approve",
          resolutionNote: "  Coverage confirmed.  ",
        })
      ),
      `/setlists/${setlistId}?swapResolved=1#assignment-swaps`
    )

    expect(query.eq).toHaveBeenNthCalledWith(1, "id", requestId)
    expect(query.eq).toHaveBeenNthCalledWith(2, "organization_id", organizationId)
    expect(supabase.rpc).toHaveBeenCalledWith(
      "resolve_setlist_assignment_swap_request",
      {
        p_request_id: requestId,
        p_decision: "approve",
        p_resolution_note: "Coverage confirmed.",
      }
    )
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/my-schedule")
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/services")
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/notifications")
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/setlists/${setlistId}`)
  })
})

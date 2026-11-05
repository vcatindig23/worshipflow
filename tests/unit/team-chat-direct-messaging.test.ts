import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/workspace/get-workspace", () => ({
  getWorkspace: vi.fn(),
}))

import {
  createTeamChatDirectConversation,
  loadTeamChatDirectMessages,
  sendTeamChatDirectMessage,
  toggleTeamChatMessageReaction,
  toggleTeamChatDirectMessageReaction,
} from "../../src/app/chat/actions"

describe("direct message and reaction validation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects a recipient that is not a UUID before accessing the workspace", async () => {
    await expect(createTeamChatDirectConversation("not-a-user-id")).resolves.toMatchObject({
      success: false,
      error: "Choose a valid team member.",
    })
  })

  it("rejects malformed direct conversation IDs when loading history", async () => {
    await expect(loadTeamChatDirectMessages("invalid")).resolves.toMatchObject({
      success: false,
      error: "This direct conversation is invalid.",
    })
  })

  it("requires a message or at least one attachment before sending", async () => {
    const formData = new FormData()
    formData.set("conversationId", "11111111-1111-4111-8111-111111111111")
    formData.set("body", "   ")

    await expect(sendTeamChatDirectMessage(formData)).resolves.toMatchObject({
      success: false,
      error: "Write a message or attach a file before sending.",
    })
  })

  it("rejects a message longer than 2,000 characters", async () => {
    const formData = new FormData()
    formData.set("conversationId", "11111111-1111-4111-8111-111111111111")
    formData.set("body", "x".repeat(2001))

    await expect(sendTeamChatDirectMessage(formData)).resolves.toMatchObject({
      success: false,
    })
  })

  it("rejects unsupported group reaction emoji", async () => {
    await expect(
      toggleTeamChatMessageReaction(
        "11111111-1111-4111-8111-111111111111",
        "not-an-emoji"
      )
    ).resolves.toMatchObject({
      success: false,
      error: "Choose a supported reaction.",
    })
  })

  it("rejects a direct reaction with an invalid conversation ID", async () => {
    await expect(
      toggleTeamChatDirectMessageReaction(
        "not-a-conversation",
        "11111111-1111-4111-8111-111111111111",
        "👍"
      )
    ).resolves.toMatchObject({
      success: false,
      error: "Choose a supported reaction.",
    })
  })
})

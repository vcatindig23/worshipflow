import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}))

vi.mock("../../src/app/chat/actions", () => {
  const action = async () => ({ success: true, reactions: {} })
  return {
    deleteTeamChatMessage: action,
    editTeamChatMessage: action,
    loadOlderTeamChatMessages: action,
    markTeamChatNotificationsRead: action,
    searchTeamChatMessages: action,
    sendTeamChatMessageWithAttachments: action,
    setTeamChatMessagePinned: action,
    createTeamChatDirectConversation: action,
    loadTeamChatMessageReactions: action,
    toggleTeamChatMessageReaction: action,
    loadTeamChatDirectMessageReactions: action,
    markTeamChatDirectNotificationsRead: action,
    loadTeamChatDirectMessages: action,
    sendTeamChatDirectMessage: action,
    toggleTeamChatDirectMessageReaction: action,
  }
})

import TeamChatClient from "../../src/app/chat/team-chat-client"
import DirectMessageClient from "../../src/app/chat/direct-message-client"
import { MessageReactionPicker } from "../../src/app/chat/message-reaction-picker"

const organizationId = "11111111-1111-4111-8111-111111111111"
const currentUserId = "22222222-2222-4222-8222-222222222222"

describe("chat reaction picker positioning", () => {
  it("anchors outgoing-message reactions to the right and wraps them inside the viewport", () => {
    const markup = renderToStaticMarkup(
      <MessageReactionPicker
        isOwnMessage
        isOpen
        onSelect={() => {}}
      />
    )

    expect(markup).toContain("absolute bottom-full right-0")
    expect(markup).toContain("max-w-[calc(100vw-2rem)]")
    expect(markup).toContain("flex max-w-full flex-wrap gap-1 justify-end")
    expect(markup).toContain('aria-label="React with 👍"')
    expect(markup).toContain('aria-label="React with 😮"')
  })

  it("keeps group-message reactions clear of the member avatar and chat edge", () => {
    const markup = renderToStaticMarkup(
      <MessageReactionPicker
        isOwnMessage={false}
        hasAvatar
        isOpen
        onSelect={() => {}}
      />
    )

    expect(markup).toContain("absolute bottom-full left-0")
    expect(markup).toContain("max-w-[calc(100vw-5rem)]")
    expect(markup).toContain("flex max-w-full flex-wrap gap-1 justify-start")
  })
})

describe("chat feature layout", () => {
  it("keeps the church group chat separate and exposes direct-message entry points", () => {
    const markup = renderToStaticMarkup(
      <TeamChatClient
        organizationId={organizationId}
        organizationTimezone="Asia/Manila"
        currentUserId={currentUserId}
        canPinMessages
        initialMessages={[]}
        initialPinnedMessages={[]}
        initialDirectConversations={[]}
        members={[
          { id: currentUserId, displayName: "Worship Leader", role: "admin" },
          { id: "33333333-3333-4333-8333-333333333333", displayName: "Team Member", role: "team_member" },
        ]}
      />
    )

    expect(markup).toContain("Church group chat")
    expect(markup).toContain("Direct messages")
    expect(markup).toContain('aria-label="Message Team Member"')
    expect(markup).toContain('aria-label="Attach images"')
    expect(markup).toContain('aria-label="Attach files"')
    expect(markup).toContain('aria-label="Choose emoji"')
  })

  it("renders private one-to-one messaging with distinct upload and emoji controls", () => {
    const markup = renderToStaticMarkup(
      <DirectMessageClient
        currentUserId={currentUserId}
        conversation={{
          id: "44444444-4444-4444-8444-444444444444",
          otherUserId: "33333333-3333-4333-8333-333333333333",
          otherUserName: "Team Member",
        }}
        onBackToGroup={() => {}}
        onConversationActivity={() => {}}
      />
    )

    expect(markup).toContain("Private conversation")
    expect(markup).toContain("Loading messages")
    expect(markup).toContain('aria-label="Attach images"')
    expect(markup).toContain('aria-label="Attach files"')
    expect(markup).toContain('aria-label="Choose emoji"')
  })
})

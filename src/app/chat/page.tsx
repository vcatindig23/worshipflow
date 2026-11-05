import { Feedback } from "@/components/ui/feedback"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import TeamChatClient, {
  type TeamChatMember,
  type TeamChatMessage,
  type TeamChatDirectConversation,
} from "./team-chat-client"

type MemberRow = {
  user_id: string
  role: string
}

type ProfileRow = {
  id: string
  display_name: string | null
}

type MessageRow = {
  id: string
  organization_id: string
  user_id: string
  body: string
  created_at: string
  reply_to_message_id: string | null
  reply_to_user_id: string | null
  reply_to_body: string | null
  pinned_at: string | null
  pinned_by: string | null
  mentioned_user_ids: string[]
  attachments: import("./team-chat-client").TeamChatAttachment[]
}

export default async function TeamChatPage() {
  const workspace = await getWorkspace()
  const supabase = await createClient()

  const { data: memberRows, error: membersError } = await supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("organization_id", workspace.organizationId)
    .order("created_at", { ascending: true })

  if (membersError) {
    console.error("load_team_chat_members failed:", {
      code: membersError.code,
      message: membersError.message,
    })
    throw new Error("Unable to load your worship team.")
  }

  const organizationMembers = (memberRows ?? []) as MemberRow[]
  const memberIds = organizationMembers.map((member) => member.user_id)
  let profileRows: ProfileRow[] = []

  if (memberIds.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", memberIds)

    if (error) {
      console.error("load_team_chat_profiles failed:", {
        code: error.code,
        message: error.message,
      })
      throw new Error("Unable to load worship team profiles.")
    }

    profileRows = (data ?? []) as ProfileRow[]
  }

  const profileNames = new Map(
    profileRows.map((profile) => [
      profile.id,
      profile.display_name?.trim() || "Worship Member",
    ])
  )

  const members: TeamChatMember[] = organizationMembers.map((member) => ({
    id: member.user_id,
    displayName: profileNames.get(member.user_id) ?? "Worship Member",
    role: member.role,
  }))

  const { data: directRows, error: directRowsError } = await supabase
    .from("team_chat_direct_conversations")
    .select("id, organization_id, user_one_id, user_two_id, last_message_at, last_message_preview, updated_at")
    .eq("organization_id", workspace.organizationId)
    .or(`user_one_id.eq.${workspace.userId},user_two_id.eq.${workspace.userId}`)
    .order("updated_at", { ascending: false })
    .limit(100)

  const directSchemaUnavailable =
    directRowsError?.code === "42P01" ||
    directRowsError?.code === "PGRST205"

  if (directRowsError && !directSchemaUnavailable) {
    console.error("load_team_chat_direct_conversations failed:", {
      code: directRowsError.code,
      message: directRowsError.message,
    })
    throw new Error("Unable to load your direct conversations.")
  }

  const directOtherUserIds = Array.from(new Set(
    (directRows ?? []).map((conversation) =>
      conversation.user_one_id === workspace.userId
        ? conversation.user_two_id
        : conversation.user_one_id
    )
  ))
  const directOtherNames = new Map<string, string>()
  if (directOtherUserIds.length > 0) {
    const { data: directProfiles, error: directProfilesError } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", directOtherUserIds)

    if (directProfilesError) {
      console.error("load_team_chat_direct_profiles failed:", {
        code: directProfilesError.code,
        message: directProfilesError.message,
      })
    } else {
      for (const profile of (directProfiles ?? []) as ProfileRow[]) {
        directOtherNames.set(profile.id, profile.display_name?.trim() || "Worship Member")
      }
    }
  }

  const directConversations: TeamChatDirectConversation[] = (directRows ?? []).map((conversation) => {
    const otherUserId = conversation.user_one_id === workspace.userId
      ? conversation.user_two_id
      : conversation.user_one_id
    return {
      id: conversation.id,
      otherUserId,
      otherUserName: directOtherNames.get(otherUserId) ?? "Worship Member",
      lastMessageAt: conversation.last_message_at,
      lastMessagePreview: conversation.last_message_preview || "Start a conversation",
    }
  })

  const { data: messageRows, error: messagesError } = await supabase
    .from("team_chat_messages")
    .select("id, organization_id, user_id, body, created_at, reply_to_message_id, reply_to_user_id, reply_to_body, pinned_at, pinned_by, mentioned_user_ids, attachments")
    .eq("organization_id", workspace.organizationId)
    .order("created_at", { ascending: false })
    .limit(100)

  const schemaUnavailable =
    messagesError?.code === "42P01" ||
    messagesError?.code === "PGRST205" ||
    directSchemaUnavailable

  if (messagesError && !schemaUnavailable) {
    console.error("load_team_chat_messages failed:", {
      code: messagesError.code,
      message: messagesError.message,
    })
    throw new Error("Unable to load your team chat.")
  }

  const initialMessages: TeamChatMessage[] = ((messageRows ?? []) as MessageRow[])
    .slice()
    .reverse()
    .map((message) => ({
      ...message,
      attachments: Array.isArray(message.attachments) ? message.attachments : [],
      authorName: profileNames.get(message.user_id) ?? "Worship Member",
    }))

  const { data: pinnedRows, error: pinnedMessagesError } = await supabase
    .from("team_chat_messages")
    .select("id, organization_id, user_id, body, created_at, reply_to_message_id, reply_to_user_id, reply_to_body, pinned_at, pinned_by, mentioned_user_ids, attachments")
    .eq("organization_id", workspace.organizationId)
    .not("pinned_at", "is", null)
    .order("pinned_at", { ascending: false })
    .limit(10)

  if (pinnedMessagesError) {
    console.error("load_pinned_team_chat_messages failed:", {
      code: pinnedMessagesError.code,
      message: pinnedMessagesError.message,
    })
    throw new Error("Unable to load pinned team chat messages.")
  }

  const initialPinnedMessages: TeamChatMessage[] = ((pinnedRows ?? []) as MessageRow[])
    .map((message) => ({
      ...message,
      attachments: Array.isArray(message.attachments) ? message.attachments : [],
      authorName: profileNames.get(message.user_id) ?? "Worship Member",
    }))

  return (
    <main className="mx-auto max-w-[1500px] px-2 py-3 text-[var(--foreground)] sm:px-4 sm:py-4 lg:px-6">
      {schemaUnavailable ? (
        <Feedback tone="warning" title="Finish setting up Team Chat">
          The chat table is not available in your Supabase database yet. Apply{" "}
          <code className="rounded bg-[var(--warning-soft)] px-1.5 py-0.5 text-xs">
            20261010063000_team_chat.sql
          </code>{" "}
          from the repository&apos;s <code>supabase/migrations</code> folder, then
          refresh this page. The migration also configures the access rules and
          live message updates.
        </Feedback>
      ) : (
        <TeamChatClient
          organizationId={workspace.organizationId}
          organizationTimezone={workspace.organizationTimezone || "Asia/Manila"}
          currentUserId={workspace.userId}
          canPinMessages={["admin", "worship_leader"].includes(workspace.role)}
          initialMessages={initialMessages}
          initialPinnedMessages={initialPinnedMessages}
          initialDirectConversations={directConversations}
          members={members}
        />
      )}
    </main>
  )
}

import { AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import TeamChatClient, {
  type TeamChatMember,
  type TeamChatMessage,
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

  const { data: messageRows, error: messagesError } = await supabase
    .from("team_chat_messages")
    .select("id, organization_id, user_id, body, created_at, reply_to_message_id, reply_to_user_id, reply_to_body, pinned_at, pinned_by, mentioned_user_ids, attachments")
    .eq("organization_id", workspace.organizationId)
    .order("created_at", { ascending: false })
    .limit(100)

  const schemaUnavailable =
    messagesError?.code === "42P01" ||
    messagesError?.code === "PGRST205"

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
        <section
          role="status"
          className="rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8"
        >
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700">
              <AlertCircle className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-amber-950">
                Finish setting up Team Chat
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-900">
                The chat table is not available in your Supabase database yet. Apply
                <code className="mx-1 rounded bg-white/80 px-1.5 py-0.5 text-xs">
                  20261010063000_team_chat.sql
                </code>
                from the repository&apos;s <code>supabase/migrations</code> folder,
                then refresh this page. The migration also configures the access
                rules and live message updates.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <TeamChatClient
          organizationId={workspace.organizationId}
          organizationTimezone={workspace.organizationTimezone || "Asia/Manila"}
          currentUserId={workspace.userId}
          canPinMessages={["admin", "worship_leader"].includes(workspace.role)}
          initialMessages={initialMessages}
          initialPinnedMessages={initialPinnedMessages}
          members={members}
        />
      )}
    </main>
  )
}

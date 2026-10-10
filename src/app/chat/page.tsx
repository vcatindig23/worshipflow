import {
  AlertCircle,
  MessageCircle,
  MessagesSquare,
  UsersRound,
} from "lucide-react"
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
}

function formatRole(role: string) {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "WF"
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
    .select("id, organization_id, user_id, body, created_at")
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
      authorName: profileNames.get(message.user_id) ?? "Worship Member",
    }))

  return (
    <main className="mx-auto max-w-7xl space-y-7 px-4 py-8 text-[var(--foreground)] sm:px-6 lg:px-8">
      <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
            <MessagesSquare className="size-3.5" />
            Worship Team Communication
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Team Chat
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Keep your worship team connected with rehearsal updates, song arrangements, service reminders, and team coordination.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 shadow-sm">
          <UsersRound className="size-4 text-[var(--brand)]" />
          <span className="text-sm font-semibold">{members.length}</span>
          <span className="text-sm text-[var(--muted)]">
            {members.length === 1 ? "workspace member" : "workspace members"}
          </span>
        </div>
      </section>

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
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <TeamChatClient
            organizationId={workspace.organizationId}
            currentUserId={workspace.userId}
            initialMessages={initialMessages}
            members={members}
          />

          <aside className="space-y-4">
            <section className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <UsersRound className="size-4 text-[var(--brand)]" />
                <h2 className="text-sm font-semibold">Your worship team</h2>
              </div>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                Everyone in this church workspace shares this conversation.
              </p>

              <ul className="mt-4 space-y-3">
                {members.slice(0, 8).map((member) => (
                  <li key={member.id} className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[10px] font-bold text-[var(--brand)]">
                      {initials(member.displayName)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {member.id === workspace.userId
                          ? `${member.displayName} (You)`
                          : member.displayName}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-[var(--muted)]">
                        {formatRole(member.role)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>

              {members.length > 8 ? (
                <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
                  And {members.length - 8} more{" "}
                  {members.length - 8 === 1 ? "member" : "members"}
                </p>
              ) : null}
            </section>

            <section className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <MessageCircle className="size-4 text-[var(--brand)]" />
                <h2 className="text-sm font-semibold">Good to know</h2>
              </div>
              <ul className="mt-3 space-y-3 text-xs leading-5 text-[var(--muted)]">
                <li>Use the chat for rehearsal coordination, song keys, and service updates.</li>
                <li>Messages are visible to members of your current church workspace.</li>
                <li>Messages update live while the chat is open and connected.</li>
              </ul>
            </section>
          </aside>
        </div>
      )}
    </main>
  )
}

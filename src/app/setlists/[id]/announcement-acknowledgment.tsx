import { CheckCircle2, Clock3 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import { acknowledgeServiceAnnouncement } from "./coordination-actions"

export default async function AnnouncementAcknowledgment({
  setlistId,
}: {
  setlistId: string
}) {
  const workspace = await getWorkspace()
  if (!workspace) return null

  const supabase = await createClient()
  const [serviceResult, assignmentResult, acknowledgmentResult] = await Promise.all([
    supabase
      .from("setlists")
      .select("announcements")
      .eq("id", setlistId)
      .eq("organization_id", workspace.organizationId)
      .maybeSingle(),
    supabase
      .from("setlist_team_assignments")
      .select("user_id, confirmation_status")
      .eq("setlist_id", setlistId),
    supabase
      .from("setlist_announcement_acknowledgments")
      .select("user_id, acknowledged_at")
      .eq("setlist_id", setlistId)
      .eq("organization_id", workspace.organizationId)
      .order("acknowledged_at", { ascending: false }),
  ])

  if (
    !serviceResult.data?.announcements?.trim() ||
    assignmentResult.error ||
    acknowledgmentResult.error
  ) {
    return null
  }

  const assignedUsers = new Set(
    (assignmentResult.data ?? [])
      .filter((assignment) => assignment.confirmation_status !== "declined")
      .map((assignment) => assignment.user_id)
  )
  if (assignedUsers.size === 0) return null

  const acknowledgments = (acknowledgmentResult.data ?? []).filter((row) =>
    assignedUsers.has(row.user_id)
  )
  const acknowledgedUsers = new Set(acknowledgments.map((row) => row.user_id))
  const hasAcknowledged = acknowledgedUsers.has(workspace.userId)
  const canAcknowledge = assignedUsers.has(workspace.userId)
  const acknowledgedNames = new Map<string, string>()

  if (acknowledgedUsers.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", [...acknowledgedUsers])

    for (const profile of profiles ?? []) {
      acknowledgedNames.set(
        profile.id,
        profile.display_name?.trim() || "Team member"
      )
    }
  }

  const orderedNames = acknowledgments
    .map((row) => ({
      at: row.acknowledged_at,
      name: acknowledgedNames.get(row.user_id) ?? "Team member",
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((row) => row.name)

  return (
    <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--foreground)]">
            Announcement acknowledgment
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {acknowledgedUsers.size} of {assignedUsers.size} assigned team members have confirmed they read this announcement.
          </p>
          {orderedNames.length > 0 ? (
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Acknowledged by: {orderedNames.join(", ")}
            </p>
          ) : null}
        </div>

        {canAcknowledge ? (
          hasAcknowledged ? (
            <span role="status" className="wf-status wf-status-success h-9 shrink-0 gap-2 rounded-xl px-3">
              <CheckCircle2 className="size-4" />
              Acknowledged
            </span>
          ) : (
            <form action={acknowledgeServiceAnnouncement}>
              <input type="hidden" name="setlistId" value={setlistId} />
              <button
                type="submit"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--brand-dark)]"
              >
                <CheckCircle2 className="size-4" />
                I’ve read this
              </button>
            </form>
          )
        ) : (
          <span className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 text-xs text-[var(--muted)]">
            <Clock3 className="size-4" />
            For assigned team members
          </span>
        )}
      </div>
    </div>
  )
}

import {
  ArrowLeftRight,
  Check,
  X,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import { Feedback } from "@/components/ui/feedback"
import FormSubmitButton from "@/components/ui/form-submit-button"
import {
  resolveAssignmentSwapRequest,
  respondToAssignmentSwapRequest,
} from "./coordination-actions"

type SwapRequest = {
  id: string
  setlist_id: string
  requester_user_id: string
  substitute_user_id: string
  reason: string | null
  substitute_response_note: string | null
  status: "pending" | "substitute_accepted" | "approved" | "declined" | "cancelled"
  resolution_note: string | null
  created_at: string
  reviewed_at: string | null
}

type Profile = {
  id: string
  display_name: string | null
}

const statusLabels: Record<SwapRequest["status"], string> = {
  pending: "Waiting for substitute",
  substitute_accepted: "Waiting for leader approval",
  approved: "Approved",
  declined: "Declined",
  cancelled: "Cancelled",
}

const errorMessages: Record<string, string> = {
  acknowledgment_failed: "Your acknowledgment could not be saved. Please try again.",
  swap_response_failed: "Your response could not be saved. Please refresh and try again.",
  swap_request_closed: "This swap request has already been answered.",
  swap_resolution_failed: "The request could not be resolved. Please try again.",
  substitute_acceptance_required: "The proposed substitute must accept before a leader can approve the swap.",
  substitute_already_assigned: "That substitute is already assigned to the same position in this service.",
}

export default async function SetlistSwapRequestsPanel({
  setlistId,
  canManage,
  errorKey = "",
  notice = "",
}: {
  setlistId: string
  canManage: boolean
  errorKey?: string
  notice?: string
}) {
  const workspace = await getWorkspace()
  if (!workspace) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("setlist_assignment_swap_requests")
    .select("id, setlist_id, requester_user_id, substitute_user_id, reason, substitute_response_note, status, resolution_note, created_at, reviewed_at")
    .eq("setlist_id", setlistId)
    .eq("organization_id", workspace.organizationId)
    .order("created_at", { ascending: false })
    .limit(40)

  if (error) {
    return (
      <section id="assignment-swaps" className="scroll-mt-6 rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <ArrowLeftRight className="mt-0.5 size-5 text-[var(--muted)]" />
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">Assignment swap requests</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Swap requests are temporarily unavailable. Refresh the page to try again.</p>
          </div>
        </div>
      </section>
    )
  }

  const requests = (data ?? []) as SwapRequest[]
  if (requests.length === 0 && !canManage) return null

  const profileIds = [...new Set(requests.flatMap((request) => [
    request.requester_user_id,
    request.substitute_user_id,
  ]))]
  const profilesById = new Map<string, Profile>()

  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", profileIds)

    for (const profile of profiles ?? []) {
      profilesById.set(profile.id, profile as Profile)
    }
  }

  const displayName = (userId: string) =>
    profilesById.get(userId)?.display_name?.trim() || "Team member"

  return (
    <section id="assignment-swaps" aria-labelledby="assignment-swaps-title" className="scroll-mt-6 rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
          <ArrowLeftRight className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="assignment-swaps-title" className="text-lg font-semibold text-[var(--foreground)]">Assignment swap requests</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Members can ask another eligible teammate to cover their role. The proposed substitute must accept, then a worship leader approves the change.
          </p>
        </div>
        {canManage ? (
          <span className="wf-status wf-status-neutral shrink-0">
            {requests.filter((request) => request.status === "pending" || request.status === "substitute_accepted").length} open
          </span>
        ) : null}
      </div>

      {errorKey && errorMessages[errorKey] ? (
        <Feedback tone="error" title="Swap request update failed">
          {errorMessages[errorKey]}
        </Feedback>
      ) : null}
      {notice === "1" ? (
        <Feedback tone="success" title="Swap request updated">
          The swap request was updated.
        </Feedback>
      ) : null}

      {requests.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[var(--border)] px-5 py-8 text-center">
          <p className="text-sm font-semibold text-[var(--foreground)]">No swap requests</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Requests raised for this service will appear here.</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {requests.map((request) => {
            const isSubstitute = request.substitute_user_id === workspace.userId
            const isRequester = request.requester_user_id === workspace.userId
            const canRespond = isSubstitute && request.status === "pending"
            const canResolve = canManage && (
              request.status === "pending" ||
              request.status === "substitute_accepted"
            )

            return (
              <li key={request.id} className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">
                        {displayName(request.requester_user_id)} → {displayName(request.substitute_user_id)}
                      </h3>
                      <span className={`wf-status ${
                        request.status === "approved"
                          ? "wf-status-success"
                          : request.status === "declined" || request.status === "cancelled"
                            ? "wf-status-danger"
                            : request.status === "substitute_accepted"
                              ? "wf-status-info"
                              : "wf-status-warning"
                      }`}>
                        {statusLabels[request.status]}
                      </span>
                    </div>
                    {request.reason ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
                        {request.reason}
                      </p>
                    ) : null}
                    {request.substitute_response_note ? (
                      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                        Substitute note: {request.substitute_response_note}
                      </p>
                    ) : null}
                    {request.resolution_note ? (
                      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                        Leader note: {request.resolution_note}
                      </p>
                    ) : null}
                    <p className="mt-2 text-[11px] text-[var(--muted)]">
                      Requested {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: workspace.organizationTimezone }).format(new Date(request.created_at))}
                    </p>
                    {isRequester && request.status === "pending" ? (
                      <p className="mt-2 text-xs text-[var(--muted)]">Waiting for the proposed substitute to respond.</p>
                    ) : null}
                  </div>
                </div>

                {canRespond ? (
                  <div className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <form action={respondToAssignmentSwapRequest} className="flex flex-col gap-2 sm:flex-row">
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="decision" value="accept" />
                      <input
                        name="responseNote"
                        maxLength={500}
                        placeholder="Optional note"
                        aria-label="Optional response note"
                        className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--border)] px-3 text-sm outline-none focus:border-[var(--brand)]"
                      />
                      <FormSubmitButton pendingText="Accepting…" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white disabled:opacity-60">
                        <Check className="size-3.5" /> Accept
                      </FormSubmitButton>
                    </form>
                    <form action={respondToAssignmentSwapRequest}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="decision" value="decline" />
                      <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--danger)]/30 px-4 text-xs font-semibold text-[var(--danger)] transition hover:bg-[var(--danger-soft)]">
                        <X className="size-3.5" /> Decline
                      </button>
                    </form>
                  </div>
                ) : null}

                {canResolve ? (
                  <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
                    {request.status === "pending" ? (
                      <p className="text-xs leading-5 text-[var(--muted)]">The proposed substitute has not accepted yet. You can decline this request, but approval is only available after acceptance.</p>
                    ) : (
                      <p className="text-xs leading-5 text-[var(--info)]">The substitute accepted. Approving will move the assignment to them and reset their confirmation to pending.</p>
                    )}
                    <div className="flex flex-col gap-3 sm:flex-row">
                      {request.status === "substitute_accepted" ? (
                        <form action={resolveAssignmentSwapRequest}>
                          <input type="hidden" name="requestId" value={request.id} />
                          <input type="hidden" name="decision" value="approve" />
                          <FormSubmitButton pendingText="Approving…" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white disabled:opacity-60">
                            <Check className="size-3.5" /> Approve swap
                          </FormSubmitButton>
                        </form>
                      ) : null}
                      <form action={resolveAssignmentSwapRequest} className="flex flex-1 flex-col gap-2 sm:flex-row">
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="decision" value="decline" />
                        <input
                          name="resolutionNote"
                          maxLength={500}
                          placeholder="Optional note for the requester"
                          aria-label="Leader resolution note"
                          className="h-10 min-w-0 flex-1 rounded-xl border border-[var(--border)] px-3 text-sm outline-none focus:border-[var(--brand)]"
                        />
                        <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 text-xs font-semibold text-rose-700 transition hover:bg-rose-50">
                          <X className="size-3.5" /> Decline request
                        </button>
                      </form>
                    </div>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

"use server"

import { leaderRoles } from "@/lib/permissions"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import {
  assignmentSwapResolutionSchema,
  assignmentSwapResponseSchema,
} from "@/lib/assignment-swap-validation"

const uuidSchema = z.string().uuid()

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

export async function acknowledgeServiceAnnouncement(formData: FormData) {
  const setlistId = getText(formData, "setlistId")
  if (!uuidSchema.safeParse(setlistId).success) redirect("/setlists")

  const workspace = await getWorkspace()
  if (!workspace) redirect("/onboarding")

  const supabase = await createClient()
  const { error } = await supabase.rpc("acknowledge_service_announcement", {
    p_setlist_id: setlistId,
  })

  if (error) {
    console.error("acknowledge_service_announcement failed:", { code: error.code })
    redirect(`/setlists/${setlistId}?coordinationError=acknowledgment_failed#service-notes`)
  }

  revalidatePath(`/setlists/${setlistId}`)
  revalidatePath("/services")
  redirect(`/setlists/${setlistId}?announcementAck=1#service-notes`)
}

export async function respondToAssignmentSwapRequest(formData: FormData) {
  const parsedInput = assignmentSwapResponseSchema.safeParse({
    requestId: getText(formData, "requestId"),
    decision: getText(formData, "decision"),
    responseNote: getText(formData, "responseNote"),
  })

  if (!parsedInput.success) redirect("/setlists")

  const { requestId, decision, responseNote } = parsedInput.data

  const workspace = await getWorkspace()
  if (!workspace) redirect("/onboarding")

  const supabase = await createClient()
  const { data: request, error: requestError } = await supabase
    .from("setlist_assignment_swap_requests")
    .select("id, setlist_id, substitute_user_id, status")
    .eq("id", requestId)
    .maybeSingle()

  if (requestError || !request || request.substitute_user_id !== workspace.userId) {
    redirect("/notifications?error=swap_request_unavailable")
  }

  const { error } = await supabase.rpc("respond_to_setlist_assignment_swap_request", {
    p_request_id: requestId,
    p_decision: decision,
    p_response_note: responseNote || null,
  })

  if (error) {
    console.error("respond_to_assignment_swap_request failed:", { code: error.code, message: error.message })
    const key = error.message.includes("SWAP_REQUEST_NOT_PENDING")
      ? "swap_request_closed"
      : "swap_response_failed"
    redirect(`/setlists/${request.setlist_id}?coordinationError=${key}#assignment-swaps`)
  }

  revalidatePath("/my-schedule")
  revalidatePath("/notifications")
  revalidatePath(`/setlists/${request.setlist_id}`)
  redirect(`/setlists/${request.setlist_id}?swapResponse=1#assignment-swaps`)
}

export async function resolveAssignmentSwapRequest(formData: FormData) {
  const parsedInput = assignmentSwapResolutionSchema.safeParse({
    requestId: getText(formData, "requestId"),
    decision: getText(formData, "decision"),
    resolutionNote: getText(formData, "resolutionNote"),
  })

  if (!parsedInput.success) redirect("/services")

  const { requestId, decision, resolutionNote } = parsedInput.data

  const workspace = await getWorkspace()
  if (!workspace) redirect("/onboarding")
  if (!leaderRoles.includes(workspace.role)) redirect("/error?code=permission_denied")

  const supabase = await createClient()
  const { data: request, error: requestError } = await supabase
    .from("setlist_assignment_swap_requests")
    .select("id, setlist_id, organization_id")
    .eq("id", requestId)
    .eq("organization_id", workspace.organizationId)
    .maybeSingle()

  if (requestError || !request) redirect("/services?error=swap_request_unavailable")

  const { error } = await supabase.rpc("resolve_setlist_assignment_swap_request", {
    p_request_id: requestId,
    p_decision: decision,
    p_resolution_note: resolutionNote || null,
  })

  if (error) {
    console.error("resolve_assignment_swap_request failed:", { code: error.code, message: error.message })
    let key = "swap_resolution_failed"
    if (error.message.includes("SUBSTITUTE_ACCEPTANCE_REQUIRED")) key = "substitute_acceptance_required"
    else if (error.message.includes("SUBSTITUTE_ALREADY_ASSIGNED")) key = "substitute_already_assigned"
    else if (error.message.includes("SWAP_REQUEST_NOT_OPEN")) key = "swap_request_closed"
    redirect(`/setlists/${request.setlist_id}?coordinationError=${key}#assignment-swaps`)
  }

  revalidatePath("/my-schedule")
  revalidatePath("/services")
  revalidatePath("/notifications")
  revalidatePath(`/setlists/${request.setlist_id}`)
  redirect(`/setlists/${request.setlist_id}?swapResolved=1#assignment-swaps`)
}

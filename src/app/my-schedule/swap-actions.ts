"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"

const uuidSchema = z.string().uuid()

export async function requestAssignmentSwap(formData: FormData) {
  const assignmentId = String(formData.get("assignmentId") ?? "").trim()
  const substituteUserId = String(formData.get("substituteUserId") ?? "").trim()
  const reason = String(formData.get("reason") ?? "").trim()

  if (
    !uuidSchema.safeParse(assignmentId).success ||
    !uuidSchema.safeParse(substituteUserId).success ||
    reason.length > 500
  ) {
    redirect("/my-schedule?swapError=invalid_request")
  }

  const workspace = await getWorkspace()
  if (!workspace) redirect("/onboarding")

  const supabase = await createClient()
  const { data: assignment, error: assignmentError } = await supabase
    .from("setlist_team_assignments")
    .select("id, setlist_id, user_id")
    .eq("id", assignmentId)
    .eq("user_id", workspace.userId)
    .maybeSingle()

  if (assignmentError || !assignment) {
    redirect("/my-schedule?swapError=assignment_unavailable")
  }

  const { error } = await supabase.rpc("create_setlist_assignment_swap_request", {
    p_assignment_id: assignmentId,
    p_substitute_user_id: substituteUserId,
    p_reason: reason || null,
  })

  if (error) {
    console.error("request_assignment_swap failed:", { code: error.code, message: error.message })
    let key = "request_failed"
    if (error.message.includes("SUBSTITUTE_POSITION_REQUIRED")) key = "substitute_not_eligible"
    else if (error.message.includes("SUBSTITUTE_ALREADY_ASSIGNED")) key = "substitute_already_assigned"
    else if (error.message.includes("SWAP_REQUEST_ALREADY_OPEN")) key = "swap_already_open"
    else if (error.message.includes("SERVICE_CLOSED")) key = "service_closed"
    redirect(`/my-schedule?swapError=${key}`)
  }

  revalidatePath("/my-schedule")
  revalidatePath("/notifications")
  revalidatePath(`/setlists/${assignment.setlist_id}`)
  redirect("/my-schedule?swapRequested=1")
}

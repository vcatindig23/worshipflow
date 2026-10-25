"use server"

import { editorRoles } from "@/lib/permissions"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"
import {
  isValidServiceDate,
  isValidServiceTime,
} from "@/lib/service-scheduling"
import { hasAnyRole, uuidSchema } from "@/lib/team-access-validation"


function redirectPreparationError(setlistId: string, error: string): never {
  redirect(`/setlists/${setlistId}/preparation?error=${error}`)
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number)
  return hours * 60 + minutes
}

async function getPreparationContext(setlistId: string) {
  const workspace = await getWorkspace()

  if (!workspace) {
    redirect("/onboarding")
  }

  if (!hasAnyRole(workspace.role, editorRoles)) {
    redirect(`/setlists/${setlistId}/preparation?error=permission_denied`)
  }

  return {
    workspace,
    supabase: await createClient(),
  }
}

function revalidatePreparation(setlistId: string) {
  revalidatePath("/setlists")
  revalidatePath("/services")
  revalidatePath(`/setlists/${setlistId}`)
  revalidatePath(`/setlists/${setlistId}/preparation`)
}

export async function saveRehearsalPlan(formData: FormData) {
  const setlistId = String(formData.get("setlistId") ?? "").trim()
  const rehearsalDate = String(formData.get("rehearsalDate") ?? "").trim()
  const rehearsalTime = String(formData.get("rehearsalTime") ?? "").trim()
  const rehearsalEndTime = String(formData.get("rehearsalEndTime") ?? "").trim()
  const rehearsalLocation = String(formData.get("rehearsalLocation") ?? "").trim()
  const rehearsalNotes = String(formData.get("rehearsalNotes") ?? "").trim()

  if (!uuidSchema.safeParse(setlistId).success) {
    redirect("/setlists")
  }

  if (rehearsalDate && !isValidServiceDate(rehearsalDate)) {
    redirectPreparationError(setlistId, "invalid_rehearsal_date")
  }

  if (rehearsalTime && !isValidServiceTime(rehearsalTime)) {
    redirectPreparationError(setlistId, "invalid_rehearsal_time")
  }

  if (rehearsalEndTime && !isValidServiceTime(rehearsalEndTime)) {
    redirectPreparationError(setlistId, "invalid_rehearsal_end_time")
  }

  if (
    rehearsalEndTime &&
    (!rehearsalTime || timeToMinutes(rehearsalEndTime) <= timeToMinutes(rehearsalTime))
  ) {
    redirectPreparationError(setlistId, "invalid_rehearsal_end_time")
  }

  if (rehearsalLocation.length > 200) {
    redirectPreparationError(setlistId, "rehearsal_location_too_long")
  }

  if (rehearsalNotes.length > 3000) {
    redirectPreparationError(setlistId, "rehearsal_notes_too_long")
  }

  const { workspace, supabase } = await getPreparationContext(setlistId)
  const { error } = await supabase
    .from("setlists")
    .update({
      rehearsal_date: rehearsalDate || null,
      rehearsal_time: rehearsalTime ? `${rehearsalTime}:00` : null,
      rehearsal_end_time: rehearsalEndTime ? `${rehearsalEndTime}:00` : null,
      rehearsal_location: rehearsalLocation || null,
      rehearsal_notes: rehearsalNotes || null,
      updated_by: workspace.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", setlistId)
    .eq("organization_id", workspace.organizationId)

  if (error) {
    console.error("save_rehearsal_plan failed:", { code: error.code })
    redirectPreparationError(setlistId, "rehearsal_save_failed")
  }

  revalidatePreparation(setlistId)
  redirect(`/setlists/${setlistId}/preparation?saved=rehearsal`)
}

export async function createPreparationTask(formData: FormData) {
  const setlistId = String(formData.get("setlistId") ?? "").trim()
  const title = String(formData.get("title") ?? "").trim()
  const details = String(formData.get("details") ?? "").trim()

  if (!uuidSchema.safeParse(setlistId).success) {
    redirect("/setlists")
  }

  if (title.length < 1 || title.length > 160) {
    redirectPreparationError(setlistId, "task_invalid")
  }

  if (details.length > 1000) {
    redirectPreparationError(setlistId, "task_details_too_long")
  }

  const { workspace, supabase } = await getPreparationContext(setlistId)
  const { data: lastTask, error: orderError } = await supabase
    .from("setlist_preparation_tasks")
    .select("position")
    .eq("setlist_id", setlistId)
    .eq("organization_id", workspace.organizationId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (orderError) {
    redirectPreparationError(setlistId, "task_save_failed")
  }

  const { error } = await supabase
    .from("setlist_preparation_tasks")
    .insert({
      organization_id: workspace.organizationId,
      setlist_id: setlistId,
      title,
      details: details || null,
      is_completed: false,
      position: (lastTask?.position ?? -1) + 1,
      created_by: workspace.userId,
    })

  if (error) {
    console.error("create_preparation_task failed:", { code: error.code })
    redirectPreparationError(setlistId, "task_save_failed")
  }

  revalidatePreparation(setlistId)
  redirect(`/setlists/${setlistId}/preparation?saved=task`)
}

export async function togglePreparationTask(formData: FormData) {
  const setlistId = String(formData.get("setlistId") ?? "").trim()
  const taskId = String(formData.get("taskId") ?? "").trim()
  const completedValue = String(formData.get("completed") ?? "").trim()

  if (
    !uuidSchema.safeParse(setlistId).success ||
    !uuidSchema.safeParse(taskId).success ||
    (completedValue !== "true" && completedValue !== "false")
  ) {
    redirect("/setlists")
  }

  const { workspace, supabase } = await getPreparationContext(setlistId)
  const { error } = await supabase
    .from("setlist_preparation_tasks")
    .update({
      is_completed: completedValue === "true",
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("setlist_id", setlistId)
    .eq("organization_id", workspace.organizationId)

  if (error) {
    console.error("toggle_preparation_task failed:", { code: error.code })
    redirectPreparationError(setlistId, "task_update_failed")
  }

  revalidatePreparation(setlistId)
  redirect(`/setlists/${setlistId}/preparation`)
}

export async function deletePreparationTask(formData: FormData) {
  const setlistId = String(formData.get("setlistId") ?? "").trim()
  const taskId = String(formData.get("taskId") ?? "").trim()

  if (
    !uuidSchema.safeParse(setlistId).success ||
    !uuidSchema.safeParse(taskId).success
  ) {
    redirect("/setlists")
  }

  const { workspace, supabase } = await getPreparationContext(setlistId)
  const { error } = await supabase
    .from("setlist_preparation_tasks")
    .delete()
    .eq("id", taskId)
    .eq("setlist_id", setlistId)
    .eq("organization_id", workspace.organizationId)

  if (error) {
    console.error("delete_preparation_task failed:", { code: error.code })
    redirectPreparationError(setlistId, "task_delete_failed")
  }

  revalidatePreparation(setlistId)
  redirect(`/setlists/${setlistId}/preparation`)
}

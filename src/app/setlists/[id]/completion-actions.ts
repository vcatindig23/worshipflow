"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"

const leaderRoles = ["admin", "worship_leader"]

function parseOptionalInteger(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim()
  if (!raw) {
    return null
  }

  const parsed = Number(raw)
  return Number.isInteger(parsed) ? parsed : NaN
}

async function getServiceAccess(setlistId: string) {
  const workspace = await getWorkspace()
  if (!workspace) {
    redirect("/onboarding")
  }

  const supabase = await createClient()
  const { data: setlist, error } = await supabase
    .from("setlists")
    .select("id, organization_id, status, completed_at")
    .eq("id", setlistId)
    .eq("organization_id", workspace.organizationId)
    .maybeSingle()

  if (error || !setlist) {
    redirect("/setlists")
  }

  if (!leaderRoles.includes(workspace.role)) {
    redirect(`/setlists/${setlistId}`)
  }

  return { supabase, workspace, setlist }
}

export async function completeService(formData: FormData) {
  const setlistId = String(formData.get("setlistId") ?? "").trim()
  const attendance = parseOptionalInteger(formData.get("attendanceCount"))
  const actualDuration = parseOptionalInteger(
    formData.get("actualDurationMinutes")
  )
  const notes = String(formData.get("afterServiceNotes") ?? "").trim()

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(setlistId)) {
    redirect("/services")
  }

  if (
    attendance !== null &&
    (!Number.isInteger(attendance) || attendance < 0 || attendance > 1000000)
  ) {
    redirect(`/setlists/${setlistId}/complete?error=invalid_attendance`)
  }

  if (
    actualDuration !== null &&
    (!Number.isInteger(actualDuration) ||
      actualDuration < 1 ||
      actualDuration > 1440)
  ) {
    redirect(`/setlists/${setlistId}/complete?error=invalid_duration`)
  }

  if (notes.length > 3000) {
    redirect(`/setlists/${setlistId}/complete?error=notes_too_long`)
  }

  const { supabase } = await getServiceAccess(setlistId)

  const { error } = await supabase
    .from("setlists")
    .update({
      completed_at: new Date().toISOString(),
      attendance_count: attendance,
      actual_duration_minutes: actualDuration,
      after_service_notes: notes || null,
    })
    .eq("id", setlistId)

  if (error) {
    redirect(`/setlists/${setlistId}/complete?error=completion_failed`)
  }

  revalidatePath(`/setlists/${setlistId}`)
  revalidatePath("/services")
  revalidatePath("/services/history")
  redirect(`/setlists/${setlistId}`)
}

export async function reopenService(formData: FormData) {
  const setlistId = String(formData.get("setlistId") ?? "").trim()

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(setlistId)) {
    redirect("/services")
  }

  const { supabase } = await getServiceAccess(setlistId)

  const { error } = await supabase
    .from("setlists")
    .update({
      completed_at: null,
    })
    .eq("id", setlistId)

  if (error) {
    redirect(`/setlists/${setlistId}?error=completion_failed`)
  }

  revalidatePath(`/setlists/${setlistId}`)
  revalidatePath("/services")
  revalidatePath("/services/history")
  redirect(`/setlists/${setlistId}`)
}

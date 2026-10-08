"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"

const editorRoles = ["admin", "worship_leader", "song_editor"]
const uuidSchema = z.string().uuid()
const typeSchema = z.enum([
  "opening","welcome","song","prayer","offering","announcements",
  "message","communion","closing","transition","other",
])

async function access(setlistId: string) {
  const workspace = await getWorkspace()
  if (!workspace) redirect("/onboarding")
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("setlists")
    .select("id, organization_id")
    .eq("id", setlistId)
    .eq("organization_id", workspace.organizationId)
    .maybeSingle()
  if (error || !data) redirect(`/setlists/${setlistId}?error=setlist_load_failed`)
  return { supabase, workspace, setlist: data }
}

function requireEditor(role: string) {
  if (!editorRoles.includes(role)) redirect("/setlists")
}

function redirectError(id: string, error: string): never {
  redirect(`/setlists/${id}?error=${error}`)
}

export async function addTimelineItem(formData: FormData) {
  const setlistId = String(formData.get("setlistId") ?? "").trim()
  const title = String(formData.get("title") ?? "").trim()
  const itemType = String(formData.get("itemType") ?? "").trim()
  const durationRaw = String(formData.get("durationMinutes") ?? "").trim()
  const notes = String(formData.get("notes") ?? "").trim()
  if (!uuidSchema.safeParse(setlistId).success) redirect("/setlists")
  if (title.length < 1 || title.length > 160) redirectError(setlistId, "timeline_invalid_title")
  if (!typeSchema.safeParse(itemType).success) redirectError(setlistId, "timeline_invalid_type")
  const duration = durationRaw ? Number(durationRaw) : null
  if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 240)) {
    redirectError(setlistId, "timeline_invalid_duration")
  }
  if (notes.length > 1000) redirectError(setlistId, "timeline_notes_too_long")
  const { supabase, workspace } = await access(setlistId)
  requireEditor(workspace.role)
  const { data: last } = await supabase
    .from("setlist_timeline_items")
    .select("position")
    .eq("setlist_id", setlistId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle()
  const { error } = await supabase.from("setlist_timeline_items").insert({
    organization_id: workspace.organizationId,
    setlist_id: setlistId,
    position: (last?.position ?? -1) + 1,
    item_type: itemType,
    title,
    duration_minutes: duration,
    notes: notes || null,
    created_by: workspace.userId,
  })
  if (error) redirectError(setlistId, "timeline_add_failed")
  revalidatePath(`/setlists/${setlistId}`)
  redirect(`/setlists/${setlistId}`)
}

export async function removeTimelineItem(formData: FormData) {
  const setlistId = String(formData.get("setlistId") ?? "").trim()
  const itemId = String(formData.get("itemId") ?? "").trim()
  if (!uuidSchema.safeParse(setlistId).success || !uuidSchema.safeParse(itemId).success) redirect("/setlists")
  const { supabase, workspace } = await access(setlistId)
  requireEditor(workspace.role)
  const { error } = await supabase
    .from("setlist_timeline_items")
    .delete()
    .eq("id", itemId)
    .eq("setlist_id", setlistId)
    .eq("organization_id", workspace.organizationId)
  if (error) redirectError(setlistId, "timeline_remove_failed")
  revalidatePath(`/setlists/${setlistId}`)
  redirect(`/setlists/${setlistId}`)
}

export async function moveTimelineItem(formData: FormData) {
  const setlistId = String(formData.get("setlistId") ?? "").trim()
  const itemId = String(formData.get("itemId") ?? "").trim()
  const direction = String(formData.get("direction") ?? "").trim()
  if (!uuidSchema.safeParse(setlistId).success || !uuidSchema.safeParse(itemId).success) redirect("/setlists")
  if (direction !== "up" && direction !== "down") redirectError(setlistId, "timeline_invalid_direction")
  const { supabase, workspace } = await access(setlistId)
  requireEditor(workspace.role)
  const { data: items, error: loadError } = await supabase
    .from("setlist_timeline_items")
    .select("id, position")
    .eq("setlist_id", setlistId)
    .eq("organization_id", workspace.organizationId)
    .order("position", { ascending: true })
  if (loadError) redirectError(setlistId, "timeline_move_failed")
  const index = (items ?? []).findIndex((item) => item.id === itemId)
  const target = index + (direction === "up" ? -1 : 1)
  if (index < 0 || target < 0 || target >= (items ?? []).length) {
    redirect(`/setlists/${setlistId}`)
  }
  const current = (items ?? [])[index]
  const neighbor = (items ?? [])[target]
  const first = await supabase.from("setlist_timeline_items").update({ position: 1000000 }).eq("id", current.id).eq("setlist_id", setlistId)
  if (first.error) redirectError(setlistId, "timeline_move_failed")
  const second = await supabase.from("setlist_timeline_items").update({ position: current.position }).eq("id", neighbor.id).eq("setlist_id", setlistId)
  if (second.error) redirectError(setlistId, "timeline_move_failed")
  const third = await supabase.from("setlist_timeline_items").update({ position: neighbor.position }).eq("id", current.id).eq("setlist_id", setlistId)
  if (third.error) redirectError(setlistId, "timeline_move_failed")
  revalidatePath(`/setlists/${setlistId}`)
  redirect(`/setlists/${setlistId}`)
}

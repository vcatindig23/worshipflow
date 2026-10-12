"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"

const editorRoles = ["admin", "worship_leader", "song_editor"]
const pathSchema = z.string().min(3).max(500)
const nameSchema = z.string().trim().min(1).max(120)

async function getServiceResourceAccess(setlistId: string) {
  const workspace = await getWorkspace()

  if (!workspace) {
    redirect("/onboarding")
  }

  const supabase = await createClient()

  const { data: setlist, error: setlistError } = await supabase
    .from("setlists")
    .select("id, organization_id")
    .eq("id", setlistId)
    .eq("organization_id", workspace.organizationId)
    .maybeSingle()

  if (setlistError || !setlist) {
    redirect(`/setlists/${setlistId}?error=setlist_load_failed`)
  }

  return { supabase, workspace, setlist }
}

export async function addServiceResource(formData: FormData) {
  const setlistId = String(formData.get("setlistId") ?? "").trim()
  const parsedPath = pathSchema.safeParse(formData.get("storagePath"))
  const parsedName = nameSchema.safeParse(formData.get("displayName"))

  if (!z.string().uuid().safeParse(setlistId).success) {
    redirect("/setlists")
  }

  if (!parsedPath.success || !parsedName.success) {
    redirect(`/setlists/${setlistId}?error=invalid_resource`)
  }

  const { supabase, workspace } = await getServiceResourceAccess(setlistId)

  if (!editorRoles.includes(workspace.role)) {
    redirect(`/setlists/${setlistId}?error=resource_permission_denied`)
  }

  const storagePath = parsedPath.data
  const expectedPrefix = `${workspace.organizationId}/`

  if (
    !storagePath.startsWith(expectedPrefix) ||
    storagePath.split("/").length !== 2
  ) {
    redirect(`/setlists/${setlistId}?error=invalid_resource`)
  }

  const fileName = storagePath.slice(expectedPrefix.length)
  const { data: files, error: listError } = await supabase.storage
    .from("workspace-files")
    .list(workspace.organizationId, { limit: 1000 })

  if (listError || !(files ?? []).some((file) => file.name === fileName)) {
    redirect(`/setlists/${setlistId}?error=resource_file_not_found`)
  }

  const { error } = await supabase.from("setlist_resources").insert({
    organization_id: workspace.organizationId,
    setlist_id: setlistId,
    storage_path: storagePath,
    display_name: parsedName.data,
    created_by: workspace.userId,
  })

  if (error) {
    const message = error.message.toLowerCase()
    redirect(
      `/setlists/${setlistId}?error=${
        message.includes("duplicate") || message.includes("unique")
          ? "resource_already_added"
          : "resource_add_failed"
      }`
    )
  }

  revalidatePath(`/setlists/${setlistId}`)
  redirect(`/setlists/${setlistId}`)
}


export async function uploadAndAddServiceResource(formData: FormData) {
  const setlistId = String(formData.get("setlistId") ?? "").trim()
  const file = formData.get("referenceFile")
  const requestedName = String(formData.get("displayName") ?? "").trim()

  if (!z.string().uuid().safeParse(setlistId).success) redirect("/setlists")
  if (!(file instanceof File) || file.size === 0 || file.size > 25 * 1024 * 1024) {
    redirect("/setlists/" + setlistId + "?error=reference_file_invalid")
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  const allowedExtensions = new Set(["pdf", "doc", "docx", "ppt", "pptx", "jpg", "jpeg", "png", "webp", "mp3", "m4a", "wav"])
  const allowedTypes = new Set([
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/jpeg", "image/png", "image/webp", "audio/mpeg", "audio/mp4", "audio/wav",
  ])
  if (!allowedExtensions.has(extension) || !allowedTypes.has(file.type)) {
    redirect("/setlists/" + setlistId + "?error=reference_file_type")
  }

  const { supabase, workspace } = await getServiceResourceAccess(setlistId)
  if (!editorRoles.includes(workspace.role)) {
    redirect("/setlists/" + setlistId + "?error=resource_permission_denied")
  }

  const displayName = (requestedName || file.name).trim()
  if (displayName.length < 1 || displayName.length > 120) {
    redirect("/setlists/" + setlistId + "?error=invalid_resource")
  }

  const safeName = file.name.normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^[_\.]+|[_\.]+$/g, "")
    .slice(-120) || "reference-file"
  const storagePath = workspace.organizationId + "/" + crypto.randomUUID() + "-" + safeName
  const { error: uploadError } = await supabase.storage.from("workspace-files")
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error("upload_setlist_reference_file failed:", uploadError.message)
    redirect("/setlists/" + setlistId + "?error=reference_upload_failed")
  }

  const { error: insertError } = await supabase.from("setlist_resources").insert({
    organization_id: workspace.organizationId,
    setlist_id: setlistId,
    storage_path: storagePath,
    display_name: displayName,
    created_by: workspace.userId,
  })

  if (insertError) {
    await supabase.storage.from("workspace-files").remove([storagePath])
    console.error("link_setlist_reference_file failed:", insertError.message)
    redirect("/setlists/" + setlistId + "?error=resource_add_failed")
  }

  revalidatePath("/files")
  revalidatePath("/setlists/" + setlistId)
  redirect("/setlists/" + setlistId + "#service-resources")
}

export async function removeServiceResource(formData: FormData) {
  const setlistId = String(formData.get("setlistId") ?? "").trim()
  const resourceId = String(formData.get("resourceId") ?? "").trim()

  if (
    !z.string().uuid().safeParse(setlistId).success ||
    !z.string().uuid().safeParse(resourceId).success
  ) {
    redirect("/setlists")
  }

  const { supabase, workspace } = await getServiceResourceAccess(setlistId)

  if (!editorRoles.includes(workspace.role)) {
    redirect(`/setlists/${setlistId}?error=resource_permission_denied`)
  }

  const { error } = await supabase
    .from("setlist_resources")
    .delete()
    .eq("id", resourceId)
    .eq("setlist_id", setlistId)
    .eq("organization_id", workspace.organizationId)

  if (error) {
    redirect(`/setlists/${setlistId}?error=resource_remove_failed`)
  }

  revalidatePath(`/setlists/${setlistId}`)
  redirect(`/setlists/${setlistId}`)
}

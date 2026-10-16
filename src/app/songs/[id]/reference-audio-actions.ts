"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getWorkspace } from "@/lib/workspace/get-workspace"

const songIdSchema = z.string().uuid()
const storagePathSchema = z.string().trim().min(3).max(500)
const editorRoles = new Set(["admin", "worship_leader", "song_editor"])
const allowedAudioExtensions = new Set(["mp3", "m4a", "wav"])
const allowedAudioMimeTypes = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/vnd.wave",
])

export type SongAudioActionResult =
  | { ok: true }
  | { ok: false; error: "invalid_request" | "permission_denied" | "song_not_found" | "invalid_audio_file" | "save_failed" }

async function validateSongAudioAccess(songId: string) {
  const workspace = await getWorkspace()
  if (!editorRoles.has(workspace.role)) {
    return { error: "permission_denied" as const }
  }

  const supabase = await createClient()
  const { data: song, error } = await supabase
    .from("songs")
    .select("id, organization_id")
    .eq("id", songId)
    .eq("organization_id", workspace.organizationId)
    .maybeSingle()

  if (error || !song) {
    return { error: "song_not_found" as const }
  }

  return { workspace, supabase, song }
}

export async function setSongReferenceAudio(
  formData: FormData
): Promise<SongAudioActionResult> {
  const parsedSongId = songIdSchema.safeParse(formData.get("songId"))
  const parsedPath = storagePathSchema.safeParse(formData.get("storagePath"))

  if (!parsedSongId.success || !parsedPath.success) {
    return { ok: false, error: "invalid_request" }
  }

  const access = await validateSongAudioAccess(parsedSongId.data)
  if ("error" in access) {
    return { ok: false, error: access.error ?? "save_failed" }
  }

  const { workspace, supabase, song } = access
  const storagePath = parsedPath.data
  const expectedPrefix = workspace.organizationId + "/"
  const segments = storagePath.split("/")
  const fileName = segments.at(-1) ?? ""
  const extension = fileName.split(".").pop()?.toLowerCase() ?? ""

  if (
    !storagePath.startsWith(expectedPrefix) ||
    segments.length !== 2 ||
    !allowedAudioExtensions.has(extension)
  ) {
    return { ok: false, error: "invalid_audio_file" }
  }

  const { data: files, error: listError } = await supabase.storage
    .from("workspace-files")
    .list(workspace.organizationId, { limit: 1000, search: fileName })

  const file = (files ?? []).find((item) => item.name === fileName && item.id !== null)
  const mimeType = file?.metadata?.mimetype?.toLowerCase()

  if (
    listError ||
    !file ||
    (mimeType && !allowedAudioMimeTypes.has(mimeType))
  ) {
    return { ok: false, error: "invalid_audio_file" }
  }

  const { data: updatedSong, error: updateError } = await supabase
    .from("songs")
    .update({ reference_audio_path: storagePath })
    .eq("id", song.id)
    .eq("organization_id", workspace.organizationId)
    .select("id")
    .maybeSingle()

  if (updateError || !updatedSong) {
    return { ok: false, error: "save_failed" }
  }

  revalidatePath("/songs")
  revalidatePath("/songs/" + song.id)
  return { ok: true }
}

export async function removeSongReferenceAudio(
  formData: FormData
): Promise<SongAudioActionResult> {
  const parsedSongId = songIdSchema.safeParse(formData.get("songId"))
  if (!parsedSongId.success) {
    return { ok: false, error: "invalid_request" }
  }

  const access = await validateSongAudioAccess(parsedSongId.data)
  if ("error" in access) {
    return { ok: false, error: access.error }
  }

  const { workspace, supabase, song } = access
  const { data: updatedSong, error } = await supabase
    .from("songs")
    .update({ reference_audio_path: null })
    .eq("id", song.id)
    .eq("organization_id", workspace.organizationId)
    .select("id")
    .maybeSingle()

  if (error || !updatedSong) {
    return { ok: false, error: "save_failed" }
  }

  revalidatePath("/songs")
  revalidatePath("/songs/" + song.id)
  return { ok: true }
}

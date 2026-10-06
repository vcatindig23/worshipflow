"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const uuidSchema = z.string().uuid()

const editorRoles = [
  "admin",
  "worship_leader",
  "song_editor",
] as const

const leaderRoles = [
  "admin",
  "worship_leader",
] as const

const setlistStatusSchema = z.enum([
  "draft",
  "published",
  "archived",
])

const teamPositionSchema = z.enum([
  "worship_leader",
  "singer",
  "lead_guitarist",
  "rhythm_guitarist",
  "acoustic_guitarist",
  "electric_guitarist",
  "bassist",
  "keyboardist",
  "pianist",
  "drummer",
  "percussionist",
  "violinist",
  "cellist",
  "sound_engineer",
  "audio_visual",
  "choir_member",
  "other",
])

function parseOptionalInteger(
  value: FormDataEntryValue | null
) {
  if (value === null || String(value).trim() === "") {
    return null
  }

  const parsed = Number(String(value))

  return Number.isInteger(parsed) ? parsed : NaN
}

async function getMembership() {
  const supabase = await createClient()

  const { data: claimsData } =
    await supabase.auth.getClaims()

  const userId = claimsData?.claims?.sub

  if (!userId) {
    redirect("/login")
  }

  const { data: membership, error } =
    await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", userId)
      .maybeSingle()

  if (error || !membership) {
    redirect("/onboarding")
  }

  return {
    supabase,
    userId,
    organizationId: membership.organization_id,
    role: membership.role,
  }
}

function requireRole(
  role: string,
  allowedRoles: readonly string[]
) {
  if (!allowedRoles.includes(role)) {
    redirect("/error?code=permission_denied")
  }
}

export async function createSetlist(
  formData: FormData
) {
  const name = String(
    formData.get("name") ?? ""
  ).trim()

  const description = String(
    formData.get("description") ?? ""
  ).trim()

  const serviceDateValue = String(
    formData.get("serviceDate") ?? ""
  ).trim()

  const parsedName = z
    .string()
    .trim()
    .min(1)
    .max(200)
    .safeParse(name)

  if (!parsedName.success) {
    redirect("/setlists/new?error=invalid_name")
  }

  if (
    serviceDateValue &&
    !z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .safeParse(serviceDateValue).success
  ) {
    redirect("/setlists/new?error=invalid_date")
  }

  if (description.length > 2000) {
    redirect("/setlists/new?error=description_too_long")
  }

  const {
    supabase,
    userId,
    organizationId,
    role,
  } = await getMembership()

  requireRole(role, editorRoles)

  const { data, error } = await supabase
    .from("setlists")
    .insert({
      organization_id: organizationId,
      name: parsedName.data,
      description: description || null,
      service_date:
        serviceDateValue || null,
      status: "draft",
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single()

  if (error || !data) {
    redirect("/setlists/new?error=create_failed")
  }

  revalidatePath("/setlists")
  redirect(`/setlists/${data.id}`)
}

export async function updateSetlist(
  formData: FormData
) {
  const setlistId = String(
    formData.get("setlistId") ?? ""
  ).trim()

  const name = String(
    formData.get("name") ?? ""
  ).trim()

  const description = String(
    formData.get("description") ?? ""
  ).trim()

  const serviceDateValue = String(
    formData.get("serviceDate") ?? ""
  ).trim()

  if (!uuidSchema.safeParse(setlistId).success) {
    redirect("/setlists")
  }

  const parsedName = z
    .string()
    .trim()
    .min(1)
    .max(200)
    .safeParse(name)

  if (!parsedName.success) {
    redirect(
      `/setlists/${setlistId}/edit?error=invalid_name`
    )
  }

  if (
    serviceDateValue &&
    !z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .safeParse(serviceDateValue).success
  ) {
    redirect(
      `/setlists/${setlistId}/edit?error=invalid_date`
    )
  }

  if (description.length > 2000) {
    redirect(
      `/setlists/${setlistId}/edit?error=description_too_long`
    )
  }

  const {
    supabase,
    userId,
    organizationId,
    role,
  } = await getMembership()

  requireRole(role, editorRoles)

  const { error } = await supabase
    .from("setlists")
    .update({
      name: parsedName.data,
      description: description || null,
      service_date:
        serviceDateValue || null,
      updated_by: userId,
    })
    .eq("id", setlistId)
    .eq("organization_id", organizationId)

  if (error) {
    redirect(
      `/setlists/${setlistId}/edit?error=update_failed`
    )
  }

  revalidatePath("/setlists")
  revalidatePath(`/setlists/${setlistId}`)
  revalidatePath(`/setlists/${setlistId}/edit`)

  redirect(`/setlists/${setlistId}`)
}

export async function setSetlistStatus(
  formData: FormData
) {
  const setlistId = String(
    formData.get("setlistId") ?? ""
  ).trim()

  const status = String(
    formData.get("status") ?? ""
  ).trim()

  if (!uuidSchema.safeParse(setlistId).success) {
    redirect("/setlists")
  }

  const parsedStatus =
    setlistStatusSchema.safeParse(status)

  if (!parsedStatus.success) {
    redirect(
      `/setlists/${setlistId}?error=invalid_status`
    )
  }

  const {
    supabase,
    userId,
    organizationId,
    role,
  } = await getMembership()

  requireRole(role, leaderRoles)

  const { error } = await supabase
    .from("setlists")
    .update({
      status: parsedStatus.data,
      updated_by: userId,
    })
    .eq("id", setlistId)
    .eq("organization_id", organizationId)

  if (error) {
    redirect(
      `/setlists/${setlistId}?error=status_update_failed`
    )
  }

  revalidatePath("/setlists")
  revalidatePath(`/setlists/${setlistId}`)

  redirect(`/setlists/${setlistId}`)
}

export async function addSongToSetlist(
  formData: FormData
) {
  const setlistId = String(
    formData.get("setlistId") ?? ""
  ).trim()

  const songId = String(
    formData.get("songId") ?? ""
  ).trim()

  const section = String(
    formData.get("section") ?? ""
  ).trim()

  const keyOverride = String(
    formData.get("keyOverride") ?? ""
  ).trim()

  const capoValue = parseOptionalInteger(
    formData.get("capoOverride")
  )

  const tempoValue = parseOptionalInteger(
    formData.get("tempoOverride")
  )

  const notes = String(
    formData.get("notes") ?? ""
  ).trim()

  if (
    !uuidSchema.safeParse(setlistId).success ||
    !uuidSchema.safeParse(songId).success
  ) {
    redirect("/setlists")
  }

  if (section.length > 80) {
    redirect(
      `/setlists/${setlistId}?error=invalid_section`
    )
  }

  if (
    Number.isNaN(capoValue) ||
    (capoValue !== null &&
      (capoValue < 0 || capoValue > 12))
  ) {
    redirect(
      `/setlists/${setlistId}?error=invalid_capo`
    )
  }

  if (
    Number.isNaN(tempoValue) ||
    (tempoValue !== null &&
      (tempoValue < 20 || tempoValue > 300))
  ) {
    redirect(
      `/setlists/${setlistId}?error=invalid_tempo`
    )
  }

  if (notes.length > 2000) {
    redirect(
      `/setlists/${setlistId}?error=notes_too_long`
    )
  }

  const {
    supabase,
    role,
  } = await getMembership()

  requireRole(role, editorRoles)

  const { error } = await supabase.rpc(
    "add_song_to_setlist",
    {
      p_setlist_id: setlistId,
      p_song_id: songId,
      p_section:
        section || "Worship",
      p_key_override:
        keyOverride || null,
      p_capo_override: capoValue,
      p_tempo_override: tempoValue,
      p_notes: notes || null,
    }
  )

  if (error) {
    if (
      error.message.includes(
        "SONG_ALREADY_IN_SETLIST"
      )
    ) {
      redirect(
        `/setlists/${setlistId}?error=song_already_added`
      )
    }

    redirect(
      `/setlists/${setlistId}?error=song_add_failed`
    )
  }

  revalidatePath(`/setlists/${setlistId}`)
  revalidatePath("/setlists")

  redirect(`/setlists/${setlistId}`)
}

export async function updateSetlistSong(
  formData: FormData
) {
  const setlistSongId = String(
    formData.get("setlistSongId") ?? ""
  ).trim()

  const setlistId = String(
    formData.get("setlistId") ?? ""
  ).trim()

  const section = String(
    formData.get("section") ?? ""
  ).trim()

  const keyOverride = String(
    formData.get("keyOverride") ?? ""
  ).trim()

  const capoValue = parseOptionalInteger(
    formData.get("capoOverride")
  )

  const tempoValue = parseOptionalInteger(
    formData.get("tempoOverride")
  )

  const notes = String(
    formData.get("notes") ?? ""
  ).trim()

  if (
    !uuidSchema.safeParse(setlistSongId).success ||
    !uuidSchema.safeParse(setlistId).success
  ) {
    redirect("/setlists")
  }

  if (section.length > 80) {
    redirect(
      `/setlists/${setlistId}?error=invalid_section`
    )
  }

  if (
    Number.isNaN(capoValue) ||
    (capoValue !== null &&
      (capoValue < 0 || capoValue > 12))
  ) {
    redirect(
      `/setlists/${setlistId}?error=invalid_capo`
    )
  }

  if (
    Number.isNaN(tempoValue) ||
    (tempoValue !== null &&
      (tempoValue < 20 || tempoValue > 300))
  ) {
    redirect(
      `/setlists/${setlistId}?error=invalid_tempo`
    )
  }

  if (notes.length > 2000) {
    redirect(
      `/setlists/${setlistId}?error=notes_too_long`
    )
  }

  const {
    supabase,
    role,
  } = await getMembership()

  requireRole(role, editorRoles)

  const { error } = await supabase.rpc(
    "update_setlist_song",
    {
      p_setlist_song_id: setlistSongId,
      p_section:
        section || "Worship",
      p_key_override:
        keyOverride || null,
      p_capo_override: capoValue,
      p_tempo_override: tempoValue,
      p_notes: notes || null,
    }
  )

  if (error) {
    redirect(
      `/setlists/${setlistId}?error=song_update_failed`
    )
  }

  revalidatePath(`/setlists/${setlistId}`)

  redirect(`/setlists/${setlistId}`)
}

export async function moveSetlistSong(
  formData: FormData
) {
  const setlistSongId = String(
    formData.get("setlistSongId") ?? ""
  ).trim()

  const setlistId = String(
    formData.get("setlistId") ?? ""
  ).trim()

  const direction = String(
    formData.get("direction") ?? ""
  ).trim()

  if (
    !uuidSchema.safeParse(setlistSongId).success ||
    !uuidSchema.safeParse(setlistId).success
  ) {
    redirect("/setlists")
  }

  if (
    direction !== "up" &&
    direction !== "down"
  ) {
    redirect(
      `/setlists/${setlistId}?error=invalid_direction`
    )
  }

  const {
    supabase,
    role,
  } = await getMembership()

  requireRole(role, editorRoles)

  const { error } = await supabase.rpc(
    "move_setlist_song",
    {
      p_setlist_song_id: setlistSongId,
      p_direction: direction,
    }
  )

  if (error) {
    redirect(
      `/setlists/${setlistId}?error=song_move_failed`
    )
  }

  revalidatePath(`/setlists/${setlistId}`)

  redirect(`/setlists/${setlistId}`)
}

export async function removeSongFromSetlist(
  formData: FormData
) {
  const setlistSongId = String(
    formData.get("setlistSongId") ?? ""
  ).trim()

  const setlistId = String(
    formData.get("setlistId") ?? ""
  ).trim()

  if (
    !uuidSchema.safeParse(setlistSongId).success ||
    !uuidSchema.safeParse(setlistId).success
  ) {
    redirect("/setlists")
  }

  const {
    supabase,
    role,
  } = await getMembership()

  requireRole(role, editorRoles)

  const { error } = await supabase.rpc(
    "remove_song_from_setlist",
    {
      p_setlist_song_id: setlistSongId,
    }
  )

  if (error) {
    redirect(
      `/setlists/${setlistId}?error=song_remove_failed`
    )
  }

  revalidatePath(`/setlists/${setlistId}`)
  revalidatePath("/setlists")

  redirect(`/setlists/${setlistId}`)
}

export async function deleteSetlist(
  formData: FormData
) {
  const setlistId = String(
    formData.get("setlistId") ?? ""
  ).trim()

  if (!uuidSchema.safeParse(setlistId).success) {
    redirect("/setlists")
  }

  const {
    supabase,
    organizationId,
    role,
  } = await getMembership()

  requireRole(role, leaderRoles)

  const { error } = await supabase
    .from("setlists")
    .delete()
    .eq("id", setlistId)
    .eq("organization_id", organizationId)

  if (error) {
    redirect(
      `/setlists/${setlistId}?error=delete_failed`
    )
  }

  revalidatePath("/setlists")
  redirect("/setlists")
}

export async function addSetlistTeamAssignment(
  formData: FormData
) {
  const setlistId = String(
    formData.get("setlistId") ?? ""
  ).trim()
  const assignmentKey = String(
    formData.get("assignmentKey") ?? ""
  ).trim()
  const [userId, teamPosition] = assignmentKey.split("|")

  if (
    !uuidSchema.safeParse(setlistId).success ||
    !uuidSchema.safeParse(userId).success ||
    !teamPosition ||
    !teamPositionSchema.safeParse(teamPosition).success
  ) {
    redirect(`/setlists/${setlistId}?error=invalid_team_assignment`)
  }

  const { supabase, role } = await getMembership()
  requireRole(role, editorRoles)

  const { error } = await supabase.rpc(
    "add_setlist_team_assignment",
    {
      p_setlist_id: setlistId,
      p_user_id: userId,
      p_team_position: teamPosition,
    }
  )

  if (error) {
    console.error("add_setlist_team_assignment failed:", {
      code: error.code,
      message: error.message,
      details: error.details,
    })

    if (
      error.code === "PGRST202" ||
      error.code === "42883" ||
      error.code === "42P01"
    ) {
      redirect(
        `/setlists/${setlistId}?error=team_assignment_migration_missing`
      )
    }

    if (error.message.includes("TEAM_MEMBER_NOT_IN_ORGANIZATION")) {
      redirect(
        `/setlists/${setlistId}?error=team_member_not_found`
      )
    }

    if (error.message.includes("TEAM_POSITION_NOT_ASSIGNED_TO_MEMBER")) {
      redirect(
        `/setlists/${setlistId}?error=team_position_not_assigned`
      )
    }

    if (error.code === "23505") {
      redirect(
        `/setlists/${setlistId}?error=team_assignment_exists`
      )
    }

    redirect(`/setlists/${setlistId}?error=team_assignment_failed`)
  }

  revalidatePath(`/setlists/${setlistId}`)
  revalidatePath("/services")
  redirect(`/setlists/${setlistId}`)
}

export async function removeSetlistTeamAssignment(
  formData: FormData
) {
  const setlistId = String(
    formData.get("setlistId") ?? ""
  ).trim()
  const assignmentId = String(
    formData.get("assignmentId") ?? ""
  ).trim()

  if (
    !uuidSchema.safeParse(setlistId).success ||
    !uuidSchema.safeParse(assignmentId).success
  ) {
    redirect("/setlists")
  }

  const { supabase, role } = await getMembership()
  requireRole(role, editorRoles)

  const { error } = await supabase.rpc(
    "remove_setlist_team_assignment",
    {
      p_assignment_id: assignmentId,
      p_setlist_id: setlistId,
    }
  )

  if (error) {
    console.error("remove_setlist_team_assignment failed:", {
      code: error.code,
      message: error.message,
      details: error.details,
    })
    if (
      error.code === "PGRST202" ||
      error.code === "42883" ||
      error.code === "42P01"
    ) {
      redirect(
        `/setlists/${setlistId}?error=team_assignment_migration_missing`
      )
    }
    redirect(`/setlists/${setlistId}?error=team_assignment_failed`)
  }

  revalidatePath(`/setlists/${setlistId}`)
  revalidatePath("/services")
  redirect(`/setlists/${setlistId}`)
}
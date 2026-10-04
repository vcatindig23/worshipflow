"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const songIdSchema = z.object({
  songId: z.string().uuid(),
})

const statusSchema = z.object({
  songId: z.string().uuid(),
  status: z.enum(["active", "archived"]),
})

export async function toggleFavorite(formData: FormData) {
  const result = songIdSchema.safeParse({
    songId: formData.get("songId"),
  })

  if (!result.success) {
    redirect("/songs?error=invalid_song")
  }

  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    redirect("/login")
  }

  const { error } = await supabase.rpc("toggle_song_favorite", {
    p_song_id: result.data.songId,
  })

  if (error) {
    redirect("/songs?error=favorite_failed")
  }

  revalidatePath("/songs")
  revalidatePath(`/songs/${result.data.songId}`)

  const redirectTo = String(formData.get("redirectTo") || "/songs")

  if (!redirectTo.startsWith("/")) {
    redirect("/songs")
  }

  redirect(redirectTo)
}

export async function recordSongOpen(songId: string) {
  const result = songIdSchema.safeParse({ songId })

  if (!result.success) {
    return
  }

  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()

  if (!claimsData?.claims?.sub) {
    return
  }

  await supabase.rpc("record_song_open", {
    p_song_id: result.data.songId,
  })
}

export async function setSongStatus(formData: FormData) {
  const result = statusSchema.safeParse({
    songId: formData.get("songId"),
    status: formData.get("status"),
  })

  if (!result.success) {
    redirect("/songs?error=invalid_status")
  }

  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    redirect("/login")
  }

  const { data: membership, error: membershipError } =
    await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle()

  if (membershipError) {
    redirect("/songs?error=membership_failed")
  }

  if (!membership) {
    redirect("/onboarding")
  }

  const allowedRoles = new Set([
    "admin",
    "worship_leader",
    "song_editor",
  ])

  if (!allowedRoles.has(membership.role)) {
    redirect("/songs?error=not_authorized")
  }

  const { error } = await supabase
    .from("songs")
    .update({
      status: result.data.status,
      updated_by: userId,
    })
    .eq("id", result.data.songId)
    .eq("organization_id", membership.organization_id)

  if (error) {
    redirect("/songs?error=status_update_failed")
  }

  revalidatePath("/songs")
  revalidatePath(`/songs/${result.data.songId}`)

  redirect("/songs")
}

export async function setSongTags(formData: FormData) {
  const songIdResult = songIdSchema.safeParse({
    songId: formData.get("songId"),
  })

  if (!songIdResult.success) {
    redirect("/songs?error=invalid_song")
  }

  const tagText = String(formData.get("tags") || "")

  const tags = Array.from(
    new Set(
      tagText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  ).slice(0, 20)

  const invalidTag = tags.find(
    (tag) => tag.length > 50
  )

  if (invalidTag) {
    redirect(`/songs/${songIdResult.data.songId}?error=tag_too_long`)
  }

  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    redirect("/login")
  }

  const { error } = await supabase.rpc("set_song_tags", {
    p_song_id: songIdResult.data.songId,
    p_tag_names: tags,
  })

  if (error) {
    redirect(`/songs/${songIdResult.data.songId}?error=tags_failed`)
  }

  revalidatePath("/songs")
  revalidatePath(`/songs/${songIdResult.data.songId}`)

  redirect(`/songs/${songIdResult.data.songId}?tags_saved=true`)
}
"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import {
  getProfileAvatarExtension,
  MAX_PROFILE_AVATAR_SIZE,
} from "@/features/profile/profile-avatar"
import { createClient } from "@/lib/supabase/server"

const displayNameSchema = z.string().trim().min(2).max(120)
const bioSchema = z.string().trim().max(500)
const locationSchema = z.string().trim().max(120)
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
const uuidSchema = z.string().uuid()
const avatarBucket = "profile-avatars"

function isOwnAvatarPath(
  path: string | null,
  userId: string
): path is string {
  return typeof path === "string" && path.startsWith(`${userId}/`)
}

export async function updateProfile(formData: FormData) {
  const parsedName = displayNameSchema.safeParse(formData.get("displayName"))
  const parsedBio = bioSchema.safeParse(String(formData.get("bio") ?? ""))
  const parsedLocation = locationSchema.safeParse(String(formData.get("location") ?? ""))
  const websiteInput = String(formData.get("website") ?? "").trim()
  const organizationId = String(formData.get("organizationId") ?? "").trim()
  const submittedPositions = formData
    .getAll("teamPositions")
    .map((value) => String(value).trim())
  const uniquePositions = Array.from(new Set(submittedPositions))
  const parsedPositions = z.array(teamPositionSchema).max(10).safeParse(uniquePositions)
  const removeAvatar = formData.get("removeAvatar") === "on"
  const avatarValue = formData.get("avatar")

  if (!parsedName.success) {
    redirect("/settings/profile?error=invalid_name")
  }
  if (!parsedBio.success) {
    redirect("/settings/profile?error=invalid_bio")
  }
  if (!parsedLocation.success) {
    redirect("/settings/profile?error=invalid_location")
  }
  if (websiteInput.length > 250) {
    redirect("/settings/profile?error=invalid_website")
  }
  let websiteValue: string | null = null
  if (websiteInput) {
    try {
      const normalizedWebsite = /^https?:\/\//i.test(websiteInput)
        ? websiteInput
        : `https://${websiteInput}`
      const parsedWebsite = new URL(normalizedWebsite)
      if (
        !["http:", "https:"].includes(parsedWebsite.protocol) ||
        !parsedWebsite.hostname.includes(".")
      ) {
        redirect("/settings/profile?error=invalid_website")
      }
      websiteValue = parsedWebsite.toString().replace(/\/$/, "")
    } catch {
      redirect("/settings/profile?error=invalid_website")
    }
  }
  if (!parsedPositions.success) {
    redirect("/settings/profile?error=invalid_team_positions")
  }
  if (organizationId && !uuidSchema.safeParse(organizationId).success) {
    redirect("/settings/profile?error=invalid_team_positions")
  }

  if (avatarValue !== null && !(avatarValue instanceof File)) {
    redirect("/settings/profile?error=invalid_avatar")
  }

  const avatarFile =
    avatarValue instanceof File && avatarValue.size > 0 ? avatarValue : null

  if (
    avatarFile &&
    (avatarFile.size > MAX_PROFILE_AVATAR_SIZE ||
      !["image/jpeg", "image/png", "image/webp"].includes(avatarFile.type))
  ) {
    redirect("/settings/profile?error=invalid_avatar")
  }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    redirect("/login")
  }

  const { data: currentProfile, error: profileLoadError } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .maybeSingle()

  if (profileLoadError || !currentProfile) {
    console.error("Failed to load profile before update:", {
      code: profileLoadError?.code,
      message: profileLoadError?.message,
    })
    redirect("/settings/profile?error=save_failed")
  }

  let uploadedPath: string | null = null
  let nextAvatarPath = currentProfile.avatar_url

  if (avatarFile) {
    const bytes = new Uint8Array(await avatarFile.arrayBuffer())
    const extension = getProfileAvatarExtension(avatarFile.type, bytes)

    if (!extension) {
      redirect("/settings/profile?error=invalid_avatar")
    }

    uploadedPath = `${userId}/${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await supabase.storage
      .from(avatarBucket)
      .upload(uploadedPath, avatarFile, {
        contentType: avatarFile.type,
        cacheControl: "3600",
        upsert: false,
      })

    if (uploadError) {
      console.error("Failed to upload profile avatar:", {
        message: uploadError.message,
        statusCode: uploadError.statusCode,
      })
      redirect("/settings/profile?error=avatar_upload_failed")
    }

    nextAvatarPath = uploadedPath
  } else if (removeAvatar) {
    nextAvatarPath = null
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: parsedName.data,
      avatar_url: nextAvatarPath,
      bio: parsedBio.data || null,
      location: parsedLocation.data || null,
      website: websiteValue,
    })
    .eq("id", userId)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    if (uploadedPath) {
      const { error: cleanupError } = await supabase.storage
        .from(avatarBucket)
        .remove([uploadedPath])
      if (cleanupError) {
        console.error("Failed to clean up an unreferenced profile avatar:", {
          message: cleanupError.message,
        })
      }
    }

    console.error("Failed to update profile:", {
      code: error?.code,
      message: error?.message,
      details: error?.details,
    })
    redirect("/settings/profile?error=save_failed")
  }

  let cleanupWarning = false
  if (
    currentProfile.avatar_url !== nextAvatarPath &&
    isOwnAvatarPath(currentProfile.avatar_url, userId)
  ) {
    const { error: cleanupError } = await supabase.storage
      .from(avatarBucket)
      .remove([currentProfile.avatar_url])

    if (cleanupError) {
      cleanupWarning = true
      console.error("Failed to remove the previous profile avatar:", {
        message: cleanupError.message,
      })
    }
  }

  if (organizationId) {
    const { error: positionsError } = await supabase.rpc(
      "update_own_team_positions",
      {
        p_organization_id: organizationId,
        p_team_positions: parsedPositions.data,
      }
    )

    if (positionsError) {
      console.error("Failed to update own worship positions:", {
        code: positionsError.code,
        message: positionsError.message,
      })
      redirect("/settings/profile?error=team_positions_failed")
    }
  }

  revalidatePath("/")
  revalidatePath("/profile")
  revalidatePath("/settings")
  revalidatePath("/settings/profile")
  revalidatePath("/settings/team")
  revalidatePath("/settings/team")
  revalidatePath("/setlists")
  revalidatePath("/services")

  redirect(
    cleanupWarning
      ? "/settings/profile?saved=true&warning=avatar_cleanup_failed"
      : "/settings/profile?saved=true"
  )
}

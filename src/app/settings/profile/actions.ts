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
const avatarBucket = "profile-avatars"

function isOwnAvatarPath(
  path: string | null,
  userId: string
): path is string {
  return typeof path === "string" && path.startsWith(`${userId}/`)
}

export async function updateProfile(formData: FormData) {
  const parsedName = displayNameSchema.safeParse(formData.get("displayName"))
  const removeAvatar = formData.get("removeAvatar") === "on"
  const avatarValue = formData.get("avatar")

  if (!parsedName.success) {
    redirect("/settings/profile?error=invalid_name")
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

  revalidatePath("/")
  revalidatePath("/settings")
  revalidatePath("/settings/profile")
  revalidatePath("/settings/team")
  revalidatePath("/setlists")
  revalidatePath("/services")

  redirect(
    cleanupWarning
      ? "/settings/profile?saved=true&warning=avatar_cleanup_failed"
      : "/settings/profile?saved=true"
  )
}

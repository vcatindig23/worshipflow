"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  avatarUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === "" || isHttpsUrl(value)),
})

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:"
  } catch (error) {
    if (error instanceof TypeError) {
      return false
    }

    throw error
  }
}

export async function updateProfile(formData: FormData) {
  const parsedProfile = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    avatarUrl: formData.get("avatarUrl"),
  })

  if (!parsedProfile.success) {
    const avatarIsInvalid = parsedProfile.error.issues.some(
      (issue) => issue.path[0] === "avatarUrl"
    )
    redirect(
      `/settings/profile?error=${avatarIsInvalid ? "invalid_avatar" : "invalid_name"}`
    )
  }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    redirect("/login")
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: parsedProfile.data.displayName,
      avatar_url: parsedProfile.data.avatarUrl || null,
    })
    .eq("id", userId)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    console.error("Failed to update profile:", {
      code: error?.code,
      message: error?.message,
      details: error?.details,
    })
    redirect("/settings/profile?error=save_failed")
  }

  revalidatePath("/")
  revalidatePath("/settings")
  revalidatePath("/settings/profile")
  revalidatePath("/settings/team")
  revalidatePath("/setlists")
  revalidatePath("/services")

  redirect("/settings/profile?saved=true")
}

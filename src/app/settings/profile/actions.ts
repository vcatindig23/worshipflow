"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const displayNameSchema = z.string().trim().min(2).max(120)

export async function updateProfileDisplayName(formData: FormData) {
  const parsedName = displayNameSchema.safeParse(
    formData.get("displayName")
  )

  if (!parsedName.success) {
    redirect("/settings/profile?error=invalid_name")
  }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    redirect("/login")
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: parsedName.data })
    .eq("id", userId)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    console.error("Failed to update profile display name:", {
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

"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const editorRoles = [
  "admin",
  "worship_leader",
  "song_editor",
]

const pathSchema = z.string().min(1).max(500)

async function getMembership() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    redirect("/login")
  }

  const { data: membership, error } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error("Unable to verify file library access.")
  }

  if (!membership) {
    redirect("/onboarding")
  }

  return { supabase, ...membership }
}

export async function deleteWorkspaceFile(formData: FormData) {
  const parsedPath = pathSchema.safeParse(
    formData.get("path")
  )

  if (!parsedPath.success) {
    redirect("/files?error=invalid_file")
  }

  const { supabase, organization_id, role } =
    await getMembership()

  if (!editorRoles.includes(role)) {
    redirect("/error?code=permission_denied")
  }

  const objectPath = parsedPath.data

  if (
    !objectPath.startsWith(`${organization_id}/`) ||
    objectPath.split("/").length !== 2
  ) {
    redirect("/files?error=invalid_file")
  }

  const { error } = await supabase.storage
    .from("workspace-files")
    .remove([objectPath])

  if (error) {
    redirect("/files?error=delete_failed")
  }

  revalidatePath("/files")
  redirect("/files")
}

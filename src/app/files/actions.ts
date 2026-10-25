"use server"

import { requireWorkspaceAuthorization } from "@/lib/authorization"

import { editorRoles } from "@/lib/permissions"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"


const pathSchema = z.string().min(1).max(500)

async function getMembership() {
  const context = await requireWorkspaceAuthorization("files:manage")
  return { supabase: context.supabase, organization_id: context.organizationId, role: context.role }
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

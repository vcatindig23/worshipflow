"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const passwordSchema = z
  .object({
    password: z.string().min(8).max(72),
    confirmPassword: z.string().min(8).max(72),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
  })

export async function updatePassword(formData: FormData) {
  const parsedPassword = passwordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!parsedPassword.success) {
    const mismatch = parsedPassword.error.issues.some(
      (issue) => issue.path[0] === "confirmPassword"
    )
    redirect(
      `/reset-password?error=${mismatch ? "password_mismatch" : "invalid_password"}`
    )
  }

  const supabase = await createClient()
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (claimsError || !userId) {
    redirect("/reset-password?error=expired")
  }

  const { error } = await supabase.auth.updateUser({
    password: parsedPassword.data.password,
  })

  if (error) {
    console.error("Failed to update password:", {
      message: error.message,
      status: error.status,
    })
    redirect("/reset-password?error=update_failed")
  }

  redirect("/reset-password?saved=true")
}

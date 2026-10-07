"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const emailSchema = z.string().trim().toLowerCase().email().max(320)

export async function requestPasswordReset(formData: FormData) {
  const parsedEmail = emailSchema.safeParse(formData.get("email"))

  if (!parsedEmail.success) {
    redirect("/forgot-password?error=invalid_email")
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) {
    console.error("Password reset is missing NEXT_PUBLIC_SITE_URL.")
    redirect("/forgot-password?error=configuration")
  }

  let redirectTo: string
  try {
    const callbackUrl = new URL("/auth/callback", siteUrl)
    callbackUrl.searchParams.set("next", "/reset-password")
    redirectTo = callbackUrl.toString()
  } catch (error) {
    if (error instanceof TypeError) {
      console.error("Password reset has an invalid NEXT_PUBLIC_SITE_URL.")
      redirect("/forgot-password?error=configuration")
    }

    throw error
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsedEmail.data,
    { redirectTo }
  )

  if (error) {
    console.error("Failed to request a password reset:", {
      message: error.message,
      status: error.status,
    })
    redirect("/forgot-password?error=send_failed")
  }

  redirect("/forgot-password?sent=true")
}

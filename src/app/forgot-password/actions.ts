"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { allowAuthAttempt } from "@/lib/auth-rate-limit"
import { getAuthSiteUrl } from "@/lib/auth-security"

const emailSchema = z.string().trim().toLowerCase().email().max(320)

export async function requestPasswordReset(formData: FormData) {
  const parsedEmail = emailSchema.safeParse(formData.get("email"))

  if (!parsedEmail.success) {
    redirect("/forgot-password?error=invalid_email")
  }

  if (!(await allowAuthAttempt("recovery", parsedEmail.data))) redirect("/forgot-password?error=rate_limited")
  let siteUrl: string
  try { siteUrl = getAuthSiteUrl() } catch { redirect("/forgot-password?error=configuration") }

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
  await supabase.auth.resetPasswordForEmail(
    parsedEmail.data,
    { redirectTo }
  )

  redirect("/forgot-password?sent=true")
}

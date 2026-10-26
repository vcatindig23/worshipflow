"use server"

import type { EmailOtpType } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isEmailConfirmation } from "@/lib/email-confirmation"
import { getSafeAuthNextPath } from "@/lib/auth-redirect"
import { grantRecoverySession } from "@/lib/auth-recovery"
import { allowAuthAttempt } from "@/lib/auth-rate-limit"

export async function confirmEmail(formData: FormData) {
  const tokenHash = formData.get("token_hash")
  const type = formData.get("type")
  if (!isEmailConfirmation(tokenHash, type)) redirect("/error?code=confirmation_failed")
  if (!(await allowAuthAttempt("mfa", tokenHash))) redirect("/error?code=confirmation_failed")
  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType })
  if (error) redirect("/error?code=confirmation_failed")
  if (type === "recovery") {
    if (!(await grantRecoverySession(supabase))) redirect("/forgot-password")
    redirect("/reset-password")
  }
  redirect(getSafeAuthNextPath(String(formData.get("next") ?? "/")))
}

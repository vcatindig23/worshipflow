"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { hasRecoverySession } from "@/lib/auth-recovery"
import { allowAuthAttempt } from "@/lib/auth-rate-limit"
import { RECOVERY_COOKIE } from "@/lib/auth-security"
import { cookies } from "next/headers"

const passwordSchema = z
  .object({
    password: z.string().min(12).max(72).refine(value => Buffer.byteLength(value, "utf8") <= 72),
    confirmPassword: z.string().min(12).max(72),
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

  if (claimsError || !userId || !(await hasRecoverySession(supabase))) {
    redirect("/reset-password?error=expired")
  }

  const { data: state, error: stateError } = await supabase.rpc("get_account_session_state")
  if (stateError || !state?.active) redirect("/reset-password?error=expired")
  if (state.mfaRequired) redirect("/auth/mfa?next=/reset-password")
  if (!(await allowAuthAttempt("sensitive", userId))) redirect("/reset-password?error=rate_limited")

  const { error } = await supabase.auth.updateUser({
    password: parsedPassword.data.password,
  })

  if (error) {
    redirect("/reset-password?error=update_failed")
  }
  ;(await cookies()).delete(RECOVERY_COOKIE)
  const { error: revokeError } = await supabase.auth.signOut({ scope: "global" })
  if (revokeError) redirect("/reset-password?error=signout_failed")
  redirect("/reset-password?saved=true")
}

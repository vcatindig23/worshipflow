"use server"

import { redirect } from "next/navigation"
import { requireAccountSession } from "@/lib/account-session"
import { allowAuthAttempt } from "@/lib/auth-rate-limit"
import { getSafeAuthNextPath } from "@/lib/auth-redirect"

export async function verifyMfa(formData: FormData) {
  const { supabase, user } = await requireAccountSession(true)
  const next = getSafeAuthNextPath(String(formData.get("next") ?? "/"))
  const fail = (error: string): never => redirect(`/auth/mfa?error=${error}&next=${encodeURIComponent(next)}`)
  if (!(await allowAuthAttempt("mfa", user.id))) fail("rate_limited")
  const code = String(formData.get("code") ?? "").trim()
  if (!/^\d{6}$/.test(code)) fail("invalid_code")
  const { data, error: listError } = await supabase.auth.mfa.listFactors()
  const factor = data?.totp[0]
  if (listError || !factor) return fail("unavailable")
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code })
  if (error) fail("invalid_code")
  redirect(next)
}

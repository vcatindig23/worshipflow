"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { allowAuthAttempt } from "@/lib/auth-rate-limit"
import { getAuthSiteUrl } from "@/lib/auth-security"
import { supportsVerifiedSignup } from "@/lib/auth-provider"

const signupSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().toLowerCase().email().max(320),
    password: z.string().min(12).max(72).refine(value => Buffer.byteLength(value, "utf8") <= 72),
    confirmPassword: z.string().min(12).max(72),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  })

export async function signup(formData: FormData) {
  const result = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!result.success) {
    redirect("/signup?error=invalid_details")
  }

  if (!(await allowAuthAttempt("signup", result.data.email))) redirect("/signup?error=rate_limited")
  if (!(await supportsVerifiedSignup())) redirect("/signup?error=configuration_error")
  const supabase = await createClient()
  let siteUrl: string
  try { siteUrl = getAuthSiteUrl() } catch { redirect("/signup?error=configuration_error") }

  const { data, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/`,
      data: {
        full_name: result.data.fullName,
      },
    },
  })

  if (data.session) {
    await supabase.auth.signOut({ scope: "local" })
  }
  // Existing and new accounts receive the same response. Provider email
  // confirmation must remain enabled; no unverified session enters the workspace.
  void error
  redirect("/check-email")
}

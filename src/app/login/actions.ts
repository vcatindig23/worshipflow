"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(320),
  password: z
    .string()
    .min(1)
    .max(200),
})

export type LoginState = {
  error: string
}

export async function login(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return {
      error:
        "Enter a valid email address and password.",
    }
  }

  const supabase = await createClient()

  const { error } =
    await supabase.auth.signInWithPassword({
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
    })

  if (error) {
    return {
      error:
        "The email or password is incorrect. Check your details and try again.",
    }
  }

  const { data: claimsData } =
    await supabase.auth.getClaims()

  const userId =
    claimsData?.claims?.sub

  if (!userId) {
    await supabase.auth.signOut()

    return {
      error:
        "Your account could not be verified. Please try signing in again.",
    }
  }

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    return {
      error:
        "Your church membership could not be loaded. Please try again.",
    }
  }

  if (!membership) {
    redirect("/onboarding")
  }

  redirect("/")
}
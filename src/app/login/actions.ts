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

export type OAuthSignInState = {
  error: string
}

const oauthProviderSchema = z.enum(["google", "facebook"])

export async function startOAuthSignIn(
  _previousState: OAuthSignInState,
  formData: FormData
): Promise<OAuthSignInState> {
  const parsedProvider = oauthProviderSchema.safeParse(formData.get("provider"))

  if (!parsedProvider.success) {
    return { error: "Choose Google or Facebook to continue." }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (!siteUrl) {
    return {
      error:
        "Social sign-in is not configured yet. Please continue with email instead.",
    }
  }

  let redirectTo: string

  try {
    const callbackUrl = new URL("/auth/callback", siteUrl)
    callbackUrl.searchParams.set("next", "/")
    redirectTo = callbackUrl.toString()
  } catch {
    return {
      error:
        "Social sign-in is temporarily unavailable. Please continue with email instead.",
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: parsedProvider.data,
    options: { redirectTo },
  })

  if (error || !data.url) {
    const providerLabel =
      parsedProvider.data === "google" ? "Google" : "Facebook"

    if (
      error?.message.toLowerCase().includes("provider is not enabled") ||
      error?.message.toLowerCase().includes("unsupported provider")
    ) {
      return {
        error: `${providerLabel} sign-in isn't enabled in the authentication settings yet. Please use email for now or ask your administrator to enable it.`,
      }
    }

    console.error("Failed to start social sign-in:", {
      provider: parsedProvider.data,
      message: error?.message ?? "OAuth URL was not returned.",
    })

    return {
      error: `${providerLabel} sign-in couldn't start. Please try again or continue with email.`,
    }
  }

  redirect(data.url)
}

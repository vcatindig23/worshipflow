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

async function isOAuthProviderEnabled(
  provider: z.infer<typeof oauthProviderSchema>
): Promise<boolean | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!supabaseUrl || !publishableKey) {
    return null
  }

  try {
    const settingsUrl = new URL("/auth/v1/settings", supabaseUrl)
    const response = await fetch(settingsUrl, {
      headers: { apikey: publishableKey },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      return null
    }

    const settings: unknown = await response.json()
    if (!settings || typeof settings !== "object") {
      return null
    }

    const external = (settings as { external?: unknown }).external
    if (!external || typeof external !== "object") {
      return null
    }

    const enabled = (external as Record<string, unknown>)[provider]
    return typeof enabled === "boolean" ? enabled : null
  } catch {
    return null
  }
}

export async function startOAuthSignIn(
  _previousState: OAuthSignInState,
  formData: FormData
): Promise<OAuthSignInState> {
  const parsedProvider = oauthProviderSchema.safeParse(formData.get("provider"))

  if (!parsedProvider.success) {
    return { error: "Choose Google or Facebook to continue." }
  }

  const providerEnabled = await isOAuthProviderEnabled(parsedProvider.data)
  if (providerEnabled === false) {
    const providerLabel =
      parsedProvider.data === "google" ? "Google" : "Facebook"
    return {
      error: `${providerLabel} sign-in is not enabled in Supabase Auth yet. Ask your administrator to enable the provider and add its OAuth credentials. You can still continue with email.`,
    }
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "")

  if (!siteUrl) {
    return {
      error:
        "Social sign-in is not configured yet. Please continue with email instead.",
    }
  }

  let redirectTo: string

  try {
    const configuredUrl = new URL(siteUrl)
    if (
      configuredUrl.protocol !== "https:" &&
      !(configuredUrl.protocol === "http:" && configuredUrl.hostname === "localhost")
    ) {
      throw new Error("The site URL must use HTTPS.")
    }

    const callbackUrl = new URL("/auth/callback", configuredUrl.origin)
    callbackUrl.searchParams.set("next", "/")
    callbackUrl.searchParams.set("auth_flow", "social")
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
    options: {
      redirectTo,
      scopes:
        parsedProvider.data === "facebook"
          ? "email,public_profile"
          : "openid email profile",
      ...(parsedProvider.data === "google"
        ? { queryParams: { prompt: "select_account" } }
        : {}),
    },
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

import { getPublicEnv } from "@/lib/supabase/env"

/** Refuse new app signups if hosted Auth would skip email verification. */
export async function supportsVerifiedSignup() {
  try {
    const env = getPublicEnv()
    const response = await fetch(new URL("/auth/v1/settings", env.NEXT_PUBLIC_SUPABASE_URL), {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
      cache: "no-store", signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return false
    const settings = await response.json()
    return settings.mailer_autoconfirm === false && settings.disable_signup === false && settings.external?.email === true
  } catch { return false }
}
